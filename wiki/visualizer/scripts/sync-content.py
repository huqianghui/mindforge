#!/usr/bin/env python3
"""Copy the published Mindforge content into public/content for the GitHub Pages app.

The source is this repository itself (the visualizer lives in wiki/visualizer),
so the site always mirrors what is committed. Only files tracked by git are
considered. Files are stored under hashed names to keep URLs ASCII-only;
manifest.json maps repository paths to them. history.py needs full git history,
so CI checks out with fetch-depth: 0.

Usage: python3 wiki/visualizer/scripts/sync-content.py [vault-checkout]
       (without an argument, uses the repository this script lives in)
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import history
import stats

DOC_ROOTS = ("Notes/", "Azure/", "paper/", "book/", "product/", "wiki/")
IMG_EXT = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")
RE_IMG_MD = re.compile(r"!\[[^\]]*\]\(([^)\s]+)")
RE_IMG_HTML = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", re.I)
RE_TITLE = re.compile(r"^title:\s*(.+?)\s*$", re.M)
RE_H1 = re.compile(r"^#\s+(.+?)\s*$", re.M)

APP_ROOT = Path(__file__).resolve().parent.parent
VAULT_ROOT = APP_ROOT.parent.parent
OUT = APP_ROOT / "public" / "content"


def key(path: str) -> str:
    return hashlib.sha1(path.encode("utf-8")).hexdigest()[:12]


def title_of(text: str, path: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---", 3)
        m = RE_TITLE.search(text[:end]) if end > 0 else None
        if m:
            return m.group(1).strip("'\"")
    m = RE_H1.search(text)
    return m.group(1) if m else Path(path).stem


def git(*args: str, cwd: Path | None = None) -> str:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, check=True, text=True).stdout.strip()


def main() -> None:
    vault = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else VAULT_ROOT
    commit = git("rev-parse", "--short", "HEAD", cwd=vault)
    tracked = subprocess.run(
        ["git", "-C", str(vault), "ls-files", "-z"], capture_output=True, check=True
    ).stdout.decode("utf-8").split("\0")
    tracked_set = set(tracked)
    docs = sorted(
        f for f in tracked if f.endswith(".md") and (f == "README.md" or f.startswith(DOC_ROOTS))
    )

    shutil.rmtree(OUT, ignore_errors=True)
    (OUT / "d").mkdir(parents=True)
    (OUT / "i").mkdir()

    doc_entries, assets = [], {}
    for path in docs:
        text = (vault / path).read_text(encoding="utf-8")
        file = f"d/{key(path)}.md"
        (OUT / file).write_text(text, encoding="utf-8")
        doc_entries.append({"path": path, "title": title_of(text, path), "file": file})
        for m in list(RE_IMG_MD.finditer(text)) + list(RE_IMG_HTML.finditer(text)):
            ref = m.group(1)
            if ref.startswith(("http://", "https://", "data:")):
                continue
            img = os.path.normpath(os.path.join(os.path.dirname(path), urllib.parse.unquote(ref.split("#")[0])))
            if img in tracked_set and img.lower().endswith(IMG_EXT) and img not in assets:
                file_i = f"i/{key(img)}{Path(img).suffix.lower()}"
                shutil.copyfile(vault / img, OUT / file_i)
                assets[img] = file_i

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sourceCommit": commit,
        "docs": doc_entries,
        "assets": assets,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    graph_src, graph_dst = vault / "wiki" / "wiki-graph.json", APP_ROOT / "public" / "wiki-graph.json"
    # 本地 public/wiki-graph.json 是指向 wiki/wiki-graph.json 的软链接，已是同一个文件时不用拷
    if not (graph_dst.exists() and graph_dst.resolve() == graph_src.resolve()):
        graph_dst.unlink(missing_ok=True)
        shutil.copyfile(graph_src, graph_dst)
    history.build(vault, docs, OUT / "history.json")
    stats.build(vault, docs, tracked_set, OUT / "stats.json")
    size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"{len(doc_entries)} docs, {len(assets)} images, {size // 1024} KB from mindforge@{commit} -> {OUT}")


if __name__ == "__main__":
    main()
