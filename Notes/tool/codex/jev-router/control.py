#!/usr/bin/env python3
"""Read router status or attach an explicit, measured forecast; no model calls."""
import argparse
import json
from pathlib import Path
import time

from gateway import Store
from policy import valid_number


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--state-dir',type=Path,default=Path.home()/'.codex/jev-router')
    sub=p.add_subparsers(dest='action',required=True)
    sub.add_parser('status')
    f=sub.add_parser('forecast');f.add_argument('--session',required=True);f.add_argument('--file',required=True,type=Path)
    args=p.parse_args();store=Store(args.state_dir)
    with store.connect() as c:rows=c.execute('SELECT id,value FROM sessions').fetchall()
    if args.action=='status':
        print(json.dumps([dict(session=k[:16],**{x:v for x,v in json.loads(s).items() if x in
            ('model','requests','updated_at','last_usage','last_usage_at','cost_evidence',
             'provisional','binding_source','reasoning_effort','effort_policy',
             'effort_source','effort_switched_at')}) for k,s in rows],indent=2))
        return
    matches=[k for k,_ in rows if k.startswith(args.session)]
    if len(matches)!=1:raise SystemExit('Session prefix must match exactly one existing session')
    evidence=json.loads(args.file.read_text())
    keys=('prefix_tokens','cached_prefix_tokens','new_tokens_per_request','output_tokens_per_request')
    if any(not valid_number(evidence.get(k)) for k in keys):raise SystemExit('Forecast requires four nonnegative token counts')
    if evidence['cached_prefix_tokens']>evidence['prefix_tokens']:raise SystemExit('Cached prefix exceeds total prefix')
    evidence={k:evidence[k] for k in keys};evidence['observed_at']=time.time()
    key=matches[0]
    # Atomic read-modify-write prevents overwriting the server's latest binding.
    with store.connect() as c:
        c.execute('BEGIN IMMEDIATE')
        state=json.loads(c.execute('SELECT value FROM sessions WHERE id=?',(key,)).fetchone()[0])
        state['cost_evidence']=evidence
        c.execute('UPDATE sessions SET value=? WHERE id=?',(json.dumps(state),key))
    print('Scenario forecast saved; this is not a physical-cache availability guarantee.')


if __name__=='__main__':main()
