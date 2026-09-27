#!/usr/bin/env python3
"""Loopback Responses proxy for the Codex Auto / Jev catalog entry."""
import argparse
import contextlib
import copy
import hmac
import json
import os
from pathlib import Path
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from jev import Jev, credentials, opener
from effort import POLICY_HEADER, choose_execution, execution_options, resolve_policy, validate_config
from policy import context, digest, event_for, identity, opaque_state

ROOT = Path(__file__).resolve().parent
HOP = {'host', 'content-length', 'connection', 'transfer-encoding', 'accept-encoding',
       'authorization', 'api-key', 'proxy-authorization', 'proxy-connection', 'upgrade',
       'keep-alive', 'te', 'trailer', POLICY_HEADER}


class Store:
    def __init__(self, folder):
        self.folder = Path(folder)
        self.folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.db = self.folder/'state.sqlite3'
        with self.connect() as c:
            c.execute('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, value TEXT NOT NULL)')
        os.chmod(self.db, 0o600)
        self.guard = threading.Lock()
        self.locks = {}

    def connect(self):
        return sqlite3.connect(self.db, timeout=30)

    def get(self, key):
        with self.connect() as c:
            row = c.execute('SELECT value FROM sessions WHERE id=?', (key,)).fetchone()
        return json.loads(row[0]) if row else None

    def put(self, key, value):
        with self.connect() as c:
            c.execute('INSERT OR REPLACE INTO sessions VALUES (?,?)', (key, json.dumps(value)))

    @contextlib.contextmanager
    def session(self, key):
        with self.guard:
            lock = self.locks.setdefault(key, threading.Lock())
        with lock:
            yield

    def log(self, record):
        # Deliberately exclude request text, raw headers, responses and credentials.
        line = json.dumps(dict(time=time.time(), **record), ensure_ascii=False)+'\n'
        with self.guard:
            fd = os.open(self.folder/'events.jsonl', os.O_WRONLY|os.O_CREAT|os.O_APPEND, 0o600)
            with os.fdopen(fd, 'w') as f:
                f.write(line)


class Router:
    def __init__(self, config, store, judge):
        self.config, self.store, self.judge = config, store, judge

    def prepare(self, body, headers, compact=False):
        # Manual models pass through exactly, including effort and prompt_cache_key.
        if body.get('model') != self.config['alias']:
            target = self.config['models'].get(body.get('model'), {})
            if target.get('enabled') is False:
                raise ValueError(body['model']+': '+target.get('unavailable_reason','model unavailable'))
            # Remember a concrete model so selecting Auto later does not route an
            # existing opaque history to a different default model.
            try:
                key, turn, window = identity(headers)
            except ValueError:
                key = None
            if key:
                state = self.store.get(key) or {'requests': 0, 'created_at': time.time()}
                if state.get('model') != body['model']:
                    state.update(switched_at=time.time())
                    state.pop('cost_evidence', None)
                if state.get('reasoning_effort') != body.get('reasoning', {}).get('effort'):
                    state.pop('cost_evidence', None)
                state.update(model=body['model'], turn_id=turn, context_window_id=window,
                             provisional=False, binding_source='manual',
                             reasoning_effort=body.get('reasoning', {}).get('effort'),
                             effort_policy='fixed', effort_source='manual_passthrough',
                             effort_switched_at=time.time(),
                             updated_at=time.time())
                self.store.put(key, state)
            return None, body, {'model': body.get('model'), 'reason': 'manual_passthrough',
                                'reasoning_effort': body.get('reasoning', {}).get('effort'),
                                'effort_policy': 'fixed', 'effort_source': 'manual_passthrough'}
        key, turn, window = identity(headers)
        mode, policy_source = resolve_policy(self.config, headers)
        reasoning = body.get('reasoning', {})
        if not isinstance(reasoning, dict):
            raise ValueError('reasoning must be an object')
        incoming_effort = reasoning.get('effort')
        if incoming_effort is not None and not isinstance(incoming_effort, str):
            raise ValueError('reasoning.effort must be a string')
        previous = self.store.get(key)
        if not previous and opaque_state(body):
            raise ValueError('Unknown model for existing opaque history: use Auto / Jev in a new chat, or first send a turn with the original concrete model through this router')
        if previous and previous.get('model') not in self.config['models']:
            raise ValueError('Saved model no longer eligible; start a new chat or restore policy')
        if previous and self.config['models'][previous['model']].get('enabled') is False:
            raise ValueError('Bound model is unavailable; select a concrete available model or start a new chat')
        latest, history = context(body)
        event = event_for(latest)
        if not previous:
            event = 'initial'
        same_turn = previous and previous.get('turn_id') == turn
        judgment, error = None, None
        effort = incoming_effort if mode == 'fixed' else None
        excluded_models = {}
        for name, spec in self.config['models'].items():
            if spec.get('enabled') is False:
                excluded_models[name] = spec.get('unavailable_reason','model_unavailable')
            elif effort and effort not in spec['efforts']:
                excluded_models[name] = 'reasoning_effort_unsupported'
            elif mode == 'auto' and not set(spec['efforts']).intersection(self.config['auto_efforts']):
                excluded_models[name] = 'no_automatic_effort_supported'
        eligible_models = [k for k in self.config['models'] if k not in excluded_models]
        pairs = execution_options(self.config, eligible_models) if mode == 'auto' else None
        # Unknown/inaccessible state cannot safely be transferred to another model.
        eligible = (not compact and not same_turn and not opaque_state(body)
                    and (event != 'continue' or not previous))
        # A user request repeated in the following turn is not silently suppressed:
        # cooldown controls repeated evaluations, same-turn key controls tool calls.
        if eligible and previous and time.time()-previous.get('evaluated_at', 0) < self.config['evaluation_cooldown_seconds']:
            eligible = False
            error = 'evaluation_cooldown'
        if eligible:
            try:
                judgment = self.judge.evaluate({'messages': history, 'latest_request': latest, 'event': event,
                    'current_model': previous.get('model') if previous else None,
                    'current_effort': previous.get('reasoning_effort') if previous else None,
                    'effort_policy': mode, 'requested_effort': incoming_effort,
                    'eligible_models': eligible_models,
                    'model_prices': {k:v.get('prices') for k,v in self.config['models'].items() if k in eligible_models}})
                if judgment['model'] not in eligible_models and judgment['model'] != 'uncertain':
                    raise ValueError('Judge selected an ineligible model')
                if mode == 'auto' and judgment['model'] != 'uncertain':
                    if {'model': judgment['model'], 'effort': judgment.get('reasoning_effort')} not in pairs.values():
                        raise ValueError('Judge selected an ineligible execution combination')
            except Exception as exc:
                # Never log exception text: it can contain response body or credentials.
                error = type(exc).__name__
                judgment = None
        decision = choose_execution(self.config, previous, turn, 'continue' if compact else event,
                                    judgment, body, mode)
        if error:
            decision['judge_error'] = error
        model = decision['model']
        effort = decision['reasoning_effort']
        if effort and effort not in self.config['models'][model]['efforts']:
            # Do not silently change an explicit user reasoning setting.
            model = previous['model'] if previous else self.config['default_model']
            if effort not in self.config['models'][model]['efforts']:
                raise ValueError('Reasoning effort incompatible with Auto / Jev model pool')
            decision.update(model=model, switch=False, reason='effort_compatibility_keep')
        state = copy.deepcopy(previous) if previous else {'created_at': time.time(), 'requests': 0}
        if model != state.get('model'):
            state['switched_at'] = time.time()
            state.pop('cost_evidence', None)
        if effort != state.get('reasoning_effort'):
            state['effort_switched_at'] = time.time()
            state.pop('cost_evidence', None)
        state.update(model=model, turn_id=turn, context_window_id=window, updated_at=time.time())
        state.update(reasoning_effort=effort, effort_policy=mode,
                     effort_source=decision['effort_source'])
        if 'provisional' in decision:
            state['provisional'] = decision['provisional']
            state['binding_source'] = decision.get('selection_source')
        state['requests'] += 1
        if eligible:
            state['evaluated_at'] = time.time()
        # Save before forwarding: an ambiguous timeout must not cause another Jev
        # request or a different selected execution model on the client's retry.
        self.store.put(key, state)
        forwarded = copy.deepcopy(body)
        forwarded['model'] = model
        if mode == 'auto' and effort is not None:
            forwarded.setdefault('reasoning', {})['effort'] = effort
        decision.update(effort_policy=mode, effort_policy_source=policy_source,
                        requested_effort=incoming_effort)
        decision.update(session=key[:16], turn=digest(turn)[:16], jev_called=eligible)
        decision['policy_version'] = self.config['policy_version']
        decision['provisional'] = state.get('provisional', False)
        decision['eligible_models'] = eligible_models
        decision['excluded_models'] = excluded_models
        if judgment:
            decision['judgment'] = judgment
        self.store.log({'kind': 'route', **decision})
        return key, forwarded, decision

    def observed(self, key, model, response, status, seconds):
        usage = response.get('usage') if isinstance(response, dict) else None
        record = {'kind': 'upstream', 'session': key[:16] if key else None,
                  'model': model, 'http_status': status, 'seconds': seconds}
        if isinstance(response, dict):
            record['response_status'] = response.get('status')
            record['response_id'] = response.get('id')
            record['response_model'] = response.get('model')
        if isinstance(usage, dict):
            # Missing fields stay absent; no inferred zero cache writes or fees.
            record['usage'] = {k:v for k,v in usage.items() if k in
                ('input_tokens','output_tokens','total_tokens','input_tokens_details','output_tokens_details')}
            if key:
                state = self.store.get(key)
                if state:
                    state['last_usage'] = record['usage']
                    state['last_usage_at'] = time.time()
                    # Usage is not enough to forecast the exact reusable prefix or
                    # future output. Do not manufacture cost_evidence from it.
                    self.store.put(key, state)
        self.store.log(record)


class SSEObserver:
    """Observe completed usage without buffering a whole stream or changing bytes."""
    def __init__(self):
        self.buffer = b''
        self.response = {}

    def feed(self, data):
        self.buffer += data
        while b'\n' in self.buffer:
            line, self.buffer = self.buffer.split(b'\n', 1)
            if line.startswith(b'data:'):
                try:
                    event = json.loads(line[5:].strip())
                    if event.get('type') in ('response.completed', 'response.incomplete', 'response.failed'):
                        self.response = event.get('response', {})
                except (ValueError, TypeError, AttributeError):
                    pass
        # Malformed / unbounded individual SSE records must not exhaust RAM.
        if len(self.buffer) > 8_000_000:
            self.buffer = b''


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *args):
        pass

    def reply(self, code, value):
        data = json.dumps(value).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(data)
        self.close_connection = True

    def do_GET(self):
        if self.path == '/health':
            self.reply(200, {'service': 'auto-jev', 'version': 1, 'live': self.server.live,
                            'policy_version': self.server.config['policy_version'],
                            'fallback_models': self.server.config['fallback_models'],
                            'effort_policy': self.server.config.get('effort_policy', 'fixed'),
                            'auto_efforts': self.server.config['auto_efforts'],
                            'fallback_efforts': self.server.config['fallback_efforts'],
                            'registered_models': list(self.server.config['models']),
                            'unavailable_models': [k for k,v in self.server.config['models'].items() if v.get('enabled') is False],
                            'jev_key_present': bool(self.server.keys.get('TYPESAFE_API_KEY')),
                            'upstream_key_present': bool(self.server.keys.get('AZURE_OPENAI_API_KEY'))})
        elif self.path.startswith('/v1/'):
            self.passthrough()
        else:
            self.reply(404, {'error': 'Unknown route'})

    def passthrough(self):
        """Preserve non-Responses Azure clients that read the same provider URL.

        Fixed upstream origin, byte-for-byte body, no routing, no interpretation
        of images/audio/multipart. This gateway never independently initiates one.
        """
        key = self.server.keys.get('AZURE_OPENAI_API_KEY')
        if not key or not hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+key):
            self.reply(401, {'error': {'message': 'Local router authentication failed'}})
            return
        if not self.server.live:
            self.reply(503, {'error': {'message': 'Live forwarding is disabled'}})
            return
        path = urllib.parse.urlsplit(self.path)
        if not path.path.startswith('/v1/') or '..' in urllib.parse.unquote(path.path).split('/'):
            self.reply(404, {'error': {'message': 'Unknown route'}})
            return
        try:
            if self.headers.get('Transfer-Encoding'):
                raise ValueError()
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 <= length <= 64_000_000:
                raise ValueError()
            data = self.rfile.read(length) if self.command != 'GET' else None
            headers = {k:v for k,v in self.headers.items() if k.lower() not in HOP}
            headers.update({'Authorization':'Bearer '+key, 'Accept-Encoding':'identity'})
            url = self.server.config['upstream_base_url'].rstrip('/')+self.path[len('/v1'):]
            req = urllib.request.Request(url,data=data,headers=headers,method=self.command)
            try:
                response = self.server.opener.open(req,timeout=self.server.config['upstream_timeout_seconds'])
            except urllib.error.HTTPError as exc:
                response = exc
            with response:
                self.send_response(response.status)
                for k,v in response.headers.items():
                    if k.lower() not in HOP:self.send_header(k,v)
                self.send_header('Connection','close');self.end_headers();self.headers_started=True
                while True:
                    chunk=response.read1(65536)
                    if not chunk:break
                    self.wfile.write(chunk);self.wfile.flush()
        except ValueError:
            self.reply(400, {'error': {'message': 'Invalid passthrough request'}})
        except Exception as exc:
            self.server.store.log({'kind':'passthrough_error','error_type':type(exc).__name__})
            if not getattr(self,'headers_started',False):self.reply(502,{'error':{'message':'Upstream failed; not retried'}})
        self.close_connection=True

    def do_POST(self):
        started = time.monotonic()
        supplied = self.headers.get('Authorization', '')
        expected = 'Bearer '+self.server.keys.get('AZURE_OPENAI_API_KEY', '')
        if not self.server.keys.get('AZURE_OPENAI_API_KEY') or not hmac.compare_digest(supplied, expected):
            self.reply(401, {'error': {'message': 'Local router authentication failed'}})
            return
        path = urllib.parse.urlsplit(self.path)
        if path.path not in ('/v1/responses', '/v1/responses/compact'):
            self.passthrough()
            return
        if path.query:
            self.reply(400, {'error': {'message': 'Responses query overrides are not configured'}})
            return
        if not self.server.live:
            self.reply(503, {'error': {'message': 'Live forwarding is disabled'}})
            return
        try:
            if self.headers.get('Transfer-Encoding'):
                raise ValueError('Chunked request bodies are unsupported')
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 64_000_000:
                raise ValueError('Invalid request size')
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict) or not isinstance(body.get('model'), str):
                raise ValueError('Request must include model')
            try:
                key = identity(self.headers)[0]
            except ValueError:
                if body['model'] == self.server.config['alias']:
                    raise
                key = None
            guard = self.server.store.session(key) if key else contextlib.nullcontext()
            with guard:
                self.forward(body, path.path, started)
        except (ValueError, TypeError, KeyError) as exc:
            self.reply(400, {'error': {'message': str(exc) if isinstance(exc, ValueError) else 'Invalid request shape'}})
        except (BrokenPipeError, ConnectionResetError):
            self.server.store.log({'kind': 'client_disconnected', 'seconds': time.monotonic()-started})
        except Exception as exc:
            self.server.store.log({'kind': 'proxy_error', 'error_type': type(exc).__name__})
            if not getattr(self, 'headers_started', False):
                self.reply(502, {'error': {'message': 'Upstream request failed; not retried by router'}})
            self.close_connection = True

    def forward(self, body, path, started):
        key, forwarded, decision = self.server.router.prepare(body, self.headers, path.endswith('/compact'))
        headers = {k:v for k,v in self.headers.items() if k.lower() not in HOP}
        headers.update({'Authorization': 'Bearer '+self.server.keys['AZURE_OPENAI_API_KEY'],
                        'Content-Type': 'application/json', 'Accept-Encoding': 'identity'})
        url = self.server.config['upstream_base_url'].rstrip('/')+path[len('/v1'):]
        req = urllib.request.Request(url, data=json.dumps(forwarded, ensure_ascii=False).encode(),
                                     headers=headers, method='POST')
        try:
            response = self.server.opener.open(req, timeout=self.server.config['upstream_timeout_seconds'])
        except urllib.error.HTTPError as exc:
            response = exc
        with response:
            self.send_response(response.status)
            for k,v in response.headers.items():
                if k.lower() not in HOP:
                    self.send_header(k,v)
            self.send_header('X-Jev-Model', decision['model'])
            self.send_header('X-Jev-Reason', decision['reason'])
            if decision.get('reasoning_effort') is not None:
                self.send_header('X-Jev-Effort', decision['reasoning_effort'])
            if decision.get('effort_policy'):
                self.send_header('X-Jev-Effort-Policy', decision['effort_policy'])
            self.send_header('Connection', 'close')
            self.end_headers()
            self.headers_started = True
            observer = SSEObserver()
            is_sse = 'text/event-stream' in response.headers.get('Content-Type', '')
            raw = bytearray()
            while True:
                chunk = response.read1(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
                if is_sse:
                    observer.feed(chunk)
                elif len(raw) < 8_000_000:
                    raw.extend(chunk)
            result = observer.response
            if not is_sse:
                try:
                    result = json.loads(raw)
                except ValueError:
                    result = {}
            self.server.router.observed(key, decision['model'], result, response.status,
                                        time.monotonic()-started)
        self.close_connection = True


def make_server(config, keys, folder, live=False, judge=None, port=None):
    for tier in ('simple', 'standard', 'demanding'):
        if config['fallback_models'].get(tier) not in config['models']:
            raise ValueError('Fallback model must belong to the registered model pool')
    validate_config(config)
    url = urllib.parse.urlsplit(config['upstream_base_url'])
    if url.scheme != 'https' and url.hostname not in ('127.0.0.1', 'localhost'):
        raise ValueError('Upstream must use HTTPS (loopback fixtures excepted)')
    if url.username or url.password or url.query or url.fragment:
        raise ValueError('Credentials and query strings must not be stored in the upstream URL')
    server = ThreadingHTTPServer(('127.0.0.1', config['port'] if port is None else port), Handler)
    server.daemon_threads = True
    server.config, server.keys, server.live = config, keys, live
    server.store = Store(folder)
    server.router = Router(config, server.store, judge or Jev(config, keys.get('TYPESAFE_API_KEY')))
    server.opener = opener()
    return server


def main():
    os.umask(0o077)
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config', type=Path, default=ROOT/'config.json')
    p.add_argument('--state-dir', type=Path, default=ROOT/'runtime')
    p.add_argument('--load-zshrc', action='store_true')
    p.add_argument('--live', action='store_true', help='Enable Jev and Azure API requests')
    p.add_argument('--doctor', action='store_true')
    args = p.parse_args()
    cfg = json.loads(args.config.read_text())
    keys = credentials(args.load_zshrc)
    if args.doctor:
        print(json.dumps({'alias': cfg['alias'], 'models': list(cfg['models']),
                          'credentials': {k: bool(keys.get(k)) for k in ('TYPESAFE_API_KEY','AZURE_OPENAI_API_KEY')},
                          'upstream_host': urllib.parse.urlsplit(cfg['upstream_base_url']).hostname}))
        return
    if args.live and not all(keys.get(k) for k in ('TYPESAFE_API_KEY','AZURE_OPENAI_API_KEY')):
        raise SystemExit('Missing environment credentials; run --load-zshrc --doctor')
    server = make_server(cfg, keys, args.state_dir, args.live)
    print(json.dumps({'listen': '127.0.0.1:'+str(server.server_port), 'live': args.live}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
