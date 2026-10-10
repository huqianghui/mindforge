#!/usr/bin/env python3
"""Build the Articles search page for GitHub Pages.

Parses README's Articles tree (nested <details>) to learn which folder each
article sits in, enriches every entry with frontmatter tags, the first body
paragraph and the H2 headings, and writes a single self-contained index.html
with client-side search + folder filters.

Usage: python3 wiki/scripts/build-articles-search.py [out_dir]   (default: _site/articles)
No third-party dependencies, so it runs as-is in CI.
"""

import json
import re
import sys
import urllib.parse
from pathlib import Path

VAULT_ROOT = Path(__file__).resolve().parent.parent.parent
README_FILE = VAULT_ROOT / "README.md"
REPO_BLOB = "https://github.com/huqianghui/mindforge/blob/main/"
REPO_URL = "https://github.com/huqianghui/mindforge"
GRAPH_URL = "https://huqianghui.github.io/mindforge/wiki/"

RE_SUMMARY = re.compile(r"<summary>(.*?)</summary>")
RE_LINK = re.compile(r"^- \[(.+?)\]\(([^)\s]+)\)\s*(.*)$")
RE_GROUP = re.compile(r"^\*\*(.+?)\*\*\s*$")


def parse_tree(readme: str):
    start = readme.index("## Articles\n")
    end = readme.index("\n---\n", start)
    stack, group, items, descs = [], "", [], {}
    for line in readme[start:end].split("\n"):
        m = RE_SUMMARY.search(line)
        if m:
            raw = re.sub(r"<[^>]+>", "", m.group(1))
            name, _, desc = raw.partition(" — ")
            stack.append(name.strip())
            descs["/".join(stack)] = desc.strip()
            group = ""
            continue
        if line.strip() == "</details>":
            stack.pop()
            group = ""
            continue
        m = RE_GROUP.match(line.strip())
        if m:
            group = m.group(1)
            continue
        m = RE_LINK.match(line.strip())
        if m and stack:
            note = m.group(3).strip().strip("（）() ")
            items.append({"title": m.group(1), "href": m.group(2), "folder": "/".join(stack),
                          "group": " · ".join(x for x in (group, note) if x)})
    return items, descs


def read_meta(rel_href: str):
    path = VAULT_ROOT / urllib.parse.unquote(rel_href)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return {}
    fm, body = "", text
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if m:
        fm, body = m.group(1), text[m.end():]
    tags = []
    mt = re.search(r"^tags:\s*\[(.*?)\]", fm, re.M)
    if mt:
        tags = [t.strip().strip("'\"") for t in mt.group(1).split(",") if t.strip()]
    else:
        mt = re.search(r"^tags:\s*\n((?:\s*-\s*.+\n?)+)", fm, re.M)
        if mt:
            tags = [t.strip().lstrip("-").strip().strip("'\"") for t in mt.group(1).splitlines() if t.strip()]
    tags = [t for t in tags if t and t.lower() not in ("wiki",)]
    md = re.search(r"^description:\s*(.+)$", fm, re.M)
    summary = md.group(1).strip().strip("'\"") if md else ""
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    if not summary:
        for para in re.split(r"\n\s*\n", body):
            p = para.strip()
            if not p or p.startswith(("#", "!", "|", "<", "---", "```")):
                continue
            p = re.sub(r"^>\s*(\[!\w+\]\s*)?", "", p, flags=re.M)
            summary = p
            break
    summary = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", summary)
    summary = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", summary)
    summary = re.sub(r"[*_`]+", "", summary)
    summary = re.sub(r"\s+", " ", summary).strip()
    if len(summary) > 180:
        summary = summary[:178] + "…"
    heads = [re.sub(r"[*_`]+", "", h).strip() for h in re.findall(r"^##\s+(.+)$", body, re.M)][:24]
    return {"tags": tags, "summary": summary, "heads": heads}


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else VAULT_ROOT / "_site" / "articles"
    items, descs = parse_tree(README_FILE.read_text(encoding="utf-8"))
    for it in items:
        it.update(read_meta(it["href"]))
        it["url"] = REPO_BLOB + it["href"]
        del it["href"]
    data = {"items": items, "folderDesc": descs}
    out_dir.mkdir(parents=True, exist_ok=True)
    page = PAGE.replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
    page = page.replace("__REPO__", REPO_URL).replace("__GRAPH__", GRAPH_URL)
    (out_dir / "index.html").write_text(page, encoding="utf-8")
    print(f"wrote {out_dir / 'index.html'} ({len(items)} articles)")


PAGE = r"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mindforge Articles</title>
<style>
:root {
  --bg: #ffffff; --panel: #f6f8fa; --border: #d0d7de; --text: #1f2328; --muted: #59636e;
  --link: #0969da; --chip: #ffffff; --chip-on: #0969da; --chip-on-text: #ffffff; --mark: #fff8c5;
  --focus: rgba(9,105,218,.3);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117; --panel: #151b23; --border: #3d444d; --text: #e6edf3; --muted: #9198a1;
    --link: #4493f8; --chip: #151b23; --chip-on: #1f6feb; --chip-on-text: #ffffff; --mark: rgba(187,128,9,.4);
    --focus: rgba(68,147,248,.35);
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Helvetica, Arial, sans-serif; }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: 980px; margin: 0 auto; padding: 0 16px; }
header { border-bottom: 1px solid var(--border); background: var(--panel); }
header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; padding-bottom: 14px; flex-wrap: wrap; }
.brand { font-size: 20px; font-weight: 600; }
.brand span { color: var(--muted); font-weight: 400; }
.top-links { display: flex; gap: 16px; font-size: 14px; }
.search { position: sticky; top: 0; z-index: 5; background: var(--bg); padding: 18px 0 10px; border-bottom: 1px solid var(--border); }
.box { position: relative; }
.box svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); fill: var(--muted); }
#q { width: 100%; font-size: 16px; padding: 10px 76px 10px 38px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg); color: var(--text); outline: none; }
#q:not(:placeholder-shown) + .kbd { display: none; }
#q:focus { border-color: var(--link); box-shadow: 0 0 0 3px var(--focus); }
.kbd { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--muted);
  border: 1px solid var(--border); border-radius: 4px; padding: 0 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip { border: 1px solid var(--border); background: var(--chip); color: var(--text); border-radius: 999px;
  padding: 3px 12px; font-size: 13px; cursor: pointer; }
.chip:hover { border-color: var(--link); }
.chip.on { background: var(--chip-on); border-color: var(--chip-on); color: var(--chip-on-text); }
.chips.sub .chip { font-size: 12px; padding: 2px 10px; }
.meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; color: var(--muted); font-size: 13px; }
.meta button { border: 0; background: none; color: var(--link); cursor: pointer; font-size: 13px; padding: 0; }
main { padding: 8px 0 48px; }
.folder { margin-top: 22px; }
.folder h2 { font-size: 13px; font-weight: 600; color: var(--muted); margin: 0 0 6px; letter-spacing: .02em; }
.folder h2 a { color: inherit; }
.item { display: block; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; color: var(--text); }
.item:hover { border-color: var(--link); text-decoration: none; background: var(--panel); }
.item .t { color: var(--link); font-weight: 600; font-size: 15px; }
.item .s { color: var(--muted); margin-top: 3px; font-size: 13px; }
.item .tags { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
.item .tag { font-size: 12px; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 0 8px; }
.item .hit { margin-top: 4px; font-size: 12px; color: var(--muted); }
.item .grp { font-size: 12px; color: var(--muted); margin-left: 6px; font-weight: 400; }
mark { background: var(--mark); color: inherit; border-radius: 2px; padding: 0 1px; }
.empty { text-align: center; color: var(--muted); padding: 64px 0; }
</style>
</head>
<body>
<header><div class="wrap">
  <div class="brand">Mindforge <span>Articles</span></div>
  <nav class="top-links"><a href="__REPO__">Repository</a><a href="__GRAPH__">Live Graph</a></nav>
</div></header>
<div class="wrap">
  <div class="search">
    <div class="box">
      <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06ZM11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"/></svg>
      <input id="q" type="search" placeholder="Search titles, tags, summaries and section headings…" autocomplete="off" autofocus>
      <span class="kbd">/</span>
    </div>
    <div id="rows"></div>
    <div class="meta"><span id="count"></span><button id="reset" hidden>Clear filters</button></div>
  </div>
  <main id="list"></main>
</div>
<script>
const DATA = __DATA__;
const items = DATA.items.map((it, i) => ({...it, i,
  hay: [it.title, it.group, it.folder, (it.tags||[]).join(' '), it.summary||'', (it.heads||[]).join(' ')].join(' \n ').toLowerCase()}));
const $ = s => document.querySelector(s);
const q = $('#q'), rows = $('#rows'), list = $('#list'), count = $('#count'), reset = $('#reset');
let folder = '';

// folder tree: path -> direct child paths, in README order
const children = {'': []};
for (const it of items) {
  const segs = it.folder.split('/');
  for (let k = 1; k <= segs.length; k++) {
    const p = segs.slice(0, k).join('/'), parent = segs.slice(0, k - 1).join('/');
    if (!children[p]) { children[p] = []; children[parent].push(p); }
  }
}
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const name = p => p.split('/').pop();

function readState() {
  const h = new URLSearchParams(location.hash.slice(1));
  q.value = h.get('q') || ''; folder = h.get('folder') || '';
  if (folder && !children[folder]) folder = '';
}
function writeState() {
  const h = new URLSearchParams();
  if (q.value.trim()) h.set('q', q.value.trim());
  if (folder) h.set('folder', folder);
  const s = h.toString();
  history.replaceState(null, '', s ? '#' + s : location.pathname);
}
function renderChips() {
  const levels = [''];
  if (folder) folder.split('/').forEach((_, k, a) => levels.push(a.slice(0, k + 1).join('/')));
  rows.innerHTML = levels.filter(p => children[p] && children[p].length).map((p, depth) => {
    const all = depth === 0 ? `<button class="chip ${folder ? '' : 'on'}" data-f="">All</button>` : '';
    return `<div class="chips ${depth ? 'sub' : ''}">${all}` + children[p].map(c =>
      `<button class="chip ${folder === c || folder.startsWith(c + '/') ? 'on' : ''}" data-f="${esc(c)}"
        title="${esc(DATA.folderDesc[c] || c)}">${esc(name(c))}</button>`).join('') + '</div>';
  }).join('');
}
function hl(text, terms) {
  let out = esc(text);
  for (const t of terms) {
    if (!t) continue;
    const re = new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, m => `<mark>${m}</mark>`);
  }
  return out;
}
function render() {
  const terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let res = items.filter(it => (!folder || it.folder === folder || it.folder.startsWith(folder + '/'))
                            && terms.every(t => it.hay.includes(t)));
  if (terms.length) {
    const score = it => terms.reduce((s, t) => s + (it.title.toLowerCase().includes(t) ? 10 : 0)
      + ((it.tags||[]).join(' ').toLowerCase().includes(t) ? 4 : 0) + (it.folder.toLowerCase().includes(t) ? 2 : 0), 0);
    res = res.map(it => [score(it), it]).sort((a, b) => b[0] - a[0] || a[1].i - b[1].i).map(x => x[1]);
  }
  count.textContent = `${res.length} of ${items.length} articles`;
  reset.hidden = !folder && !terms.length;
  if (!res.length) { list.innerHTML = `<div class="empty">No articles match. Try fewer words or another folder.</div>`; return; }
  const groups = new Map();
  for (const it of res) { if (!groups.has(it.folder)) groups.set(it.folder, []); groups.get(it.folder).push(it); }
  list.innerHTML = [...groups].map(([f, arr]) => `<section class="folder">
    <h2><a href="#folder=${encodeURIComponent(f)}" data-f="${esc(f)}">${esc(f.replace(/\//g, ' / '))}</a></h2>` +
    arr.map(it => {
      const head = terms.length && (it.heads||[]).find(h => terms.some(t => h.toLowerCase().includes(t)));
      return `<a class="item" href="${esc(it.url)}">
        <div class="t">${hl(it.title, terms)}${it.group ? `<span class="grp">${esc(it.group)}</span>` : ''}</div>
        ${it.summary ? `<div class="s">${hl(it.summary, terms)}</div>` : ''}
        ${head ? `<div class="hit">§ ${hl(head, terms)}</div>` : ''}
        ${(it.tags||[]).length ? `<div class="tags">${it.tags.slice(0, 8).map(t => `<span class="tag">${hl(t, terms)}</span>`).join('')}</div>` : ''}
      </a>`; }).join('') + '</section>').join('');
}
function update() { writeState(); renderChips(); render(); }

rows.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return;
  folder = folder === b.dataset.f && b.dataset.f ? b.dataset.f.split('/').slice(0, -1).join('/') : b.dataset.f; update(); });
list.addEventListener('click', e => { const a = e.target.closest('h2 [data-f]'); if (!a) return;
  e.preventDefault(); folder = a.dataset.f; update(); window.scrollTo({top: 0}); });
q.addEventListener('input', update);
reset.addEventListener('click', () => { q.value = ''; folder = ''; update(); q.focus(); });
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); q.select(); }
  if (e.key === 'Escape' && document.activeElement === q) { q.value = ''; update(); }
});
window.addEventListener('hashchange', () => { readState(); renderChips(); render(); });
readState(); renderChips(); render();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
