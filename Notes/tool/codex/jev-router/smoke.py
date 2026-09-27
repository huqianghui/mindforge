#!/usr/bin/env python3
"""Bounded synthetic live check. Three execution requests, one Jev evaluation; no retries."""
import argparse
import datetime
import json
from pathlib import Path
import threading
import urllib.request
import uuid

from gateway import make_server, SSEObserver
from jev import credentials

ROOT=Path(__file__).resolve().parent


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--live',action='store_true')
    args=p.parse_args()
    if not args.live:
        print('Plan: isolated gateway, 1 Jev + 3 Azure synthetic requests. Add --live to execute.');return
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    run=ROOT/'evidence'/('live-'+stamp);run.mkdir(mode=0o700)
    cfg=json.loads((ROOT/'config.json').read_text());keys=credentials(True)
    s=make_server(cfg,keys,run/'runtime',live=True,port=0)
    threading.Thread(target=s.serve_forever,daemon=True).start()
    thread=str(uuid.uuid4());results=[]
    plan={'max_jev_requests':1,'max_azure_requests':3,'retries':0,'synthetic_only':True}
    (run/'plan.json').write_text(json.dumps(plan,indent=2))
    try:
        for i,model in enumerate(['auto-jev','auto-jev','gpt-6-astra']):
            payload={'model':model,'input':[{'role':'user','content':'This is a simple connectivity test. Reply with exactly JEV_ROUTER_OK. Do not use tools.'}],
                     'reasoning':{'effort':'low'},'stream':True,'store':False,'max_output_tokens':256}
            (run/f'{i}.request.json').write_text(json.dumps(payload,indent=2))
            meta={'thread_id':thread,'turn_id':str(uuid.uuid4()),'agent_name':'/root'}
            req=urllib.request.Request(f'http://127.0.0.1:{s.server_port}/v1/responses',data=json.dumps(payload).encode(),
                headers={'Authorization':'Bearer '+keys['AZURE_OPENAI_API_KEY'],'Content-Type':'application/json',
                         'x-codex-turn-metadata':json.dumps(meta)})
            with urllib.request.urlopen(req,timeout=120) as r:
                raw=r.read();status=r.status;actual=r.headers.get('X-Jev-Model');reason=r.headers.get('X-Jev-Reason')
            (run/f'{i}.response.sse').write_bytes(raw)
            observer=SSEObserver();observer.feed(raw)
            output=''.join(x.get('text','') for item in observer.response.get('output',[])
                           for x in item.get('content',[]) if x.get('type')=='output_text')
            result={'index':i,'requested':model,'actual':actual,'reason':reason,'http_status':status,
                    'response_status':observer.response.get('status'),'output':output,
                    'usage':observer.response.get('usage')}
            results.append(result)
            (run/'results.json').write_text(json.dumps(results,indent=2))
            print(json.dumps(result),flush=True)
            if observer.response.get('status')!='completed' or output.strip()!='JEV_ROUTER_OK':
                raise RuntimeError('Unexpected synthetic response; stopped without retry')
            if i==0 and reason not in ('initial_model_judgment', 'initial_profile_simple',
                                       'initial_profile_standard', 'initial_profile_demanding'):
                raise RuntimeError('Jev judgment was not verified; stopped without retry')
        assert results[0]['actual']==results[1]['actual']
        assert results[1]['reason']=='sticky'
        assert results[2]['reason']=='manual_passthrough'
        (run/'verified.json').write_text(json.dumps({'passed':True,'checks':['real_jev_judgment','cross_turn_sticky','sse_completed','manual_passthrough'],
            'not_tested':['Desktop UI','Codex tool loop','cost savings','cache retention']},indent=2))
        print('Evidence: '+str(run))
    finally:
        s.shutdown();s.server_close()


if __name__=='__main__':main()
