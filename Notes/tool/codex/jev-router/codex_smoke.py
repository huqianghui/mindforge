#!/usr/bin/env python3
"""Ephemeral bundled-Codex integration test against an isolated live router."""
import argparse
import datetime
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import uuid

from gateway import make_server
from jev import credentials

ROOT=Path(__file__).resolve().parent
CODEX='/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--live',action='store_true')
    p.add_argument('--forced-model',help='Test-only deterministic selection to verify every backend; no live Jev call')
    args=p.parse_args()
    if not args.live:
        print('Plan: one ephemeral Codex task reads one temporary fixture through Auto / Jev. Add --live.');return
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    run=ROOT/'evidence'/('codex-'+stamp);run.mkdir(mode=0o700)
    cfg=json.loads((ROOT/'config.json').read_text());keys=credentials(True)
    judge=None
    if args.forced_model:
        if args.forced_model not in cfg['models']:raise SystemExit('Unknown matrix model')
        class FixedJudge:
            def evaluate(self,state):
                return {'model':args.forced_model,'confidence':1,'capability_gap':1,'source':'test_fixture_not_jev'}
        judge=FixedJudge()
    s=make_server(cfg,keys,run/'runtime',live=True,port=0,judge=judge)
    threading.Thread(target=s.serve_forever,daemon=True).start()
    try:
        with tempfile.TemporaryDirectory(prefix='jev-router-fixture-') as td:
            token='JEV_'+uuid.uuid4().hex
            (Path(td)/'fixture.txt').write_text(token+'\n')
            cmd=[CODEX,'exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-C',td,
                 '--json','-s','read-only','-m','auto-jev']
            overrides={'model_provider':'jev_probe','model_catalog_json':str(ROOT/'evidence/catalog.candidate.json'),
                'model_providers.jev_probe.name':'Isolated Jev test',
                'model_providers.jev_probe.base_url':f'http://127.0.0.1:{s.server_port}/v1',
                'model_providers.jev_probe.env_key':'AZURE_OPENAI_API_KEY',
                'model_providers.jev_probe.wire_api':'responses',
                'model_providers.jev_probe.request_max_retries':0,
                'model_providers.jev_probe.stream_max_retries':0,
                'model_providers.jev_probe.supports_websockets':False,
                'model_reasoning_effort':'low'}
            for k,v in overrides.items():cmd.extend(['-c',k+'='+json.dumps(v)])
            cmd.append('Read fixture.txt using a shell tool. Return exactly the token in that file. Do not modify files, use network, or perform other tasks.')
            env=dict(os.environ,**keys)
            result=subprocess.run(cmd,env=env,capture_output=True,text=True,timeout=150)
            (run/'stdout.jsonl').write_text(result.stdout)
            (run/'stderr.log').write_text(result.stderr)
            events=[json.loads(x) for x in result.stdout.splitlines() if x.startswith('{')]
            tool_events=[x for x in events if x.get('item',{}).get('type') in ('command_execution','tool_call','mcp_tool_call')]
            agent=[x.get('item',{}).get('text','') for x in events if x.get('item',{}).get('type')=='agent_message']
            routes=[json.loads(x) for x in (run/'runtime/events.jsonl').read_text().splitlines()]
            checked={'exit_code':result.returncode,'token_returned':any(token in t for t in agent),
                     'tool_events':len(tool_events),'routing_decisions':[{'model':x['model'],'reason':x['reason']} for x in routes if x['kind']=='route'],
                     'jev_calls':sum(bool(x.get('jev_called')) for x in routes),
                     'codex_version':subprocess.check_output([CODEX,'--version'],text=True).strip()}
            checked['forced_model']=args.forced_model
            checked['decision_source']='test_fixture' if args.forced_model else 'live_jev'
            checked['live_jev_calls']=0 if args.forced_model else checked['jev_calls']
            checked['passed']=result.returncode==0 and checked['token_returned'] and bool(tool_events) and checked['jev_calls']==1
            if args.forced_model:
                checked['passed']=checked['passed'] and all(x['model']==args.forced_model for x in checked['routing_decisions'])
            (run/'verified.json').write_text(json.dumps(checked,indent=2))
            print(json.dumps(checked,indent=2));print('Evidence: '+str(run))
            if not checked['passed']:raise SystemExit('Codex smoke failed; inspect evidence, no automatic retry')
    finally:
        s.shutdown();s.server_close()


if __name__=='__main__':main()
