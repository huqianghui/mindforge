import copy
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gateway import Router, Store, SSEObserver, make_server
from jev import Jev, WORKLOADS
from policy import choose, event_for, identity, estimate_cost

CONFIG = json.loads((Path(__file__).resolve().parents[1]/'config.json').read_text())
LOW, MID, HIGH = 'gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-6-astra'
BALANCED, LIGHT = 'gpt-6-sol', 'gpt-6-luna'


def headers(turn='t1', thread='s1'):
    return {'x-codex-turn-metadata': json.dumps({'thread_id':thread, 'turn_id':turn, 'agent_name':'/root'})}


def body(text='Explain a Python list', **extra):
    return {'model':'auto-jev', 'input':[{'role':'user', 'content':text}], **extra}


class Judge:
    def __init__(self, model=LOW, fail=False):
        self.calls = 0; self.model = model; self.fail = fail
    def evaluate(self, state):
        self.calls += 1
        if self.fail:
            raise TimeoutError('secret must not be logged')
        return {'model':self.model, 'confidence':.95, 'capability_gap':.95}


class ProfileJudge(Judge):
    def __init__(self, workload='simple', risk=0.01, model='uncertain', confidence=.49):
        super().__init__(model)
        self.workload, self.risk, self.confidence = workload, risk, confidence
    def evaluate(self, state):
        self.last_state = state
        result = super().evaluate(state)
        result.update(confidence=self.confidence, workload=self.workload,
                      workload_confidence=.95, high_risk=self.risk)
        return result


class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.cfg = copy.deepcopy(CONFIG)
        self.judge = Judge()
        self.store = Store(self.temp.name)
        self.router = Router(self.cfg, self.store, self.judge)

    def test_sticky_across_turns_and_tool_requests(self):
        for t in ('t1','t1','t2','t3'):
            _, forwarded, _ = self.router.prepare(body(), headers(t))
            self.assertEqual(forwarded['model'], LOW)
        self.assertEqual(self.judge.calls, 1)

    def test_independent_threads(self):
        self.router.prepare(body(),headers())
        self.router.prepare(body(),headers(thread='s2'))
        self.assertEqual(self.judge.calls,2)

    def test_persistent_binding_after_restart(self):
        self.router.prepare(body(), headers())
        new = Router(self.cfg, Store(self.temp.name), Judge(HIGH))
        self.assertEqual(new.prepare(body(), headers('t2'))[1]['model'], LOW)
        self.assertEqual(new.judge.calls,0)

    def test_manual_passthrough_preserves_every_field(self):
        b=body(model=MID, reasoning={'effort':'high'}, prompt_cache_key='stable')
        self.assertEqual(self.router.prepare(b,headers())[1],b)
        self.assertEqual(self.judge.calls,0)
        self.assertEqual(self.router.prepare(body(),headers('t2'))[1]['model'],MID)

    def test_no_inference_without_identity(self):
        with self.assertRaises(ValueError): self.router.prepare(body(), {})
        self.assertEqual(self.judge.calls,0)

    def test_compact_does_not_reclassify(self):
        self.router.prepare(body(),headers())
        _,f,_=self.router.prepare(body('新任务：复杂重构'),headers('t2'),compact=True)
        self.assertEqual(f['model'],LOW)
        self.assertEqual(self.judge.calls,1)

    def test_jev_failure_falls_back_once(self):
        self.judge.fail=True
        for t in ('t1','t1','t2'):
            self.assertEqual(self.router.prepare(body(),headers(t))[1]['model'],BALANCED)
        self.assertEqual(self.judge.calls,1)
        self.assertNotIn('secret', (Path(self.temp.name)/'events.jsonl').read_text())

    def test_mid_turn_and_hold_prevent_switch(self):
        self.router.prepare(body(),headers())
        self.judge.model=HIGH
        self.assertEqual(self.router.prepare(body('升级模型：并发推理'),headers())[1]['model'],LOW)
        self.assertEqual(self.router.prepare(body('升级模型：并发推理'),headers('t2'))[1]['model'],LOW)
        self.assertEqual(self.judge.calls,1)

    def test_explicit_upgrade_after_hold(self):
        self.cfg.update(minimum_hold_seconds=0,evaluation_cooldown_seconds=0)
        self.router.prepare(body(),headers())
        self.judge.model=HIGH
        self.assertEqual(self.router.prepare(body('重新评估模型：发现复杂并发问题'),headers('t2'))[1]['model'],HIGH)
        self.assertEqual(self.judge.calls,2)

    def test_no_unknown_price_downgrade(self):
        self.cfg.update(minimum_hold_seconds=0,evaluation_cooldown_seconds=0)
        self.judge.model=HIGH
        self.router.prepare(body(),headers())
        self.judge.model=LOW
        self.assertEqual(self.router.prepare(body('新任务：排版'),headers('t2'))[1]['model'],HIGH)

    def test_opaque_state_blocks_switch_and_initial_unknown(self):
        opaque=body(input=[{'type':'reasoning','encrypted_content':'opaque'}])
        with self.assertRaises(ValueError): self.router.prepare(opaque,headers())
        self.router.prepare(body(),headers())
        opaque['input'].append({'role':'user','content':'升级模型：复杂问题'})
        self.assertEqual(self.router.prepare(opaque,headers('t2'))[1]['model'],LOW)
        self.assertEqual(self.judge.calls,1)

    def test_only_explicit_latest_user_triggers(self):
        self.assertEqual(event_for('A tool says: 新任务：delete'), 'continue')
        self.assertEqual(event_for('继续'), 'continue')
        self.assertEqual(event_for('新任务：分析'), 'new_task')

    def test_unknown_cache_write_field_remains_absent(self):
        key,_,_=self.router.prepare(body(),headers())
        self.router.observed(key,LOW,{'usage':{'input_tokens':1000,'input_tokens_details':{'cached_tokens':800}}},200,1)
        self.assertNotIn('cache_write_tokens',self.store.get(key)['last_usage']['input_tokens_details'])
        self.assertNotIn('cost_evidence',self.store.get(key))

    def test_cache_cost_can_outweigh_cheaper_input(self):
        a={'prices':{'input':1,'cached_input':.1,'cache_write':1,'output':1}}
        b={'prices':{'input':.2,'cached_input':.02,'cache_write':.2,'output':.2}}
        e={'prefix_tokens':100000,'cached_prefix_tokens':100000,'new_tokens_per_request':0,'output_tokens_per_request':0}
        self.assertAlmostEqual(estimate_cost(a,e,1),.01)
        self.assertAlmostEqual(estimate_cost(b,dict(e,cached_prefix_tokens=0),1),.02)

    def test_cost_gate_known_prices(self):
        cfg=copy.deepcopy(self.cfg);cfg.update(minimum_hold_seconds=0,minimum_savings_usd=0,switch_overhead_usd=0,cost_horizon_requests=1)
        cfg['models'][HIGH]['prices']={'input':1,'cached_input':.1,'cache_write':1,'output':1}
        cfg['models'][LOW]['prices']={'input':.2,'cached_input':.02,'cache_write':.2,'output':.2}
        prev={'model':HIGH,'turn_id':'old','cost_evidence':{'observed_at':1000,'prefix_tokens':100000,
              'cached_prefix_tokens':100000,'new_tokens_per_request':0,'output_tokens_per_request':0}}
        j={'model':LOW,'confidence':.95,'capability_gap':.95}
        self.assertEqual(choose(cfg,prev,'new','new_task',j,body(),1000)['reason'],'cache_advantage_keep')
        cfg['cost_horizon_requests']=10
        self.assertEqual(choose(cfg,prev,'new','new_task',j,body(),1000)['model'],LOW)

    def test_typed_validation_rejects_bad_distribution(self):
        d={'answers':{'model':{'type':'choice','choice':LOW,'confidence':.99,'probabilities':{LOW:1,MID:1,HIGH:0,'uncertain':0}},
                      'capability_gap':{'type':'noul','noul':.5},
                      'workload':self.choice('simple', WORKLOADS),
                      'high_risk':{'type':'noul','noul':.01}}}
        with self.assertRaises(ValueError): Jev(self.cfg,'dummy').validate(d)

    def test_sse_fragmentation_and_usage(self):
        o=SSEObserver()
        data=b'data: {"type":"response.completed","response":{"usage":{"input_tokens":10}}}\r\n\r\n'
        for b in data: o.feed(bytes([b]))
        self.assertEqual(o.response['usage']['input_tokens'],10)

    def test_seven_registry_and_disabled_candidate_explained(self):
        self.cfg['models']['gpt-5.5'].update(enabled=False,unavailable_reason='fixture: deployment unavailable')
        self.assertEqual(len(self.cfg['models']),7)
        _,_,decision=self.router.prepare(body(),headers())
        self.assertEqual(len(decision['eligible_models']),6)
        self.assertIn('gpt-5.5',decision['excluded_models'])

    def test_disabled_model_never_forwarded(self):
        self.cfg['models']['gpt-5.5'].update(enabled=False,unavailable_reason='fixture: deployment unavailable')
        with self.assertRaises(ValueError):self.router.prepare(body(model='gpt-5.5'),headers())
        self.judge.model='gpt-5.5'
        _,forwarded,decision=self.router.prepare(body(),headers())
        self.assertEqual(forwarded['model'],BALANCED)
        self.assertEqual(decision['judge_error'],'ValueError')

    def test_all_seven_eligible_when_deployed_and_effort_compatible(self):
        self.cfg['models']['gpt-5.5']['enabled']=True
        _,_,decision=self.router.prepare(body(reasoning={'effort':'medium'}),headers())
        self.assertEqual(len(decision['eligible_models']),7)
        _,_,decision=self.router.prepare(body(reasoning={'effort':'max'}),headers('t2'))
        self.assertEqual(decision['excluded_models']['gpt-5.5'],'reasoning_effort_unsupported')

    def test_enabled_gpt55_selected_and_retained_across_turns(self):
        self.judge.model='gpt-5.5'
        for turn in ('t1','t1','t2'):
            _,forwarded,decision=self.router.prepare(body(reasoning={'effort':'medium'}),headers(turn))
            self.assertEqual(forwarded['model'],'gpt-5.5')
            self.assertEqual(decision['excluded_models'],{})
        self.assertEqual(self.judge.calls,1)

    @staticmethod
    def choice(selected, options):
        return {'type':'choice', 'choice':selected, 'confidence':.95,
                'probabilities':{k:float(k == selected) for k in options}}

    def test_profile_response_contract_and_invalid_risk(self):
        data = {'answers':{
            'model':self.choice('uncertain', set(self.cfg['models']) | {'uncertain'}),
            'workload':self.choice('simple', WORKLOADS),
            'capability_gap':{'type':'noul', 'noul':.09},
            'high_risk':{'type':'noul', 'noul':.01}}}
        result = Jev(self.cfg, 'unused').validate(data)
        self.assertEqual(result['workload'], 'simple')
        self.assertEqual(result['model'], 'uncertain')
        for invalid in (True, float('nan'), -1, 1.1):
            data['answers']['high_risk']['noul'] = invalid
            with self.assertRaises(ValueError):
                Jev(self.cfg, 'unused').validate(data)

    def test_uncertain_model_with_clear_task_profile(self):
        for workload, risk, expected in (
            ('simple', .01, LIGHT), ('standard', .01, BALANCED),
            ('demanding', .01, HIGH), ('simple', .95, HIGH),
            ('unknown', .5, BALANCED), ('simple', .5, BALANCED)):
            with self.subTest(workload=workload, risk=risk):
                self.router.judge = ProfileJudge(workload, risk)
                _, forwarded, decision = self.router.prepare(
                    body("hello, who are you? what's the exact model or deployment?"),
                    headers(thread=workload+str(risk)))
                self.assertEqual(forwarded['model'], expected)
                self.assertTrue(decision['reason'].startswith('initial_profile_'))
                self.assertEqual(decision['policy_version'], CONFIG['policy_version'])

    def test_profile_receives_latest_request_separately(self):
        judge = ProfileJudge()
        self.router.judge = judge
        request = body(input=[
            {'role':'user', 'content':'Repository guidance: audit production systems carefully.'},
            {'role':'user', 'content':'目前是用哪个模型？具体 deployment？'}])
        self.router.prepare(request, headers())
        self.assertEqual(judge.last_state['latest_request'], '目前是用哪个模型？具体 deployment？')
        self.assertEqual(len(judge.last_state['messages']), 2)

    def test_low_profile_confidence_does_not_imply_light_model(self):
        j = ProfileJudge().evaluate({})
        j['workload_confidence'] = .3
        decision = choose(self.cfg, None, 't', 'initial', j, body())
        self.assertEqual(decision['model'], BALANCED)
        self.assertTrue(decision['provisional'])

    def test_risk_or_demand_overrides_confident_small_model(self):
        for workload, risk in (('simple', .95), ('demanding', .01)):
            j = ProfileJudge(workload, risk, LOW, .99).evaluate({})
            self.assertEqual(choose(self.cfg, None, 't', 'initial', j, body())['model'], HIGH)

    def test_disabled_fallback_and_effort_are_respected(self):
        self.router.judge = ProfileJudge()
        self.cfg['models'][LIGHT]['enabled'] = False
        _, forwarded, decision = self.router.prepare(body(), headers())
        self.assertNotEqual(forwarded['model'], LIGHT)
        self.assertEqual(decision['selection_source'], 'compatible_fallback_simple')
        for spec in self.cfg['models'].values():
            spec['enabled'] = False
        with self.assertRaises(ValueError):
            self.router.prepare(body(), headers(thread='none'))

    def test_compatible_fallback_can_upgrade_existing_binding(self):
        self.cfg.update(minimum_hold_seconds=0, evaluation_cooldown_seconds=0)
        self.router.judge = ProfileJudge()
        self.router.prepare(body(), headers())
        self.cfg['models'][BALANCED]['enabled'] = False
        self.router.judge = ProfileJudge('standard')
        _, forwarded, decision = self.router.prepare(body('新任务：实现一个常规接口'), headers('t2'))
        self.assertGreater(self.cfg['models'][forwarded['model']]['rank'],
                           self.cfg['models'][LIGHT]['rank'])
        self.assertEqual(decision['reason'], 'task_switch')
        self.assertEqual(decision['selection_source'], 'compatible_fallback_standard')
        self.assertFalse(decision['provisional'])

    def test_legacy_binding_is_not_silently_migrated(self):
        self.cfg.update(minimum_hold_seconds=0, evaluation_cooldown_seconds=0)
        key, _, _ = identity(headers())
        self.store.put(key, {'model':HIGH, 'turn_id':'old', 'requests':1})
        self.router.judge = ProfileJudge()
        _, forwarded, decision = self.router.prepare(body('重新评估模型：简单问候'), headers('t2'))
        self.assertEqual(forwarded['model'], HIGH)
        self.assertEqual(decision['reason'], 'no_mid_task_downgrade')
        self.assertFalse(decision['provisional'])

    def test_provisional_correction_only_at_explicit_safe_boundary(self):
        self.cfg.update(minimum_hold_seconds=0, evaluation_cooldown_seconds=0)
        self.judge.fail = True
        key, _, _ = self.router.prepare(body(), headers())
        self.assertTrue(self.store.get(key)['provisional'])
        self.router.judge = ProfileJudge()
        self.assertEqual(self.router.prepare(body('继续'), headers('t2'))[1]['model'], BALANCED)
        self.assertEqual(self.router.judge.calls, 0)
        _, forwarded, decision = self.router.prepare(body('重新评估模型：只是简单问候'), headers('t3'))
        self.assertEqual(forwarded['model'], LIGHT)
        self.assertEqual(decision['reason'], 'fallback_correction')
        self.assertFalse(self.store.get(key)['provisional'])

    def test_provisional_correction_respects_opaque_history_and_hold(self):
        self.cfg['evaluation_cooldown_seconds'] = 0
        self.judge.fail = True
        self.router.prepare(body(), headers())
        self.router.judge = ProfileJudge()
        self.assertEqual(self.router.prepare(body('重新评估模型：问候'), headers('t2'))[1]['model'], BALANCED)
        self.cfg['minimum_hold_seconds'] = 0
        request = body(input=[{'type':'reasoning', 'encrypted_content':'fixture'},
                              {'role':'user', 'content':'重新评估模型：问候'}])
        self.assertEqual(self.router.prepare(request, headers('t3'))[1]['model'], BALANCED)
        self.assertEqual(self.router.judge.calls, 1)

    def test_manual_selection_removes_provisional_status(self):
        self.judge.fail = True
        key, _, _ = self.router.prepare(body(), headers())
        self.router.prepare(body(model=HIGH), headers('t2'))
        self.assertFalse(self.store.get(key)['provisional'])
        self.assertEqual(self.store.get(key)['binding_source'], 'manual')

    def test_historical_uncertain_record_uses_balanced_not_astra(self):
        judgment = {'model':'uncertain', 'confidence':.49, 'capability_gap':.09}
        result = choose(self.cfg, None, 'first', 'initial', judgment, body())
        self.assertEqual(result['model'], BALANCED)
        self.assertTrue(result['provisional'])


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.requests=[]
        self.request_headers=[]
        owner=self
        class Upstream(BaseHTTPRequestHandler):
            def log_message(self,*a):pass
            def do_POST(self):
                value=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                owner.requests.append((self.path,value))
                owner.request_headers.append(dict(self.headers))
                self.send_response(200);self.send_header('Content-Type','text/event-stream');self.end_headers()
                self.wfile.write(b'data: {"type":"response.output_text.delta","delta":"OK"}\n\n')
                self.wfile.flush()
                time.sleep(.03)
                self.wfile.write(b'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":1024,"input_tokens_details":{"cached_tokens":896}}}}\n\n')
        self.up=ThreadingHTTPServer(('127.0.0.1',0),Upstream)
        threading.Thread(target=self.up.serve_forever,daemon=True).start()
        self.addCleanup(self.up.server_close);self.addCleanup(self.up.shutdown)
        cfg=copy.deepcopy(CONFIG);cfg['upstream_base_url']=f'http://127.0.0.1:{self.up.server_port}/v1'
        self.judge=Judge()
        self.srv=make_server(cfg,{'AZURE_OPENAI_API_KEY':'fixture','TYPESAFE_API_KEY':'fixture'},self.temp.name,
                             True,self.judge,0)
        threading.Thread(target=self.srv.serve_forever,daemon=True).start()
        self.addCleanup(self.srv.server_close);self.addCleanup(self.srv.shutdown)

    def post(self,b,turn='t1',auth='fixture',path='/v1/responses',extra_headers=None):
        req=urllib.request.Request(f'http://127.0.0.1:{self.srv.server_port}'+path,data=json.dumps(b).encode(),
            headers={**headers(turn),'Authorization':'Bearer '+auth,'Content-Type':'application/json',
                     **(extra_headers or {})})
        return urllib.request.urlopen(req,timeout=5)

    def test_stream_and_binding_and_exact_prefix(self):
        b=body(stream=True, prompt_cache_key='keep-this',tools=[{'type':'function','name':'x'}],reasoning={'effort':'medium'})
        for t in ('t1','t2'):
            with self.post(b,t) as r:
                self.assertEqual(r.headers['X-Jev-Model'],LOW)
                self.assertIn(b'response.completed',r.read())
        self.assertEqual(self.judge.calls,1)
        expected=dict(b,model=LOW)
        self.assertEqual(self.requests[0][1],expected)
        self.assertEqual(self.requests[1][1],expected)

    def test_auth_and_endpoint_boundaries(self):
        for auth,path,code in [('wrong','/v1/responses',401),('fixture','/outside-v1',404)]:
            with self.assertRaises(urllib.error.HTTPError) as e:self.post(body(),auth=auth,path=path)
            self.assertEqual(e.exception.code,code)
        self.assertEqual(self.judge.calls,0)
        self.assertEqual(self.requests,[])

    def test_chat_completions_passthrough_does_not_call_jev(self):
        b={'model':HIGH,'messages':[{'role':'user','content':'fixture'}]}
        with self.post(b,path='/v1/chat/completions') as r:r.read()
        self.assertEqual(self.requests[0],('/v1/chat/completions',b))
        self.assertEqual(self.judge.calls,0)

    def test_manual_and_compact(self):
        b=body(model=HIGH)
        with self.post(b) as r:r.read()
        with self.post(body(),'t2',path='/v1/responses/compact') as r:r.read()
        self.assertEqual(self.judge.calls,0)
        self.assertEqual(self.requests[-1][0],'/v1/responses/compact')
        self.assertEqual(self.requests[-1][1]['model'],HIGH)


    def test_health_reports_loaded_policy_not_disk_claim(self):
        with urllib.request.urlopen(f'http://127.0.0.1:{self.srv.server_port}/health') as r:
            health = json.load(r)
        self.assertEqual(health['policy_version'], CONFIG['policy_version'])
        self.assertEqual(health['fallback_models']['simple'], LIGHT)
        self.assertEqual(self.judge.calls, 0)

    def test_profile_fallback_stream_preserves_input_and_binds(self):
        judge = ProfileJudge()
        self.srv.router.judge = judge
        request = body("hello, who are you?", stream=True, prompt_cache_key='unchanged',
                       tools=[{'type':'function', 'name':'lookup'}])
        for turn in ('t1', 't1', 't2'):
            with self.post(request, turn) as r:
                self.assertEqual(r.headers['X-Jev-Model'], LIGHT)
                self.assertIn(b'response.completed', r.read())
        self.assertEqual(judge.calls, 1)
        for _, actual in self.requests:
            self.assertEqual(actual, dict(request, model=LIGHT))

    def test_joint_effort_reaches_upstream_and_local_header_is_stripped(self):
        from test_effort import JointJudge
        self.srv.router.judge = JointJudge(LIGHT, 'high')
        request = body(stream=True, reasoning={'effort': 'low', 'summary': 'detailed'},
                       prompt_cache_key='unchanged', tools=[{'type': 'function', 'name': 'lookup'}])
        for turn in ('t1', 't1', 't2'):
            with self.post(request, turn, extra_headers={'X-Jev-Effort-Policy': 'auto'}) as response:
                self.assertEqual(response.headers['X-Jev-Model'], LIGHT)
                self.assertEqual(response.headers['X-Jev-Effort'], 'high')
                self.assertEqual(response.headers['X-Jev-Effort-Policy'], 'auto')
                self.assertIn(b'response.completed', response.read())
        self.assertEqual(self.srv.router.judge.calls, 1)
        for (_, actual), sent_headers in zip(self.requests, self.request_headers):
            self.assertEqual(actual, dict(request, model=LIGHT,
                reasoning={'effort': 'high', 'summary': 'detailed'}))
            self.assertNotIn('x-jev-effort-policy', {k.lower() for k in sent_headers})

    def test_invalid_effort_policy_never_reaches_upstream(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.post(body(), extra_headers={'X-Jev-Effort-Policy': 'typo'})
        self.assertEqual(error.exception.code, 400)
        self.assertEqual(self.requests, [])
        self.assertEqual(self.judge.calls, 0)


if __name__=='__main__':unittest.main()
