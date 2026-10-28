"""Build public/content/history.json from the mindforge git history.

Every date here is a git commit date (committer time), not a date written in
front matter, so the timeline reflects when things actually landed on GitHub.
Needs a full-history checkout; a blobless clone is enough because only
wiki-graph.json snapshots and the knowledge-gap reports are read as content.
"""

import json
import re
import subprocess
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

ARTICLE_ROOTS = ("Notes/", "Azure/", "paper/", "book/", "product/")
NODE_DIRS = {"wiki/concepts/": "concept", "wiki/methods/": "method", "wiki/decisions/": "decision"}
GAP_DIR = "wiki/knowledge-gap/"
GRAPH = "wiki/wiki-graph.json"
RE_ITEM = re.compile(r"^\s{0,3}\d+\.\s+(.+)$")
RE_BOLD = re.compile(r"\*\*(.+?)\*\*")
RE_SLUG = re.compile(r"`(?:wiki/(?:concepts|methods|decisions)/)?([a-z0-9][a-z0-9-]{2,})(?:\.md)?`")
RE_PRIORITY = re.compile(r"🔴|🟡|🟢")


def git(vault: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "core.quotepath=off", *args], cwd=vault, capture_output=True, check=True, text=True
    ).stdout


def file_history(vault: Path) -> tuple[dict, dict, list]:
    """First commit date and edit count per current path, following renames."""
    log = git(vault, "log", "--format=@%cI", "--name-status", "-M50%")
    canon, first, edits, commit_days = {}, {}, Counter(), []

    def resolve(p: str) -> str:
        while p in canon:
            p = canon[p]
        return p

    day = None
    # log is newest first: a rename "old -> new" means older entries for old belong to new
    for line in log.splitlines():
        if line.startswith("@"):
            day = line[1:11]
            commit_days.append(day)
            continue
        if not line.strip():
            continue
        parts = line.split("\t")
        if parts[0].startswith("R"):
            key = resolve(parts[2])
            canon[parts[1]] = key
        else:
            key = resolve(parts[-1])
        edits[key] += 1
        first[key] = day
    return first, edits, commit_days


def monday(d: str) -> date:
    x = date.fromisoformat(d)
    return x - timedelta(days=x.weekday())


def weekly_series(first: dict, commit_days: list, articles: list, nodes: dict) -> list:
    start, end = monday(min(commit_days)), monday(max(commit_days))
    commits = Counter(monday(d) for d in commit_days)
    added_articles = Counter(monday(first[p]) for p in articles)
    added_nodes = {t: Counter(monday(first[p]) for p, tt in nodes.items() if tt == t) for t in NODE_DIRS.values()}
    weeks, totals, w = [], Counter(), start
    while w <= end:
        totals["articles"] += added_articles[w]
        for t in NODE_DIRS.values():
            totals[t] += added_nodes[t][w]
        weeks.append({
            "week": w.isoformat(),
            "commits": commits[w],
            "articlesAdded": added_articles[w],
            "nodesAdded": sum(added_nodes[t][w] for t in NODE_DIRS.values()),
            "articles": totals["articles"],
            "concepts": totals["concept"],
            "methods": totals["method"],
            "decisions": totals["decision"],
        })
        w += timedelta(days=7)
    return weeks


def graph_snapshots(vault: Path) -> list:
    """One wiki-graph.json per week: the last commit that touched it in that week."""
    picked = {}
    for line in git(vault, "log", "--format=%H %cI", "--", GRAPH).splitlines():
        sha, when = line.split()
        picked.setdefault(monday(when[:10]), (sha, when[:10]))  # newest first, keep the latest per week
    points = []
    for w in sorted(picked):
        sha, day = picked[w]
        try:
            g = json.loads(git(vault, "show", f"{sha}:{GRAPH}"))
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            continue
        claims = [c for n in g["nodes"] for c in n.get("claims", [])]
        types = Counter(n.get("type") for n in g["nodes"])
        points.append({
            "date": day,
            "commit": sha[:7],
            "concepts": types["concept"],
            "methods": types["method"],
            "decisions": types["decision"],
            "links": len(g.get("links", [])),
            "claims": len(claims),
            "active": sum(c.get("status") == "active" for c in claims),
            "stale": sum(c.get("status") == "stale" for c in claims),
            "lowConfidence": sum(c.get("confidence", 1) < 0.6 for c in claims),
            "avgConfidence": round(sum(c.get("confidence", 0) for c in claims) / len(claims), 3) if claims else 0,
            "categories": {c["name"]: len(c.get("members", [])) for c in g.get("categories", [])},
        })
    return points


def suggestions(text: str, node_first: dict, report_day: str) -> list:
    """Numbered items under the report's 建议 / 行动 sections, with whether a page they name landed later.

    Early reports have no such section and put their recommendations under 趋势综合 instead.
    """
    sections = [s.partition("\n") for s in re.split(r"^## ", text, flags=re.M)[1:]]
    picked = [body for heading, _, body in sections if re.search(r"建议|行动", heading)]
    picked = picked or [body for heading, _, body in sections if "趋势综合" in heading]
    out = []
    for body in picked:
        for line in body.splitlines():
            m = RE_ITEM.match(line)
            if not m:
                continue
            item = m.group(1)
            bold = RE_BOLD.search(item)
            title = (bold.group(1) if bold else re.split(r"（|——|：|\(", item)[0]).replace("`", "").strip()
            title = RE_PRIORITY.sub("", title).strip()
            landed = []
            for slug in dict.fromkeys(RE_SLUG.findall(item)):
                created = node_first.get(slug)
                # strictly after: a page committed together with the report already existed
                if created and created > report_day:
                    landed.append({"node": slug, "date": created})
            prio = RE_PRIORITY.search(item)
            out.append({
                "title": title[:80],
                "priority": {"🔴": "high", "🟡": "medium", "🟢": "low"}.get(prio.group(0)) if prio else None,
                "carried": bool(re.search(r"沿袭|连续第|上期", item)),
                "landed": landed,
            })
    return out


def gap_reports(vault: Path, first: dict, nodes: dict) -> list:
    node_first = {Path(p).stem: first[p] for p in nodes}
    reports = []
    for path in sorted(p for p in first if p.startswith(GAP_DIR) and p.endswith(".md")):
        f = vault / path
        if not f.exists():
            continue
        text = f.read_text(encoding="utf-8")
        day = first[path]
        h1 = re.search(r"^#\s+(.+)$", text, re.M)
        reports.append({
            "path": path,
            "date": day,
            "title": h1.group(1).strip() if h1 else Path(path).stem,
            "suggestions": suggestions(text, node_first, day),
        })
    return reports


def build(vault: Path, doc_paths: list, out: Path) -> None:
    first, edits, commit_days = file_history(vault)
    articles = [p for p in doc_paths if p.startswith(ARTICLE_ROOTS) and p in first]
    nodes = {p: t for p in doc_paths for d, t in NODE_DIRS.items() if p.startswith(d) and p in first}
    graph = graph_snapshots(vault)
    gaps = gap_reports(vault, first, nodes)
    history = {
        "firstCommit": min(commit_days),
        "lastCommit": max(commit_days),
        "totals": {
            "commits": len(commit_days),
            "activeDays": len(set(commit_days)),
            "articles": len(articles),
            "nodes": len(nodes),
            "gapReports": len(gaps),
        },
        "weeks": weekly_series(first, commit_days, articles, nodes),
        # [day, commits] for days with at least one commit, oldest first
        "days": sorted(Counter(commit_days).items()),
        "graph": graph,
        "gaps": gaps,
        # path -> [first commit date, number of commits touching it]
        "docs": {p: [first[p], edits[p]] for p in doc_paths if p in first},
    }
    out.write_text(json.dumps(history, ensure_ascii=False), encoding="utf-8")
    print(f"history: {len(commit_days)} commits, {len(graph)} graph snapshots, {len(gaps)} gap reports -> {out}")
