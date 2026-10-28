"""Build public/content/stats.json: word counts, tags, series and link health.

Computed once at sync time so the app never has to fetch every article.
Link resolution follows the article reader (src/docs/DocView.tsx): relative
links resolve against the document's folder, wikilinks resolve by file stem.
"""

import json
import posixpath
import re
import urllib.parse
from collections import defaultdict
from pathlib import Path

RE_FM = re.compile(r"\A---\n(.*?)\n---\n?", re.S)
RE_CODE = re.compile(r"```.*?```|~~~.*?~~~", re.S)
RE_INLINE_CODE = re.compile(r"`[^`\n]*`")
RE_HTML = re.compile(r"<[^>]+>")
RE_LINK = re.compile(r"(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
RE_WIKI = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
RE_CJK = re.compile(r"[㐀-䶿一-鿿豈-﫿]")
RE_WORD = re.compile(r"[A-Za-z0-9]+(?:[.'\-][A-Za-z0-9]+)*")
RE_SERIES = re.compile(r"^(.*?)[-_ ]?系列\s*0*(\d+)")
# 指向日记（[[2026-10-20-周二]]）的链接：日记不公开、不在 git 里，算"私有"而不是坏链
RE_DIARY = re.compile(r"^\d{4}-\d{2}-\d{2}")


def front_matter(text: str) -> tuple[str, str]:
    m = RE_FM.match(text)
    return (m.group(1), text[m.end():]) if m else ("", text)


def tags_of(fm: str) -> list[str]:
    inline = re.search(r"^tags:\s*\[(.*?)\]\s*$", fm, re.M)
    if inline:
        items = inline.group(1).split(",")
    else:
        block = re.search(r"^tags:\s*\n((?:\s+-\s.*\n?)+)", fm, re.M)
        items = re.findall(r"^\s+-\s*(.+)$", block.group(1), re.M) if block else []
    return [t.strip().strip("'\"") for t in items if t.strip()]


def word_count(body: str) -> int:
    """中文按字、英文按词计，去掉代码块、行内代码、HTML 标签与链接地址。"""
    text = RE_CODE.sub(" ", body)
    text = RE_INLINE_CODE.sub(" ", text)
    text = RE_HTML.sub(" ", text)
    text = RE_LINK.sub(" ", text)
    return len(RE_CJK.findall(text)) + len(RE_WORD.findall(RE_CJK.sub(" ", text)))


def build(vault: Path, doc_paths: list[str], tracked: set[str], out: Path) -> None:
    tracked_dirs = {posixpath.dirname(p) for p in tracked}
    for d in list(tracked_dirs):
        while d:
            d = posixpath.dirname(d)
            tracked_dirs.add(d)
    # wikilink 可以指 Markdown（按文件名，不带 .md）也可以指附件（带扩展名，如 [[架构图.png]]）
    wiki_names = {Path(p).stem for p in tracked if p.endswith(".md")} | {posixpath.basename(p) for p in tracked}

    docs, series = {}, defaultdict(list)
    for path in doc_paths:
        fm, body = front_matter((vault / path).read_text(encoding="utf-8"))
        internal, external, private, broken = 0, 0, 0, []
        # 代码块与行内代码里的链接多是语法示例，不算；_ 开头的模板文件里是占位符，不检查
        scan = "" if Path(path).name.startswith("_") else RE_INLINE_CODE.sub(" ", RE_CODE.sub(" ", body))
        for m in RE_LINK.finditer(scan):
            if m.group(1):  # 图片由同步脚本单独处理
                continue
            href = m.group(2)
            if href.startswith(("http://", "https://", "mailto:")):
                external += 1
                continue
            if href.startswith("#"):
                continue
            ref = urllib.parse.unquote(href.split("#")[0])
            target = posixpath.normpath(posixpath.join(posixpath.dirname(path), ref)) if ref else path
            internal += 1
            if target not in tracked and target not in tracked_dirs:
                broken.append(ref)
        for m in RE_WIKI.finditer(scan):
            internal += 1
            name = m.group(1).strip()
            if name in wiki_names:
                continue
            if RE_DIARY.match(name):
                private += 1
            else:
                broken.append(f"[[{name}]]")
        docs[path] = {
            "words": word_count(body),
            "tags": tags_of(fm),
            "links": {"internal": internal, "external": external, "private": private, "broken": sorted(set(broken))},
        }
        sm = RE_SERIES.match(Path(path).stem)
        if sm:
            series[(posixpath.dirname(path), sm.group(1) or posixpath.basename(posixpath.dirname(path)))].append((int(sm.group(2)), path))

    series_out = []
    for (folder, name), items in sorted(series.items(), key=lambda kv: -len(kv[1])):
        nums = sorted({n for n, _ in items})
        start = 0 if nums[0] == 0 else 1
        missing = [n for n in range(start, nums[-1] + 1) if n not in nums]
        series_out.append({
            "name": name.replace("-", " "),
            "folder": folder,
            "numbers": nums,
            "missing": missing,
            "docs": [p for _, p in sorted(items)],
        })

    out.write_text(json.dumps({"docs": docs, "series": series_out}, ensure_ascii=False), encoding="utf-8")
    words = sum(d["words"] for d in docs.values())
    broken_n = sum(len(d["links"]["broken"]) for d in docs.values())
    print(f"stats: {words} words, {len(series_out)} series, {broken_n} broken links -> {out}")
