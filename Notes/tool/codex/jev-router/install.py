#!/usr/bin/env python3
"""Prepare/install reversible Codex catalog + Azure loopback proxy configuration."""
import argparse
import copy
import datetime
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import sys
import tomllib
import urllib.request

ROOT=Path(__file__).resolve().parent
HOME=Path.home()
RUNTIME=HOME/'.codex/jev-router'
LABEL='local.codex.auto-jev'
PLIST=HOME/'Library/LaunchAgents'/f'{LABEL}.plist'


def sha(data):return hashlib.sha256(data).hexdigest()


def atomic(path,data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_name(path.name+'.auto-jev.tmp')
    with temp.open('xb') as f:
        os.chmod(temp,0o600);f.write(data)
    os.replace(temp,path)


def configuration(text,url,catalog=None):
    parsed=tomllib.loads(text)
    if parsed.get('model_provider')!='azure':raise ValueError('Expected existing Azure provider; refusing unrelated config')
    lines=text.splitlines(keepends=True);section=None;changed=False
    for i,line in enumerate(lines):
        if line.lstrip().startswith('['):section=line.strip()
        if section=='[model_providers.azure]' and re.match(r'^\s*base_url\s*=',line):
            lines[i]='base_url = '+json.dumps(url)+'\n';changed=True
    if not changed:raise ValueError('Azure base_url not found')
    text=''.join(lines)
    if catalog:
        if 'model_catalog_json' not in parsed:
            text='model_catalog_json = '+json.dumps(str(catalog))+'\n'+text
        elif parsed['model_catalog_json']!=str(catalog):
            raise ValueError('Existing custom catalog differs; refusing replacement')
    tomllib.loads(text)
    return text.encode()


def prepare():
    cfg=json.loads((ROOT/'config.json').read_text())
    project=ROOT.parent/'.codex/config.toml';user=HOME/'.codex/config.toml'
    catalog=Path(tomllib.loads(project.read_text())['model_catalog_json'])
    original=json.loads(catalog.read_text())
    models=original['models']
    # Use exact bundled entries for newly available models rather than guessing
    # model-specific capabilities or instructions from another model's entry.
    bundled=json.loads((ROOT/'evidence/bundled-models.json').read_text())['models']
    known={m['slug'] for m in models}
    for name in cfg['models']:
        if name not in known:
            m=copy.deepcopy(next(m for m in bundled if m['slug']==name))
            m.update(visibility='list',supported_in_api=True)
            models.append(m)
    for m in models:
        if m['slug'] in cfg['models']:
            m['visibility']='list'
            if cfg['models'][m['slug']].get('enabled') is False:
                m['display_name']='GPT-5.5 · 未部署'
            elif m.get('display_name', '').endswith(' · 未部署'):
                m['display_name']=m['display_name'].removesuffix(' · 未部署')
    source=next(m for m in bundled if m['slug']==cfg['catalog_protocol_model'])
    pool=[next(m for m in models if m['slug']==name) for name in cfg['models']]
    alias=copy.deepcopy(source)
    alias.update(slug=cfg['alias'],display_name='Auto / Jev',visibility='list',priority=0,
                 description='Jev task-sticky routing: keeps one model across turns; reassesses on explicit task events.',
                 prefer_websockets=False,upgrade=None,supported_in_api=True,
                 minimal_client_version=None,available_in_plans=None)
    shared=set.intersection(*(set(m['efforts']) for m in cfg['models'].values()))
    alias['supported_reasoning_levels']=[x for x in source['supported_reasoning_levels'] if x['effort'] in shared]
    alias['context_window']=min(m['context_window'] for m in pool)
    alias['max_context_window']=min(m['max_context_window'] for m in pool)
    original['models']=[m for m in models if m['slug']!=cfg['alias']]+[alias]
    candidate=ROOT/'evidence/catalog.candidate.json'
    atomic(candidate,(json.dumps(original,ensure_ascii=False,indent=2)+'\n').encode())
    url=f'http://127.0.0.1:{cfg["port"]}/v1'
    changes={str(catalog):candidate.read_bytes(),str(project):configuration(project.read_text(),url),
             str(user):configuration(user.read_text(),url,catalog)}
    return cfg,candidate,changes


def install():
    cfg,candidate,changes=prepare()
    # Start and verify the gateway before modifying any effective Codex config.
    RUNTIME.mkdir(parents=True,exist_ok=True,mode=0o700)
    service={'Label':LABEL,'ProgramArguments':[sys.executable,str(ROOT/'gateway.py'),'--config',str(ROOT/'config.json'),
             '--state-dir',str(RUNTIME),'--load-zshrc','--live'],
             'RunAtLoad':True,'KeepAlive':{'SuccessfulExit':False},'ThrottleInterval':10,
             'WorkingDirectory':str(ROOT),'StandardOutPath':str(RUNTIME/'service.stdout.log'),
             'StandardErrorPath':str(RUNTIME/'service.stderr.log'),
             'EnvironmentVariables':{'PATH':'/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin'}}
    if PLIST.exists():raise ValueError('Service already installed; use status or rollback before reinstalling')
    atomic(PLIST,plistlib.dumps(service))
    r=subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(PLIST)],capture_output=True,text=True)
    if r.returncode:
        PLIST.unlink()
        raise RuntimeError('launchctl bootstrap failed: '+r.stderr.strip())
    import time
    healthy=False
    for _ in range(20):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{cfg["port"]}/health',timeout=1) as r: health=json.load(r)
            healthy=health.get('live') and health.get('jev_key_present') and health.get('upstream_key_present')
            if healthy:break
        except OSError:pass
        time.sleep(.5)
    if not healthy:
        subprocess.run(['launchctl','bootout',f'gui/{os.getuid()}/{LABEL}'],capture_output=True)
        PLIST.unlink()
        raise RuntimeError('Service health check failed; Codex configuration was not changed')
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    backup=RUNTIME/'backups'/stamp;backup.mkdir(parents=True,mode=0o700)
    manifest={'created_at':stamp,'files':[],'service':str(PLIST)}
    for i,(name,data) in enumerate(changes.items()):
        path=Path(name);old=path.read_bytes();saved=backup/f'{i}.backup'
        atomic(saved,old)
        manifest['files'].append({'path':name,'backup':str(saved),'before_sha256':sha(old),'installed_sha256':sha(data)})
    # The manifest is durable before any target file changes, enabling recovery.
    atomic(backup/'manifest.json',json.dumps(manifest,indent=2).encode())
    for name,data in changes.items():atomic(Path(name),data)
    atomic(RUNTIME/'installation.json',json.dumps(manifest,indent=2).encode())
    print(json.dumps({'installed':True,'catalog_entry':'Auto / Jev','manifest':str(backup/'manifest.json'),
                      'service':str(PLIST),'default_model_unchanged':True},ensure_ascii=False,indent=2))


def rollback():
    manifest=json.loads((RUNTIME/'installation.json').read_text())
    # All guards run before any write. Preserve edits made after installation.
    for f in manifest['files']:
        if sha(Path(f['path']).read_bytes())!=f['installed_sha256']:
            raise ValueError('Configuration changed after installation; refusing overwrite: '+f['path'])
        if sha(Path(f['backup']).read_bytes())!=f['before_sha256']:raise ValueError('Backup integrity failure')
    for f in manifest['files']:atomic(Path(f['path']),Path(f['backup']).read_bytes())
    subprocess.run(['launchctl','bootout',f'gui/{os.getuid()}/{LABEL}'],capture_output=True)
    PLIST.unlink(missing_ok=True)
    print('Restored original config and catalog; router state and backups preserved.')


def upgrade():
    manifest_path=RUNTIME/'installation.json'
    manifest=json.loads(manifest_path.read_text())
    for f in manifest['files']:
        if sha(Path(f['path']).read_bytes())!=f['installed_sha256']:
            raise ValueError('Configuration changed after installation; refusing overwrite: '+f['path'])
    _,candidate,changes=prepare()
    for f in manifest['files']:
        data=changes[f['path']]
        atomic(Path(f['path']),data)
        f['installed_sha256']=sha(data)
    manifest['upgrade']='seven-model-common-responses'
    atomic(manifest_path,json.dumps(manifest,indent=2).encode())
    # Original pre-install backups are retained for complete rollback.
    print(json.dumps({'upgraded':True,'catalog':str(candidate),'reload_service_required':True}))


if __name__=='__main__':
    os.umask(0o077)
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('action',choices=['prepare','install','upgrade','rollback'])
    args=p.parse_args()
    if args.action=='install':install()
    elif args.action=='upgrade':upgrade()
    elif args.action=='rollback':rollback()
    else:
        _,candidate,changes=prepare()
        print(json.dumps({'candidate':str(candidate),'would_update':list(changes),'effective_config_changed':False},indent=2))
