#!/usr/bin/env python3
"""Export wiki knowledge graph to JSON for visualization.

Scans wiki/concepts/, wiki/methods/, wiki/decisions/ and produces
wiki-graph.json with nodes, links, and category groupings.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

# --- Constants ---

WIKI_ROOT = Path(__file__).resolve().parent.parent
VAULT_ROOT = WIKI_ROOT.parent
CONCEPTS_DIR = WIKI_ROOT / "concepts"
METHODS_DIR = WIKI_ROOT / "methods"
DECISIONS_DIR = WIKI_ROOT / "decisions"
INDEX_FILE = WIKI_ROOT / "index.md"
OUTPUT_FILE = WIKI_ROOT / "wiki-graph.json"
README_FILE = VAULT_ROOT / "README.md"

# Vault content dirs counted for the README overview table.
ARTICLE_DIRS = ["Notes", "paper", "book", "product", "Azure"]
JOURNAL_DIR = "daily-work-item"

VALID_RELATION_TYPES = {
    "implements", "grounds", "extends", "constrains",
    "contrasts", "part-of", "uses", "produces", "addresses",
}

# --- Regex patterns ---

RE_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
RE_CLAIM_HEADING = re.compile(r"^### Claim:\s*(.+)$")
RE_CLAIM_SOURCE = re.compile(r"^-\s*\*\*\u6765\u6e90\*\*\uff1a\[\[(.+?)\]\]")
RE_CLAIM_FIRST_SEEN = re.compile(r"^-\s*\*\*\u9996\u6b21\u51fa\u73b0\*\*\uff1a(\d{4}-\d{2}-\d{2})")
RE_CLAIM_LAST_UPDATED = re.compile(r"^-\s*\*\*\u6700\u8fd1\u66f4\u65b0\*\*\uff1a(\d{4}-\d{2}-\d{2})")
RE_CLAIM_CONFIDENCE = re.compile(r"^-\s*\*\*\u7f6e\u4fe1\u5ea6\*\*\uff1a(\d+\.?\d*)")
RE_CLAIM_STATUS = re.compile(r"^-\s*\*\*\u72b6\u6001\*\*\uff1a(active|conflicting|outdated|stale)")
RE_TYPED_RELATION = re.compile(r"^-\s*\[\[(.+?)\]\]\s*\u2014\s*`([a-z-]+)`\s*(.+)$")
RE_UNTYPED_RELATION = re.compile(r"^-\s*\[\[(.+?)\]\]\s*\u2014\s*([^`].+)$")
RE_WIKILINK = re.compile(r"\[\[(.+?)\]\]")
RE_SUMMARY_SECTION = re.compile(r"^##\s*\u6458\u8981\s*$")
RE_H2 = re.compile(r"^##\s+(.+)$")


# --- Parsing ---

def parse_frontmatter(content: str) -> dict:
    m = RE_FRONTMATTER.match(content)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def extract_summary(content: str) -> str:
    lines = content.split("\n")
    in_summary = False
    summary_lines = []
    for line in lines:
        if RE_SUMMARY_SECTION.match(line):
            in_summary = True
            continue
        if in_summary:
            if RE_H2.match(line):
                break
            summary_lines.append(line)
    return "\n".join(summary_lines).strip()


def extract_claims(content: str) -> list[dict]:
    lines = content.split("\n")
    claims = []
    i = 0
    while i < len(lines):
        m = RE_CLAIM_HEADING.match(lines[i])
        if m:
            claim = {
                "statement": m.group(1).strip(),
                "source": "",
                "first_seen": "",
                "last_updated": "",
                "confidence": 0.0,
                "status": "active",
                "evidence": "",
            }
            i += 1
            # Parse metadata lines
            while i < len(lines):
                line = lines[i]
                if (sm := RE_CLAIM_SOURCE.match(line)):
                    claim["source"] = sm.group(1)
                elif (sm := RE_CLAIM_FIRST_SEEN.match(line)):
                    claim["first_seen"] = sm.group(1)
                elif (sm := RE_CLAIM_LAST_UPDATED.match(line)):
                    claim["last_updated"] = sm.group(1)
                elif (sm := RE_CLAIM_CONFIDENCE.match(line)):
                    claim["confidence"] = float(sm.group(1))
                elif (sm := RE_CLAIM_STATUS.match(line)):
                    claim["status"] = sm.group(1)
                elif line.startswith(">"):
                    # Collect evidence blockquote
                    ev_lines = []
                    while i < len(lines) and lines[i].startswith(">"):
                        ev_lines.append(lines[i].lstrip("> "))
                        i += 1
                    claim["evidence"] = " ".join(ev_lines).strip()
                    break
                elif line.strip() == "":
                    pass  # skip blank lines
                elif RE_CLAIM_HEADING.match(line) or RE_H2.match(line):
                    break  # next claim or section
                i += 1
            claims.append(claim)
        else:
            i += 1
    return claims


def extract_relations(content: str) -> list[dict]:
    """Extract relation links from body text (not frontmatter)."""
    lines = content.split("\n")
    relations = []
    in_relation_section = False

    for line in lines:
        h2 = RE_H2.match(line)
        if h2:
            heading = h2.group(1).strip()
            in_relation_section = heading in (
                "关联概念", "关联方法",
            )
            continue

        if not in_relation_section:
            continue

        # Try typed first
        m = RE_TYPED_RELATION.match(line)
        if m:
            relations.append({
                "target": m.group(1),
                "relation_type": m.group(2) if m.group(2) in VALID_RELATION_TYPES else "untyped",
                "description": m.group(3).strip(),
            })
            continue

        # Try untyped
        m = RE_UNTYPED_RELATION.match(line)
        if m:
            relations.append({
                "target": m.group(1),
                "relation_type": "untyped",
                "description": m.group(2).strip(),
            })

    return relations


def extract_frontmatter_relations(fm: dict) -> list[str]:
    """Extract related page ids from frontmatter fields."""
    targets = []
    for field in ("related", "related_concepts", "related_methods"):
        items = fm.get(field, []) or []
        for item in items:
            m = RE_WIKILINK.search(str(item))
            if m:
                targets.append(m.group(1))
    return targets


def parse_page(filepath: Path, page_type: str) -> dict:
    content = filepath.read_text(encoding="utf-8")
    fm = parse_frontmatter(content)
    page_id = filepath.stem

    claims = extract_claims(content)
    confidences = [c["confidence"] for c in claims if c["confidence"] > 0]

    node = {
        "id": page_id,
        "type": page_type,
        "title": fm.get("title", page_id),
        "summary": extract_summary(content),
        "tags": fm.get("tags", []) or [],
        "category": "",  # filled later
        "method_type": fm.get("method_type"),
        "decision_status": fm.get("decision_status"),
        "claims_count": len(claims),
        "avg_confidence": round(sum(confidences) / len(confidences), 2) if confidences else 0.0,
        "claims": claims,
    }

    # Extract relations from body
    body_relations = extract_relations(content)

    # Also add frontmatter relations not already in body
    body_targets = {r["target"] for r in body_relations}
    for target in extract_frontmatter_relations(fm):
        if target not in body_targets:
            body_relations.append({
                "target": target,
                "relation_type": "untyped",
                "description": "",
            })

    links = [
        {
            "source": page_id,
            "target": r["target"],
            "relation_type": r["relation_type"],
            "description": r["description"],
        }
        for r in body_relations
    ]

    return node, links


# --- Category parsing from index.md ---

def parse_categories(index_path: Path) -> list[dict]:
    if not index_path.exists():
        return []
    content = index_path.read_text(encoding="utf-8")
    lines = content.split("\n")
    categories = []
    current_cat = None
    in_concept_index = False

    for line in lines:
        # Detect H2 "概念索引" section
        h2 = RE_H2.match(line)
        if h2:
            heading = h2.group(1).strip()
            if heading == "概念索引":
                in_concept_index = True
                continue
            elif heading in ("方法索引", "决策索引", "导航", "知识工作流", "Schema 说明"):
                in_concept_index = False
                continue

        if not in_concept_index:
            continue

        # H3 = category name
        h3 = re.match(r"^###\s+(.+)$", line)
        if h3:
            current_cat = {
                "id": re.sub(r"[^a-z0-9]+", "-", h3.group(1).lower().strip()).strip("-"),
                "name": h3.group(1).strip(),
                "members": [],
            }
            categories.append(current_cat)
            continue

        # Wikilink member line
        if current_cat:
            m = RE_WIKILINK.search(line)
            if m:
                current_cat["members"].append(m.group(1))

    return categories


# --- README stats table ---

RE_STATS_BLOCK = re.compile(
    r"<!-- STATS:START.*?-->.*?<!-- STATS:END -->", re.DOTALL
)


def count_md(dir_name: str) -> int:
    d = VAULT_ROOT / dir_name
    if not d.exists():
        return 0
    return sum(1 for _ in d.rglob("*.md"))


def update_readme_stats(nodes: list[dict], stats: dict) -> None:
    """Rewrite the auto-generated stats block between STATS markers in README."""
    if not README_FILE.exists():
        print(f"Warning: {README_FILE} not found, skipping README stats update",
              file=sys.stderr)
        return

    content = README_FILE.read_text(encoding="utf-8")
    if not RE_STATS_BLOCK.search(content):
        print("Warning: STATS markers not found in README, skipping stats update",
              file=sys.stderr)
        return

    article_counts = {d: count_md(d) for d in ARTICLE_DIRS}
    article_total = sum(article_counts.values())
    journals = count_md(JOURNAL_DIR)
    concepts = sum(1 for n in nodes if n["type"] == "concept")
    methods = sum(1 for n in nodes if n["type"] == "method")
    decisions = sum(1 for n in nodes if n["type"] == "decision")
    breakdown = " / ".join(f"{d} {article_counts[d]}" for d in ARTICLE_DIRS)
    today = datetime.now().strftime("%Y-%m-%d")

    block = (
        "<!-- STATS:START (auto-generated by wiki/scripts/export-graph.py — do not edit by hand) -->\n"
        "| 维度 | 数量 |\n"
        "|------|------|\n"
        f"| 文章与笔记 | {article_total}（{breakdown}） |\n"
        f"| 日记 | {journals} |\n"
        f"| Wiki 页面 | {concepts} concepts + {methods} methods + {decisions} decisions |\n"
        f"| Claims（带证据的论断） | {stats['claims']} |\n"
        f"| 知识图谱 | {stats['nodes']} 节点 / {stats['links']} 关系 / {len(VALID_RELATION_TYPES)} 种关系类型 |\n"
        "\n"
        f"> 统计由 `wiki/scripts/export-graph.py` 自动生成，更新于 {today}。\n"
        "<!-- STATS:END -->"
    )

    new_content = RE_STATS_BLOCK.sub(lambda _: block, content, count=1)
    if new_content != content:
        README_FILE.write_text(new_content, encoding="utf-8")
        print(f"Updated README stats table ({README_FILE})")
    else:
        print("README stats table already up to date")


# --- Main ---

def main():
    all_nodes = []
    all_links = []

    # Parse pages
    for dirpath, page_type in [
        (CONCEPTS_DIR, "concept"),
        (METHODS_DIR, "method"),
        (DECISIONS_DIR, "decision"),
    ]:
        if not dirpath.exists():
            continue
        for f in sorted(dirpath.glob("*.md")):
            if f.name.startswith("_"):
                continue
            try:
                node, links = parse_page(f, page_type)
                all_nodes.append(node)
                all_links.extend(links)
            except Exception as e:
                print(f"Warning: failed to parse {f}: {e}", file=sys.stderr)

    # Suppress untyped edges when a typed edge already connects the pair (either
    # direction). Frontmatter `related` fields and bare body links generate untyped
    # edges; a typed relation between the same two pages supersedes them. This prevents
    # phantom reverse/duplicate edges (typed one side + untyped mirror the other side).
    typed_pairs = {
        frozenset((l["source"], l["target"]))
        for l in all_links
        if l["relation_type"] != "untyped"
    }
    all_links = [
        l
        for l in all_links
        if l["relation_type"] != "untyped"
        or frozenset((l["source"], l["target"])) not in typed_pairs
    ]

    # Parse categories and assign to nodes
    categories = parse_categories(INDEX_FILE)
    cat_lookup = {}
    for cat in categories:
        for member in cat["members"]:
            cat_lookup[member] = cat["name"]

    for node in all_nodes:
        node["category"] = cat_lookup.get(node["id"], "")

    # Validate links: only keep links whose target exists as a node
    node_ids = {n["id"] for n in all_nodes}
    valid_links = [l for l in all_links if l["target"] in node_ids]
    orphan_links = len(all_links) - len(valid_links)

    # Build output
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "nodes": len(all_nodes),
            "links": len(valid_links),
            "orphan_links_removed": orphan_links,
            "claims": sum(n["claims_count"] for n in all_nodes),
            "categories": len(categories),
        },
        "nodes": all_nodes,
        "links": valid_links,
        "categories": categories,
    }

    OUTPUT_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Sync the README overview table with the freshly computed stats
    update_readme_stats(all_nodes, output["stats"])

    # Print summary
    print(f"Exported wiki graph to {OUTPUT_FILE}")
    print(f"  Nodes: {len(all_nodes)} (concepts: {sum(1 for n in all_nodes if n['type']=='concept')}, "
          f"methods: {sum(1 for n in all_nodes if n['type']=='method')}, "
          f"decisions: {sum(1 for n in all_nodes if n['type']=='decision')})")
    print(f"  Links: {len(valid_links)} ({orphan_links} orphan links removed)")
    print(f"  Claims: {sum(n['claims_count'] for n in all_nodes)}")
    print(f"  Categories: {len(categories)}")


if __name__ == "__main__":
    main()
