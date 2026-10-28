#!/usr/bin/env python3
"""Check knowledge-gap reports' front matter trends against topics.yml and existing wiki pages.

Usage: python3 wiki/visualizer/scripts/check-gap-trends.py [report.md ...]  (default: all reports)
Exit code 1 if any report has an unparsable front matter, unknown topic/priority/action/signal, or a missing node.
"""
import re
import sys
from pathlib import Path

import yaml

VAULT = Path(__file__).resolve().parents[3]
GAP_DIR = VAULT / "wiki/knowledge-gap"
RE_FRONTMATTER = re.compile(r"\A---\n(.*?\n)---\n", re.S)
PRIORITIES = {"high", "medium", "low"}
ACTIONS = {"deep", "page", "claim", "overview", "watch"}
SIGNALS = {"github", "arxiv", "hf", "introspection"}


def main(args: list) -> int:
    topics = (yaml.safe_load((GAP_DIR / "topics.yml").read_text(encoding="utf-8")) or {}).get("topics") or {}
    pages = {p.stem for d in ("concepts", "methods", "decisions") for p in (VAULT / "wiki" / d).glob("*.md")}
    reports = [Path(a) for a in args] or sorted(GAP_DIR.glob("*-gap-analysis.md"))
    errors = 0
    for f in reports:
        m = RE_FRONTMATTER.match(f.read_text(encoding="utf-8"))
        try:
            fm = (yaml.safe_load(m.group(1)) or {}) if m else {}
        except yaml.YAMLError as e:
            print(f"{f.name}: front matter does not parse: {e}")
            errors += 1
            continue
        trends = fm.get("trends") or []
        problems = []
        if not trends:
            problems.append("no trends")
        for t in trends:
            if t.get("topic") not in topics:
                problems.append(f"unknown topic {t.get('topic')!r} (add it to topics.yml or reuse a slug)")
            if t.get("priority") not in PRIORITIES:
                problems.append(f"bad priority {t.get('priority')!r}")
            if t.get("action") not in ACTIONS:
                problems.append(f"bad action {t.get('action')!r}")
            problems += [f"bad signal {s!r}" for s in t.get("signals") or [] if s not in SIGNALS]
            problems += [f"missing node {n!r}" for n in t.get("nodes") or [] if n not in pages]
        for p in problems:
            print(f"{f.name}: {p}")
        errors += len(problems)
        if not problems:
            print(f"{f.name}: {len(trends)} trends ok")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
