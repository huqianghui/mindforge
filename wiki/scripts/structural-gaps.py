#!/usr/bin/env python3
"""Wiki 结构缺口扫描：找出 wiki 内部的缺口（区别于 /knowledge-gap 的外部趋势对照）。

按四个角度组织：完备性（5 覆盖）、准确性（6 漂移、4 张力）、缺失性（1 名词、2 层级、3 验证）、引导性（7 路径）。
  1. 名词缺口：进 git 的文章里反复出现的 tag，wiki 里没有对应页（slug / title / alias 都不匹配）
  2. 层级缺口：没有任何 part-of / implements / extends 关联的页——平铺挂着、找不到上层概念
  3. 验证缺口：标着"未实测 / 设计推论 / 单一实现"或置信度 < 0.7 的 active Claim——下一批实验清单
  4. 张力缺口：Claim 正文自己写着"两种说法 / 一处说"的地方
  5. 覆盖缺口：进 git 的文章没有被任何 wiki 页引用——写了但没编译进知识库
  6. 漂移缺口：Claim 的来源文章在 Claim「最近更新」之后又改过——wiki 结论可能落后于文章
  7. 引导缺口：没有被任何学习路径（wiki/paths）引用的页，按 index 分类汇总——知识在，但没有入口

用法：python3 wiki/scripts/structural-gaps.py [--min-articles 3] [--section 1,2,3,4,5,6,7]
"""
import argparse
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTICLE_DIRS = ["Notes", "Azure", "paper", "book", "product"]
WIKI_DIRS = ["wiki/concepts", "wiki/methods", "wiki/decisions"]
HIER_RELS = ("part-of", "implements", "extends")
UNVERIFIED = re.compile(r"未实测|未做|没有做|设计推论|单一实现|单环境|未验证|待验证|尚未实测|未横向实测")
TENSION = re.compile(r"两种说法|一处说|说法不一")
# 太泛的 tag 不算概念候选
GENERIC_TAGS = {
    "ai", "agent", "azure", "llm", "series-index", "poc", "notes", "tool", "paper", "book", "wiki", "concept",
    "ai/agent", "paper-reading", "troubleshooting", "devops", "best-practice", "benchmark", "performance",
    "source-code", "visualization", "security", "networking", "animation", "3d", "cli",
}


def norm(s):
    return re.sub(r"[\s\-_·（）()]", "", s.lower())


def frontmatter(text):
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end > 0 else ""


def yaml_list(fm, key):
    m = re.search(rf"(?m)^{key}:\s*\n((?:\s+-\s.*\n?)+)", fm)
    if m:
        return [x.strip().strip('"\'') for x in re.findall(r"-\s+(.*)", m.group(1))]
    m = re.search(rf"(?m)^{key}:\s*\[(.*)\]", fm)
    return [x.strip().strip('"\'') for x in m.group(1).split(",")] if m else []


def load_wiki():
    pages = {}
    for d in WIKI_DIRS:
        for p in (ROOT / d).glob("*.md"):
            if p.name.startswith("_"):
                continue
            text = p.read_text(encoding="utf-8")
            fm = frontmatter(text)
            title = re.search(r'(?m)^title:\s*"?(.*?)"?\s*$', fm)
            names = {p.stem, title.group(1) if title else ""} | set(yaml_list(fm, "aliases"))
            pages[p.stem] = {"path": p, "text": text, "names": {norm(n) for n in names if n}}
    return pages


def load_articles():
    arts = []
    for d in ARTICLE_DIRS:
        for p in (ROOT / d).rglob("*.md"):
            text = p.read_text(encoding="utf-8", errors="ignore")
            arts.append((p, [t.lower() for t in yaml_list(frontmatter(text), "tags")]))
    return arts


def term_gaps(pages, arts, min_articles):
    known = set().union(*(v["names"] for v in pages.values()))
    cnt, where = Counter(), defaultdict(list)
    for p, tags in arts:
        for t in set(tags):
            if t not in GENERIC_TAGS:
                cnt[t] += 1
                where[t].append(p.stem)
    out = []
    for t, n in cnt.most_common():
        if n < min_articles:
            break
        nt = norm(t)
        if nt in known or any(nt in k or k in nt for k in known if len(k) >= 6 and len(nt) >= 6):
            continue
        out.append((t, n, where[t][:4]))
    return out


def relations(text):
    sec = text.split("## 关联概念", 1)
    if len(sec) < 2:
        return []
    body = sec[1].split("\n## ", 1)[0]
    return re.findall(r"^- \[\[([^\]|#]+)[^\]]*\]\] — `([a-z-]+)`", body, re.M)


def flat_pages(pages):
    incoming = defaultdict(set)
    for slug, v in pages.items():
        for tgt, rel in relations(v["text"]):
            if rel in HIER_RELS:
                incoming[tgt].add(slug)
    out = []
    for slug, v in pages.items():
        own = [r for _, r in relations(v["text"]) if r in HIER_RELS]
        if not own and not incoming[slug]:
            out.append((slug, len(relations(v["text"]))))
    return sorted(out, key=lambda x: x[1])


def claims(pages):
    for slug, v in pages.items():
        for block in re.split(r"(?m)^(?=### Claim: )", v["text"])[1:]:
            block = block.split("\n## ", 1)[0]
            title = block.split("\n", 1)[0][10:].strip()
            conf = re.search(r"\*\*置信度\*\*：([\d.]+)", block)
            status = re.search(r"\*\*状态\*\*：(\w+)", block)
            yield slug, title, float(conf.group(1)) if conf else None, status.group(1) if status else "", block


def article_index(arts):
    """文章 stem -> (路径, 最后一次实质修改的日期)。

    改标题、换链接这类一行换一行的提交不算实质修改：要求净增 ≥ 5 行，或增删合计 ≥ 40 行。
    """
    out = subprocess.run(["git", "-c", "core.quotePath=false", "-C", str(ROOT), "log", "--format=@%cs", "--numstat", "--", *ARTICLE_DIRS],
                         capture_output=True, text=True).stdout
    last, day = {}, None
    for line in out.splitlines():
        if line.startswith("@"):
            day = line[1:]
            continue
        parts = line.split("\t")
        if len(parts) != 3 or not parts[0].isdigit():
            continue
        path = re.sub(r"\{[^{}]* => ([^{}]*)\}", r"\1", parts[2]).split(" => ")[-1].replace("//", "/")
        add, dele = int(parts[0]), int(parts[1])
        if path not in last and (add - dele >= 5 or add + dele >= 40):
            last[path] = day
    return {p.stem: (p, last.get(str(p.relative_to(ROOT)))) for p, _ in arts}


def coverage(pages, idx):
    cited = set()
    for v in pages.values():
        cited |= {x.strip() for x in re.findall(r"\[\[([^\]|#]+)", v["text"])}
    miss = [p for stem, (p, _) in idx.items() if stem not in cited]
    return sorted(miss)


def drift(pages, idx):
    rows = []
    for slug, title, conf, status, block in claims(pages):
        if status != "active":
            continue
        upd = re.search(r"\*\*最近更新\*\*：(\d{4}-\d{2}-\d{2})", block)
        src = re.search(r"\*\*来源\*\*：(.*)", block)
        if not (upd and src):
            continue
        newer = [(s, idx[s][1]) for s in re.findall(r"\[\[([^\]|#]+)", src.group(1))
                 if s in idx and idx[s][1] and idx[s][1] > upd.group(1)]
        if newer:
            rows.append((slug, title, upd.group(1), newer))
    return rows


def guidance(pages):
    on_path = set()
    for p in (ROOT / "wiki/paths").glob("*.md"):
        on_path |= {x.strip() for x in re.findall(r"\[\[([^\]|#]+)", p.read_text(encoding="utf-8"))}
    cat, cur = {}, None
    for line in (ROOT / "wiki/index.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"### (.+)", line)
        if m:
            cur = m.group(1)
        m = re.match(r"- \[\[([^\]|]+)", line)
        if m and cur and m.group(1) in pages:
            cat.setdefault(m.group(1), cur)
    by = defaultdict(lambda: [0, []])
    for slug in pages:
        c = cat.get(slug, "(未入索引)")
        by[c][0] += 1
        if slug not in on_path:
            by[c][1].append(slug)
    return by


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-articles", type=int, default=3)
    ap.add_argument("--section", default="1,2,3,4,5,6,7")
    a = ap.parse_args()
    secs = set(a.section.split(","))
    pages, arts = load_wiki(), load_articles()

    if "1" in secs:
        rows = term_gaps(pages, arts, a.min_articles)
        print(f"## 1. 名词缺口（≥{a.min_articles} 篇文章的 tag，wiki 无对应页）：{len(rows)}\n")
        for t, n, ex in rows:
            print(f"- `{t}` — {n} 篇，如 {'、'.join(ex)}")
        print()
    if "2" in secs:
        rows = flat_pages(pages)
        print(f"## 2. 层级缺口（无 part-of / implements / extends 关联）：{len(rows)} / {len(pages)}\n")
        for slug, n in rows:
            print(f"- [[{slug}]] — 共 {n} 条关联")
        print()
    if "3" in secs or "4" in secs:
        unv, ten = defaultdict(list), defaultdict(list)
        for slug, title, conf, status, block in claims(pages):
            if status != "active":
                continue
            body = block.split("\n> ", 1)[-1]
            if UNVERIFIED.search(body) or (conf is not None and conf < 0.7):
                unv[slug].append((conf, title))
            if TENSION.search(body):
                ten[slug].append(title)
        if "3" in secs:
            print(f"## 3. 验证缺口（未实测 / 推论 / 置信度 < 0.7 的 active Claim）：{sum(map(len, unv.values()))}\n")
            for slug in sorted(unv, key=lambda s: -len(unv[s])):
                print(f"- [[{slug}]]（{len(unv[slug])}）")
                for conf, title in sorted(unv[slug], key=lambda x: x[0] or 0):
                    print(f"  - {conf} · {title[:80]}")
            print()
        if "4" in secs:
            print(f"## 4. 张力缺口（Claim 自述说法不一 / 矛盾）：{sum(map(len, ten.values()))}\n")
            for slug, ts in ten.items():
                for t in ts:
                    print(f"- [[{slug}]] · {t[:90]}")
            print()

    if secs & {"5", "6"}:
        idx = article_index(arts)
    if "5" in secs:
        rows = coverage(pages, idx)
        print(f"## 5. 覆盖缺口（进 git 的文章没有被任何 wiki 页引用）：{len(rows)} / {len(idx)}\n")
        for p in rows:
            print(f"- {p.relative_to(ROOT)}")
        print()
    if "6" in secs:
        rows = drift(pages, idx)
        print(f"## 6. 漂移缺口（来源文章在 Claim 最近更新之后又改过）：{len(rows)}\n")
        for slug, title, upd, newer in sorted(rows, key=lambda r: r[0]):
            print(f"- [[{slug}]] · {upd} · {title[:60]} ← " + "、".join(f"{s}（{d}）" for s, d in newer))
        print()
    if "7" in secs:
        by = guidance(pages)
        tot = sum(len(v[1]) for v in by.values())
        print(f"## 7. 引导缺口（不在任何学习路径上的页）：{tot} / {len(pages)}\n")
        for c, (n, miss) in sorted(by.items(), key=lambda x: -len(x[1][1]) / max(1, x[1][0])):
            if miss:
                print(f"- {c}：{len(miss)} / {n} 不在路径上 — {'、'.join(miss[:8])}{' …' if len(miss) > 8 else ''}")
        print()


if __name__ == "__main__":
    main()
