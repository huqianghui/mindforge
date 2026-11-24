"""Build the Media Generation sample gallery (static pages).

Inputs are the local experiment archive (not in git); outputs are the HTML
pages next to this script. Videos are played from the GitHub Release.
"""
import csv, glob, html, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
B = os.path.join(ROOT, 'inbox/codex/2026-11-24-foundry-video-benchmark-materials')
REL = 'https://github.com/huqianghui/mindforge/releases/download/media-generation-2026-11-24/'
REPO = 'https://github.com/huqianghui/mindforge/blob/main/Notes/Media-Generation/'
E = html.escape

rows = {r['run_id']: r for r in csv.DictReader(open(f'{B}/实验逐条数据.csv', encoding='utf-8-sig'))}
reviews = {}
for f in glob.glob(f'{B}/evidence/reviews/*.json'):
    d = json.load(open(f))
    rs = d['runs']
    for k, v in (rs.items() if isinstance(rs, dict) else ((x['run_id'], x) for x in rs)):
        reviews[k] = v
def req(run):
    p = f'{B}/requests/{run}.json'
    return json.load(open(p)) if os.path.exists(p) else None

MODEL = {'ltx-fast': 'LTX 2.5 Fast', 'ltx-pro': 'LTX 2.5 Pro', 'h3-turbo': 'H3 Max Turbo',
         'h3-max': 'H3 Max', 'kling': 'Kling v3 Pro', 'kling-multi': 'Kling 分镜（顶层空 prompt）',
         'kling-multi-filled': 'Kling 分镜（顶层非空摘要）', 'fast-4k': 'LTX Fast · 4K',
         'fast-20s': 'LTX Fast · 20 秒', 'fast-48fps': 'LTX Fast · 48 fps', 'fast-50fps': 'LTX Fast · 50 fps',
         'drum-target': 'H3 Max · 指定目标音轨', 'drum-control': 'H3 Max · 对照（无音轨输入）',
         'woman-dog-ref': 'H3 Max · 双参考图', 'woman-start-control': 'H3 Max · 女性首帧 + 文字指定金毛',
         'wave-ref': 'H3 Max · 参考视频 + 参考图', 'wave-start-control': 'H3 Max · 首帧 + 文字动作'}

def f2(x, n=1):
    try: return f'{float(x):.{n}f}'
    except: return '—'

def params(r):
    q = req(r)
    if not q: return ''
    keep = {k: v for k, v in q.items() if k not in ('prompt', 'shots', 'model')}
    for k in ('reference_images', 'reference_videos', 'target_audio', 'start_image', 'end_image'):
        if k in keep:
            v = keep[k]; keep[k] = [os.path.basename(x) for x in v] if isinstance(v, list) else os.path.basename(v)
    return ' · '.join(f'{k}={v}' for k, v in keep.items())

def card(run, label=None):
    r = rows.get(run, {}); rv = reviews.get(run, {})
    name = os.path.basename(r.get('media_file', f'{run}.mp4')) or f'{run}.mp4'
    src = REL + name
    scores = [rv.get(k) for k in ('prompt_adherence', 'visual_quality', 'temporal_consistency', 'motion')]
    sc = '/'.join('–' if s is None else str(s) for s in scores) if any(s is not None for s in scores) else '—'
    asr = (rv.get('dialogue_asr') or {}).get('text')
    audio = '有音轨' if r.get('audio') == 'True' else '无音轨'
    return f'''<figure class="card" id="{E(run)}">
<video controls playsinline preload="none" poster="assets/posters/{E(run)}.jpg"><source src="{src}" type="video/mp4"></video>
<figcaption><div class="ttl">{E(label or run)}</div>
<div class="kv"><span>实际</span>{E(r.get('resolution','—'))} · {E(r.get('fps','').replace('/1',''))} fps · {f2(r.get('duration'),3)} 秒 · {audio}</div>
<div class="kv"><span>耗时</span>接收→完成 {f2(r.get('submit_to_completed_s'))} 秒 · 端到端 {f2(r.get('end_to_end_s'))} 秒</div>
<div class="kv"><span>估算</span>${f2(r.get('estimated_usd'),3)}（发布单价 × 实测秒数）</div>
<div class="kv"><span>请求</span>{E(params(run))}</div>
<div class="kv"><span>评分</span>{sc} <small>A/V/T/M，抽帧探索性</small></div>
{f'<div class="kv"><span>转写</span>“{E(asr)}”</div>' if asr else ''}
<p class="note">{E(rv.get('notes','') or '')}</p>
<a class="dl" href="{src}">下载原片</a></figcaption></figure>'''

def custom(it):
    if it.get('audio'):
        media = f'<audio controls preload="none" src="{REL}{it["audio"]}"></audio>'
    else:
        media = f'<video controls playsinline preload="none" poster="assets/posters/{E(it["poster"])}.jpg"><source src="{REL}{it["video"]}" type="video/mp4"></video>'
    kv = ''.join(f'<div class="kv"><span>{E(k)}</span>{E(v)}</div>' for k, v in it.get('kv', []))
    link = it.get('audio') or it.get('video')
    return f'<figure class="card">{media}<figcaption><div class="ttl">{E(it["title"])}</div>{kv}<p class="note">{it.get("note","")}</p><a class="dl" href="{REL}{link}">下载原件</a></figcaption></figure>'

def group(title, runs=(), sync=False, labels=None, intro='', items=None):
    cards = ''.join(custom(i) for i in items) if items else ''.join(card(r, (labels or {}).get(r)) for r in runs)
    btn = '<button class="sync" onclick="syncPlay(this)">▶ 同步播放这一组</button>' if sync else ''
    return f'<section class="grp"><h3>{E(title)}{btn}</h3>{intro}<div class="grid">{cards}</div></section>'

def table(head, body):
    h = ''.join(f'<th>{E(x)}</th>' for x in head)
    b = ''.join('<tr>' + ''.join(f'<td>{x}</td>' for x in row) + '</tr>' for row in body)
    return f'<div class="tw"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'

def stats(test, conds):
    out = []
    for c in conds:
        rs = [r for r in rows.values() if r['condition'] == c and r['test'] in test and r['state'] == 'completed']
        if not rs: continue
        e2e = [float(r['end_to_end_s']) for r in rs]; usd = [float(r['estimated_usd']) for r in rs]
        r0 = rs[0]
        out.append([E(MODEL.get(c, c)), f'{len(rs)}／3', f'{E(r0["resolution"])} @ {r0["fps"].replace("/1","")}',
                    f'{float(r0["duration"]):.3f}', f'{min(e2e):.0f}–{max(e2e):.0f}', f'{sum(usd)/len(usd):.2f}'])
    return table(['条件', '完成', '实际规格', '实测时长（秒）', '端到端（秒）', '单条估算（USD）'], out)

def prompt_block(run):
    q = req(run) or {}
    if 'shots' in q:
        t = '\n\n'.join(f"[镜头 {i+1} · {s.get('duration')} 秒] {s['prompt']}" for i, s in enumerate(q['shots']))
    else:
        t = q.get('prompt', '')
    return f'<details><summary>Prompt 原文</summary><pre>{E(t)}</pre></details>'

CSS = open(os.path.join(HERE, 'style.css')).read()
JS = '''function syncPlay(b){const v=[...b.closest('section').querySelectorAll('video')];
v.forEach(x=>{x.preload='auto';x.currentTime=0});Promise.all(v.map(x=>x.play().catch(()=>{})));}'''

def page(fn, title, body, back=True):
    nav = '<a class="back" href="index.html">← 全部测试</a>' if back else ''
    open(os.path.join(HERE, fn), 'w').write(f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)}</title>
<style>{CSS}</style></head><body><main>{nav}<h1>{E(title)}</h1>{body}
<footer>原片存放在 <a href="https://github.com/huqianghui/mindforge/releases/tag/media-generation-2026-11-24">GitHub Release</a>，页面里直接播放完整 MP4。评分是对抽帧的探索性判断，每组 3 条，不是正式排名；音画同步与人工可用性未评。文章见 <a href="{REPO}">Media Generation 系列</a>。</footer>
</main><script>{JS}</script></body></html>''')

PAGES = json.load(open(os.path.join(HERE, 'pages.json')))
M5 = ['ltx-fast', 'ltx-pro', 'h3-turbo', 'h3-max', 'kling']

def render(p):
    body = f'<p class="lede">{p["lede"]}</p>'
    body += '<h2>测什么、怎么测</h2>' + ''.join(f'<p>{x}</p>' for x in p['setup'])
    if p.get('inputs'):
        body += '<div class="inputs">' + ''.join(
            f'<figure><img src="assets/inputs/{i["img"]}" alt="{E(i["cap"])}"><figcaption>{E(i["cap"])}</figcaption></figure>' if 'img' in i else
            f'<figure><video controls preload="none" poster="assets/posters/{i["poster"]}.jpg"><source src="{REL}{i["video"]}" type="video/mp4"></video><figcaption>{E(i["cap"])}</figcaption></figure>'
            for i in p['inputs']) + '</div>'
    if p.get('prompt_from'): body += prompt_block(p['prompt_from'])
    if p.get('stats'): body += '<h2>汇总</h2>' + stats(p['stats']['tests'], p['stats']['conds'])
    if p.get('extra_table'): body += table(p['extra_table']['head'], p['extra_table']['rows'])
    body += '<h2>结论与建议</h2><ul class="find">' + ''.join(f'<li>{x}</li>' for x in p['findings']) + '</ul>'
    if p.get('unknown'): body += '<div class="warn"><b>未确认 / 不能下结论</b><ul>' + ''.join(f'<li>{x}</li>' for x in p['unknown']) + '</ul></div>'
    body += '<h2>全部样片</h2>'
    for g in p['groups']:
        body += group(g['title'], g.get('runs', ()), g.get('sync', False), g.get('labels'), g.get('intro', ''), g.get('items'))
    page(p['file'], p['title'], body)

for p in PAGES['tests']: render(p)

cards = ''.join(f'''<a class="tile" href="{p['file']}"><img loading="lazy" src="assets/previews/{p['preview']}.webp" alt="{E(p['title'])}">
<div class="tt">{E(p['title'])}</div><div class="ts">{E(p['tile'])}</div></a>''' for p in PAGES['tests'])
page('index.html', 'Media Generation 样片集：Foundry 五个视频模型实测', f'''<p class="lede">{PAGES['lede']}</p>
<div class="tiles">{cards}</div><h2>怎么读这些结果</h2><ul class="find">{''.join(f'<li>{x}</li>' for x in PAGES['howto'])}</ul>''', back=False)
print('built', len(PAGES['tests']) + 1, 'pages')
