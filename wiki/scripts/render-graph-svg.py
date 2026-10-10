#!/usr/bin/env python3
"""Render wiki-graph.json as an animated "camera tour" SVG for the README.

Communities (categories) are packed as circles and nodes are laid out inside
them. A SMIL viewBox animation acts as the camera: overview -> push in on the
largest community -> pull back and follow a real shortest path (node by node,
edge by edge) to the next community -> push in -> ... -> back to overview.

No data counts are printed, so the picture never goes stale between re-runs.

Usage: python3 wiki/scripts/render-graph-svg.py [output.svg]
"""

import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from xml.sax.saxutils import escape

import networkx as nx

WIKI_ROOT = Path(__file__).resolve().parent.parent
VAULT_ROOT = WIKI_ROOT.parent
GRAPH_FILE = WIKI_ROOT / "wiki-graph.json"
DEFAULT_OUT = VAULT_ROOT / "asset" / "wiki-knowledge-graph-2026-10-10.svg"

W, H = 1640, 1170
GX0, GY0, GX1, GY1 = 30, 110, 1610, 940  # graph viewport (screen == world at overview)
GW, GH = GX1 - GX0, GY1 - GY0
SEED = 7
TOUR_SIZE = 4          # how many of the largest communities the camera visits
SCREEN_FS = 16         # on-screen font size of zoomed-in labels

# camera timeline (seconds)
T_OVER, T_ZOOM, T_HOLD, T_EASE, T_OUT, T_END = 3.0, 1.6, 3.6, 0.9, 2.0, 2.0
TRAVEL_SPEED = 170     # world px per second while following a path

COMMUNITY_COLORS = [
    "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#22d3ee", "#fb923c",
    "#f87171", "#a3e635", "#2dd4bf", "#e879f9", "#facc15", "#94a3b8",
]
RELATION_COLORS = {
    "implements": "#E74C3C", "grounds": "#9B59B6", "extends": "#3498DB",
    "constrains": "#E67E22", "contrasts": "#1ABC9C", "part-of": "#F39C12",
    "uses": "#2ECC71", "produces": "#B07CD8", "addresses": "#16A085",
}
RELATION_LABELS = {
    "implements": "实现", "grounds": "基础", "extends": "扩展", "constrains": "约束",
    "contrasts": "对比", "part-of": "部分", "uses": "使用", "produces": "产出",
    "addresses": "解决",
}
FONT = "PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
EASE, LINEAR = "0.45 0 0.25 1", "0 0 1 1"


def text_width(s, fs):
    return sum(fs * (1.0 if ord(ch) > 0x2E80 else 0.58) for ch in s)


def short_title(t):
    t = re.split(r"（| \(", t)[0].strip()
    return t if len(t) <= 22 else t[:21] + "…"


def rects_overlap(a, b, pad=3):
    return not (a[2] + pad < b[0] or b[2] + pad < a[0] or a[3] + pad < b[1] or b[3] + pad < a[1])


def load():
    d = json.loads(GRAPH_FILE.read_text(encoding="utf-8"))
    nodes = {n["id"]: n for n in d["nodes"]}
    links = [l for l in d["links"] if l["source"] in nodes and l["target"] in nodes]
    cats = [c for c in d["categories"] if c["members"]]
    return nodes, links, cats


def assign_communities(nodes, links, cats):
    comm = {}
    for i, c in enumerate(cats):
        for m in c["members"]:
            if m in nodes:
                comm[m] = i
    adj = defaultdict(list)
    for l in links:
        adj[l["source"]].append(l["target"])
        adj[l["target"]].append(l["source"])
    # Uncategorized pages join the community most of their neighbours belong to.
    for _ in range(3):
        for nid in nodes:
            if nid in comm:
                continue
            votes = Counter(comm[x] for x in adj[nid] if x in comm)
            if votes:
                comm[nid] = votes.most_common(1)[0][0]
    for nid in nodes:
        comm.setdefault(nid, len(cats) - 1)
    return comm


def layout(nodes, links, comm, ncomm, radius_of):
    sizes = Counter(comm.values())
    scale = math.sqrt(0.30 * GW * GH / (math.pi * sum(sizes.values())))
    rc = {c: max(38, scale * math.sqrt(sizes[c])) for c in range(ncomm)}

    # Community-level spring layout, then push apart until circles don't overlap.
    cg = nx.Graph()
    cg.add_nodes_from(range(ncomm))
    for l in links:
        a, b = comm[l["source"]], comm[l["target"]]
        if a != b:
            w = cg.get_edge_data(a, b, {"weight": 0})["weight"]
            cg.add_edge(a, b, weight=w + 1)
    pos = nx.spring_layout(cg, seed=SEED, weight="weight", k=1.6, iterations=300)
    cx, cy = (GX0 + GX1) / 2, (GY0 + GY1) / 2
    P = {c: [cx + pos[c][0] * GW * 0.37, cy + pos[c][1] * GH * 0.37] for c in pos}
    for _ in range(3000):
        moved = False
        for a in P:
            for b in P:
                if a >= b:
                    continue
                dx, dy = P[b][0] - P[a][0], P[b][1] - P[a][1]
                dist = math.hypot(dx, dy) or 0.01
                need = rc[a] + rc[b] + 40
                if dist < need:
                    push = (need - dist) / 2
                    ux, uy = dx / dist, dy / dist
                    P[a][0] -= ux * push; P[a][1] -= uy * push
                    P[b][0] += ux * push; P[b][1] += uy * push
                    moved = True
        for c in P:  # gentle gravity + keep inside the graph area (room for labels)
            P[c][0] += (cx - P[c][0]) * 0.002
            P[c][1] += (cy - P[c][1]) * 0.002
            P[c][0] = min(max(P[c][0], GX0 + rc[c] + 10), GX1 - rc[c] - 10)
            P[c][1] = min(max(P[c][1], GY0 + rc[c] + 30), GY1 - rc[c] - 30)
        if not moved:
            break
    # stretch each axis so the packed communities fill the viewport (only ever expands)
    bx0 = min(P[c][0] - rc[c] for c in P); bx1 = max(P[c][0] + rc[c] for c in P)
    by0 = min(P[c][1] - rc[c] for c in P); by1 = max(P[c][1] + rc[c] for c in P)
    tx0, tx1, ty0, ty1 = GX0 + 30, GX1 - 30, GY0 + 40, GY1 - 50
    sx = max(1.0, (tx1 - tx0) / (bx1 - bx0)); sy = max(1.0, (ty1 - ty0) / (by1 - by0))
    for c in P:  # map circle centres so the outermost edges land on the target box
        P[c][0] = P[c][0] + (sx - 1) * (P[c][0] - (bx0 + bx1) / 2) + ((tx0 + tx1) - (bx0 + bx1)) / 2
        P[c][1] = P[c][1] + (sy - 1) * (P[c][1] - (by0 + by1) / 2) + ((ty0 + ty1) - (by0 + by1)) / 2
    for c in P:
        P[c][0] = min(max(P[c][0], GX0 + rc[c] + 10), GX1 - rc[c] - 10)
        P[c][1] = min(max(P[c][1], GY0 + rc[c] + 30), GY1 - rc[c] - 40)
    for a in P:
        for b in P:
            if a < b and math.dist(P[a], P[b]) < rc[a] + rc[b]:
                print(f"warn: communities {a},{b} overlap", file=sys.stderr)

    # Node layout inside each community.
    npos = {}
    for c in range(ncomm):
        members = [n for n in nodes if comm[n] == c]
        sg = nx.Graph()
        sg.add_nodes_from(members)
        sg.add_edges_from((l["source"], l["target"]) for l in links
                          if comm[l["source"]] == c and comm[l["target"]] == c)
        if len(members) == 1:
            sp = {members[0]: (0.0, 0.0)}
        else:
            sp = nx.spring_layout(sg, seed=SEED, k=1.4 / math.sqrt(len(members)), iterations=200)
        m = max((math.hypot(*v) for v in sp.values()), default=1) or 1
        for n, (x, y) in sp.items():
            npos[n] = [P[c][0] + x / m * rc[c] * 0.78, P[c][1] + y / m * rc[c] * 0.78]
        # resolve node overlaps and clamp into the circle
        for _ in range(200):
            for i, a in enumerate(members):
                for b in members[i + 1:]:
                    dx, dy = npos[b][0] - npos[a][0], npos[b][1] - npos[a][1]
                    dist = math.hypot(dx, dy) or 0.01
                    need = radius_of[a] + radius_of[b] + 6
                    if dist < need:
                        push = (need - dist) / 2
                        ux, uy = dx / dist, dy / dist
                        npos[a][0] -= ux * push; npos[a][1] -= uy * push
                        npos[b][0] += ux * push; npos[b][1] += uy * push
            for n in members:
                dx, dy = npos[n][0] - P[c][0], npos[n][1] - P[c][1]
                dist = math.hypot(dx, dy)
                lim = rc[c] - radius_of[n] - 6
                if dist > lim > 0:
                    npos[n][0] = P[c][0] + dx / dist * lim
                    npos[n][1] = P[c][1] + dy / dist * lim
    return P, rc, npos


def node_shape(ntype, x, y, r, fill, extra=""):
    if ntype == "method":  # diamond
        pts = f"{x:.1f},{y - r * 1.25:.1f} {x + r * 1.25:.1f},{y:.1f} {x:.1f},{y + r * 1.25:.1f} {x - r * 1.25:.1f},{y:.1f}"
        return f'<polygon points="{pts}" fill="{fill}" stroke="#0b1220" stroke-width="1.2"{extra}/>'
    if ntype == "decision":  # hexagon
        pts = " ".join(f"{x + r * 1.2 * math.cos(math.pi / 3 * k):.1f},{y + r * 1.2 * math.sin(math.pi / 3 * k):.1f}"
                       for k in range(6))
        return f'<polygon points="{pts}" fill="{fill}" stroke="#0b1220" stroke-width="1.2"{extra}/>'
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" stroke="#0b1220" stroke-width="1.2"{extra}/>'


# ---------- camera ----------

def cam_at(cx, cy, w):
    w = min(max(w, GW / 3.4), GW)
    h = w * GH / GW
    return (cx - w / 2, cy - h / 2, w, h)


OVERVIEW = (GX0, GY0, GW, GH)


class Timeline:
    """Collects (time, viewBox, spline-into) keyframes for the camera."""

    def __init__(self):
        self.frames = [(0.0, OVERVIEW, None)]

    @property
    def t(self):
        return self.frames[-1][0]

    def go(self, dt, box, spline=EASE):
        self.frames.append((self.t + dt, box, spline))

    def hold(self, dt):
        self.go(dt, self.frames[-1][1], LINEAR)

    def smil(self):
        """Camera as translate+scale transforms (nested-svg viewBox SMIL is not animated by Chrome)."""
        D = self.t
        kts = ";".join(f"{t / D:.4f}" for t, _, _ in self.frames)
        spl = ";".join(s for _, _, s in self.frames[1:])
        tr, sc = [], []
        for _, (x, y, w, _h), _ in self.frames:
            k = GW / w
            tr.append(f"{GX0 - x * k:.2f},{GY0 - y * k:.2f}")
            sc.append(f"{k:.4f}")
        common = f'dur="{D:.2f}s" repeatCount="indefinite" calcMode="spline" keyTimes="{kts}" keySplines="{spl}"'
        return (f'<animateTransform attributeName="transform" type="translate" values="{";".join(tr)}" {common}/>'
                f'<animateTransform attributeName="transform" type="scale" additive="sum" values="{";".join(sc)}" {common}/>')


def opacity_anim(intervals, D, fade=0.45, lo=0.0, hi=1.0, attr="opacity"):
    """SMIL animate that is `hi` inside the given [t0, t1] intervals, `lo` elsewhere."""
    pts = []
    for t0, t1 in intervals:
        if t0 <= 0.01:
            pts.append((0.0, hi))
        else:
            pts += [(max(t0 - fade, 0.0), lo), (t0, hi)]
        if t1 >= D - 0.01:
            pts.append((D, hi))
        else:
            pts += [(t1, hi), (min(t1 + fade, D), lo)]
    if not pts or pts[0][0] > 0:
        pts.insert(0, (0.0, lo))
    if pts[-1][0] < D:
        pts.append((D, lo))
    clean = []
    for t, v in pts:  # keyTimes must be non-decreasing
        if clean and t <= clean[-1][0]:
            t = clean[-1][0] + 0.001
        clean.append((min(t, D), v))
    kts = ";".join(f"{min(t / D, 1):.4f}" for t, _ in clean)
    vals = ";".join(f"{v:g}" for _, v in clean)
    return f'<animate attributeName="{attr}" dur="{D:.2f}s" repeatCount="indefinite" values="{vals}" keyTimes="{kts}"/>'


def place_labels(cands, placed, obstacles, fs, bold=False, bounds=None):
    """Greedy label placement. cands: [(nid, label, x, y, r)]. Returns svg strings."""
    out = []
    for nid, lab, x, y, r in cands:
        w = text_width(lab, fs)
        opts = [(x, y + r + fs + 2, "middle"), (x, y - r - fs * 0.35, "middle"),
                (x + r + fs * 0.35, y + fs * 0.35, "start"), (x - r - fs * 0.35, y + fs * 0.35, "end")]
        for lx, ly, anchor in opts:
            x0 = lx - w / 2 if anchor == "middle" else (lx if anchor == "start" else lx - w)
            rect = (x0 - fs * 0.2, ly - fs, x0 + w + fs * 0.2, ly + fs * 0.3)
            if bounds and (rect[0] < bounds[0] or rect[2] > bounds[2] or rect[1] < bounds[1] or rect[3] > bounds[3]):
                continue
            if any(rects_overlap(rect, p, pad=fs * 0.2) for p in placed):
                continue
            if obstacles is not None and any(rects_overlap(rect, ob, pad=0) for m, ob in obstacles.items() if m != nid):
                continue
            placed.append(rect)
            weight = ' font-weight="700"' if bold else ""
            out.append(f'<rect x="{rect[0]:.1f}" y="{rect[1] - fs * 0.1:.1f}" width="{rect[2] - rect[0]:.1f}" '
                       f'height="{fs * 1.4:.1f}" rx="{fs * 0.3:.1f}" fill="#0b1220" fill-opacity="0.75"/>')
            out.append(f'<text x="{lx:.1f}" y="{ly:.1f}" font-size="{fs:.2f}"{weight} fill="#e2e8f0" '
                       f'text-anchor="{anchor}">{escape(lab)}</text>')
            break
    return out


def main():
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    nodes, links, cats = load()
    ncomm = len(cats)
    comm = assign_communities(nodes, links, cats)

    deg = Counter()
    G = nx.Graph()
    G.add_nodes_from(nodes)
    for l in links:
        deg[l["source"]] += 1
        deg[l["target"]] += 1
        G.add_edge(l["source"], l["target"], rt=l["relation_type"])
    maxc = max(n["claims_count"] for n in nodes.values()) or 1
    radius_of = {nid: 4 + 9 * math.sqrt(n["claims_count"] / maxc) + min(deg[nid], 45) / 9
                 for nid, n in nodes.items()}

    P, rc, npos = layout(nodes, links, comm, ncomm, radius_of)
    ccolor = {c: COMMUNITY_COLORS[c % len(COMMUNITY_COLORS)] for c in range(ncomm)}
    csize = Counter(comm.values())
    members = defaultdict(list)
    for n in nodes:
        members[comm[n]].append(n)
    anchor = {c: max(members[c], key=lambda n: deg[n]) for c in range(ncomm)}
    hubs = [n for n, _ in deg.most_common(8)]

    # ---------- camera tour ----------
    tour = sorted(range(ncomm), key=lambda c: -csize[c])[:TOUR_SIZE]
    ccam = {c: cam_at(P[c][0], P[c][1] + 6, (2 * rc[c] + 90) * GW / GH) for c in tour}
    tl = Timeline()
    tl.hold(T_OVER)
    stages = [("overview", None, 0.0, T_OVER)]
    legs = []
    for i, c in enumerate(tour):
        if i == 0:
            tl.go(T_ZOOM, ccam[c])
        else:
            prev = tour[i - 1]
            path = nx.shortest_path(G, anchor[prev], anchor[c])
            pts = [npos[n] for n in path]
            seg = [math.dist(pts[k], pts[k + 1]) for k in range(len(pts) - 1)]
            total = sum(seg)
            travel_w = min(GW, max(ccam[prev][2], ccam[c][2]) * 1.45)
            t_leg0 = tl.t
            tl.go(T_EASE, cam_at(*pts[0], travel_w))           # pull back onto the start node
            tA = tl.t
            dur = max(2.2, total / TRAVEL_SPEED)
            arrive = [tA]
            for k, s in enumerate(seg):                          # follow the path at constant speed
                tl.go(dur * s / total, cam_at(*pts[k + 1], travel_w), LINEAR)
                arrive.append(tl.t)
            tB = tl.t
            tl.go(T_EASE, ccam[c])                               # push in on the destination
            legs.append(dict(path=path, pts=pts, total=total, tA=tA, tB=tB, arrive=arrive,
                             src=prev, dst=c, travel_w=travel_w))
            stages.append(("travel", (prev, c), t_leg0, tl.t))
        h0 = tl.t
        tl.hold(T_HOLD)
        stages.append(("focus", c, h0, tl.t))
    o0 = tl.t
    tl.go(T_OUT, OVERVIEW)
    tl.hold(T_END)
    stages.append(("overview", None, o0 + T_OUT * 0.6, tl.t))
    D = tl.t

    def intervals(kind, key=None):
        return [(s[2], s[3]) for s in stages if s[0] == kind and (key is None or s[1] == key)]

    o = []
    a = o.append
    a(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">')
    a("""<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1424"/><stop offset="1" stop-color="#0a0f1c"/></linearGradient>
  <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="blur10" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>
  <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#0a0f1c" stop-opacity="0"/><stop offset="1" stop-color="#0a0f1c" stop-opacity="0.85"/></radialGradient>
</defs>
<style>
  @keyframes flow { to { stroke-dashoffset: -76; } }
  @keyframes spin { to { stroke-dashoffset: -200; } }
  @keyframes pulse { 0%,100% { opacity: .15; } 50% { opacity: .65; } }
  @keyframes twinkle { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: .2; } }
  .flow { stroke-dasharray: 18 20; animation: flow 1.6s linear infinite; }
  .hull { stroke-dasharray: 6 8; animation: spin 14s linear infinite; }
  .halo { animation: pulse 2.2s ease-in-out infinite; }
  .tw { animation: twinkle 3.2s ease-in-out infinite; }
  .rec { animation: blink 1.4s ease-in-out infinite; }
</style>""")
    a(f'<rect width="{W}" height="{H}" rx="18" fill="url(#bg)"/>')
    a(f'<rect x="1" y="1" width="{W - 2}" height="{H - 2}" rx="17" fill="none" stroke="#1e293b"/>')

    # header (no data counts — nothing here goes stale)
    a('<text x="36" y="54" font-size="26" font-weight="700" fill="#e2e8f0">Mindforge Wiki 知识图谱</text>')
    a('<text x="36" y="84" font-size="14" fill="#64748b">Personal Knowledge Compiler · 概念 / 方法 / 决策 + 带证据与置信度的 Claims · 按社区（category）聚类 · 类型化关系</text>')

    # ================= camera viewport =================
    a(f'<rect x="{GX0}" y="{GY0}" width="{GW}" height="{GH}" rx="12" fill="#0b1120" stroke="#1e293b"/>')
    a(f'<clipPath id="gclip"><rect x="{GX0}" y="{GY0}" width="{GW}" height="{GH}" rx="12"/></clipPath>')
    a('<g clip-path="url(#gclip)"><g>')
    a(tl.smil())

    # community hulls (+ focus glow synced with the camera)
    for c in range(ncomm):
        cx, cy, r, col = P[c][0], P[c][1], rc[c], ccolor[c]
        a(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{col}" fill-opacity="0.05"/>')
        a(f'<circle class="hull" cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" stroke="{col}" stroke-opacity="0.45" stroke-width="1.4"/>')
        if c in tour:
            a(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{col}" fill-opacity="0.12" stroke="{col}" '
              f'stroke-width="2.5" filter="url(#glow)" opacity="0">{opacity_anim(intervals("focus", c), D)}</circle>')

    # edges
    bridges = []
    a('<g stroke-linecap="round">')
    for i, l in enumerate(links):
        s, t = l["source"], l["target"]
        (x1, y1), (x2, y2) = npos[s], npos[t]
        if comm[s] == comm[t]:
            a(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{ccolor[comm[s]]}" stroke-opacity="0.28" stroke-width="1"/>')
        else:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            dx, dy = x2 - x1, y2 - y1
            path = f"M{x1:.1f},{y1:.1f} Q{mx - dy * 0.15:.1f},{my + dx * 0.15:.1f} {x2:.1f},{y2:.1f}"
            a(f'<path d="{path}" fill="none" stroke="#7c8aa5" stroke-opacity="0.16" stroke-width="1"/>')
            bridges.append((deg[s] + deg[t], i, path, l["relation_type"]))
    a("</g>")

    # ambient particles on the strongest bridges
    bridges.sort(reverse=True)
    for k, (_, i, path, rt) in enumerate(bridges[:18]):
        col = RELATION_COLORS.get(rt, "#95A5A6")
        dur = 3.2 + (k % 5) * 0.6
        a(f'<path d="{path}" fill="none" stroke="{col}" stroke-opacity="0.4" stroke-width="1.2"/>')
        a(f'<circle r="2.8" fill="{col}" filter="url(#glow)"><animateMotion dur="{dur:.1f}s" '
          f'begin="{-k * 0.37:.2f}s" repeatCount="indefinite" path="{path}"/></circle>')

    # navigation trails: the camera's route, drawn edge by edge as the comet passes
    for leg in legs:
        d_path = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in leg["pts"])
        L = leg["total"]
        tA, tB = leg["tA"], leg["tB"]
        dst_hold_end = next(s[3] for s in stages if s[0] == "focus" and s[1] == leg["dst"])
        dash = (f'<animate attributeName="stroke-dashoffset" dur="{D:.2f}s" repeatCount="indefinite" '
                f'values="{L:.1f};{L:.1f};0;0" keyTimes="0;{tA / D:.4f};{tB / D:.4f};1"/>')
        a(f'<path d="{d_path}" fill="none" stroke="#fde68a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" '
          f'stroke-dasharray="{L:.1f} {L:.1f}" stroke-dashoffset="{L:.1f}" opacity="0" filter="url(#glow)">'
          f'{dash}{opacity_anim([(tA, dst_hold_end)], D, fade=0.6)}</path>')
        # node pops as the comet reaches each hop
        for n, ta in zip(leg["path"], leg["arrive"]):
            x, y = npos[n]
            a(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius_of[n] + 6:.1f}" fill="none" stroke="#fde68a" stroke-width="2.5" opacity="0">'
              f'{opacity_anim([(ta, ta + 0.5)], D, fade=0.25)}</circle>')
        # the comet itself
        a(f'<circle r="6" fill="#fff7d6" filter="url(#glow)" opacity="0">'
          f'<animateMotion dur="{D:.2f}s" repeatCount="indefinite" path="{d_path}" calcMode="linear" '
          f'keyPoints="0;0;1;1" keyTimes="0;{tA / D:.4f};{tB / D:.4f};1"/>'
          f'{opacity_anim([(tA, tB)], D, fade=0.2)}</circle>')

    # nodes
    for h_i, nid in enumerate(hubs):
        x, y = npos[nid]
        a(f'<circle class="halo" style="animation-delay:{h_i * 0.3:.1f}s" cx="{x:.1f}" cy="{y:.1f}" '
          f'r="{radius_of[nid] + 9:.1f}" fill="{ccolor[comm[nid]]}" filter="url(#blur10)"/>')
    for idx, (nid, n) in enumerate(sorted(nodes.items(), key=lambda kv: radius_of[kv[0]])):
        x, y = npos[nid]
        extra = f' class="tw" style="animation-delay:{(idx * 0.53) % 3.2:.2f}s"' if n["claims_count"] >= 6 else ""
        a(node_shape(n["type"], x, y, radius_of[nid], ccolor[comm[nid]], extra))

    obstacles = {n: (npos[n][0] - radius_of[n], npos[n][1] - radius_of[n],
                     npos[n][0] + radius_of[n], npos[n][1] + radius_of[n]) for n in nodes}

    # community labels (always on; they grow naturally when the camera pushes in)
    placed = []
    clabel_rects = []
    for c in sorted(range(ncomm), key=lambda c: -csize[c]):
        name = cats[c]["name"]
        fs = 15
        w = text_width(name, fs)
        cx, cy, r = P[c][0], P[c][1], rc[c]
        for lx, ly in ((cx, cy - r - 10), (cx, cy + r + 22), (cx - r * 0.6, cy - r * 0.8 - 8),
                       (cx + r * 0.6, cy - r * 0.8 - 8), (cx + r * 0.6, cy + r * 0.8 + 20),
                       (cx - r - 8 - w / 2, cy + 5), (cx + r + 8 + w / 2, cy + 5)):
            rect = (lx - w / 2, ly - fs, lx + w / 2, ly + 4)
            if rect[0] < GX0 + 6 or rect[2] > GX1 - 6 or rect[1] < GY0 + 4 or rect[3] > GY1 - 4:
                continue
            if not any(rects_overlap(rect, p) for p in placed):
                placed.append(rect)
                clabel_rects.append(rect)
                a(f'<text x="{lx:.1f}" y="{ly:.1f}" font-size="{fs}" font-weight="700" fill="{ccolor[c]}" text-anchor="middle">{escape(name)}</text>')
                break
        else:
            print(f"warn: no room for community label {name}", file=sys.stderr)

    # overview labels: global hubs + each community's anchor; fade out while zoomed
    order = hubs[:5] + sorted(set(anchor.values()) - set(hubs[:5]), key=lambda n: -deg[n])
    order += [n for n, _ in deg.most_common() if n not in order and deg[n] >= 7]
    ov = []
    for nid in order[:30]:
        strong = nid in hubs[:5] or nid in anchor.values()
        fs = 15 if nid in hubs[:5] else 13
        ov += place_labels([(nid, short_title(nodes[nid]["title"]), *npos[nid], radius_of[nid])], placed,
                           None if strong else obstacles, fs, bold=nid in hubs[:5],
                           bounds=(GX0 + 4, GY0 + 4, GX1 - 4, GY1 - 4))
    a(f'<g opacity="1">{opacity_anim(intervals("overview"), D, fade=0.6)}')
    o.extend(ov)
    a("</g>")

    # close-up labels for each toured community, sized to read ~SCREEN_FS on screen
    for c in tour:
        zoom = GW / ccam[c][2]
        fs = SCREEN_FS / zoom
        cplaced = list(clabel_rects)
        x0, y0, w, h = ccam[c]
        cands = [(n, short_title(nodes[n]["title"]), *npos[n], radius_of[n])
                 for n in sorted(members[c], key=lambda n: -deg[n])]
        bounds = (x0, y0, x0 + w, y0 + h)
        lab = place_labels(cands[:3], cplaced, None, fs * 1.1, bold=True, bounds=bounds)  # hubs may sit over nodes
        lab += place_labels(cands[3:], cplaced, obstacles, fs, bounds=bounds)
        a(f'<g opacity="0">{opacity_anim(intervals("focus", c), D, fade=0.5)}')
        o.extend(lab)
        a("</g>")

    # route labels: name every hop while the camera travels
    for leg in legs:
        fs = SCREEN_FS / (GW / leg["travel_w"])
        rplaced = list(clabel_rects)
        cands = [(n, short_title(nodes[n]["title"]), *npos[n], radius_of[n]) for n in leg["path"]]
        lab = place_labels(cands, rplaced, None, fs * 1.05, bold=True)
        a(f'<g opacity="0">{opacity_anim([(leg["tA"], leg["tB"] + T_EASE)], D, fade=0.4)}')
        o.extend(lab)
        a("</g>")
    a("</g></g>")  # end camera viewport

    # viewfinder HUD (screen space)
    a(f'<rect x="{GX0}" y="{GY0}" width="{GW}" height="{GH}" rx="12" fill="url(#vignette)" pointer-events="none"/>')
    br, m = 26, 14
    for sx, sy, dx, dy in ((GX0 + m, GY0 + m, 1, 1), (GX1 - m, GY0 + m, -1, 1),
                           (GX0 + m, GY1 - m, 1, -1), (GX1 - m, GY1 - m, -1, -1)):
        a(f'<path d="M{sx},{sy + dy * br} V{sy} H{sx + dx * br}" fill="none" stroke="#94a3b8" stroke-opacity="0.6" stroke-width="2"/>')
    a(f'<circle class="rec" cx="{GX0 + 44}" cy="{GY0 + 40}" r="5" fill="#f87171"/>')
    cap_x, cap_y = GX0 + 58, GY0 + 46
    for kind, key, t0, t1 in stages:
        if kind == "overview":
            txt, sub = "全景", "社区聚类总览"
        elif kind == "focus":
            txt, sub = f"镜头 {tour.index(key) + 1}", cats[key]["name"]
        else:
            txt, sub = "沿关系导航", f'{cats[key[0]]["name"]} → {cats[key[1]]["name"]}'
        a(f'<g opacity="0">{opacity_anim([(t0, t1)], D, fade=0.35)}'
          f'<text x="{cap_x}" y="{cap_y}" font-size="16" font-weight="700" fill="#e2e8f0">{txt}'
          f'<tspan dx="10" font-size="14" font-weight="400" fill="#94a3b8">{escape(sub)}</tspan></text></g>')
    # timeline scrubber
    a(f'<rect x="{GX0 + 40}" y="{GY1 - 30}" width="{GW - 80}" height="3" rx="1.5" fill="#1e293b"/>')
    a(f'<rect x="{GX0 + 40}" y="{GY1 - 30}" width="0" height="3" rx="1.5" fill="#fbbf24">'
      f'<animate attributeName="width" dur="{D:.2f}s" repeatCount="indefinite" values="0;{GW - 80}" keyTimes="0;1"/></rect>')
    for kind, key, t0, _ in stages:
        if kind == "focus":
            x = GX0 + 40 + (GW - 80) * t0 / D
            a(f'<circle cx="{x:.1f}" cy="{GY1 - 28.5}" r="4" fill="{ccolor[key]}"/>')

    # ================= legend row =================
    ly = GY1 + 40
    x = 36
    a(f'<text x="{x}" y="{ly}" font-size="15" font-weight="700" fill="#e2e8f0">节点类型</text>')
    x += 80
    for t, lab in (("concept", "概念"), ("method", "方法"), ("decision", "决策")):
        a(node_shape(t, x + 8, ly - 5, 7, "#cbd5e1"))
        a(f'<text x="{x + 22}" y="{ly}" font-size="14" fill="#cbd5e1">{lab}</text>')
        x += 66
    note = "颜色 = 社区 · 大小 = Claims 数量"
    a(f'<text x="{x}" y="{ly}" font-size="13" fill="#64748b">{note}</text>')
    x += text_width(note, 13) + 40
    a(f'<line x1="{x - 20}" y1="{ly - 14}" x2="{x - 20}" y2="{ly + 3}" stroke="#334155"/>')
    a(f'<text x="{x}" y="{ly}" font-size="15" font-weight="700" fill="#e2e8f0">类型化关系</text>')
    x += 96
    for k, rt in enumerate(RELATION_COLORS):
        a(f'<line x1="{x}" y1="{ly - 5}" x2="{x + 24}" y2="{ly - 5}" stroke="{RELATION_COLORS[rt]}" stroke-width="3" '
          f'stroke-linecap="round" class="flow" style="animation-duration:{2 + k * 0.2:.1f}s"/>')
        a(f'<text x="{x + 30}" y="{ly}" font-size="14" fill="#cbd5e1">{RELATION_LABELS[rt]}</text>')
        x += 30 + text_width(RELATION_LABELS[rt], 14) + 22
    note = "光点 = 跨社区桥接"
    a(f'<text x="{x}" y="{ly}" font-size="13" fill="#64748b">{note}</text>')
    if x + text_width(note, 13) > W - 36:
        print("warn: legend row overflows", file=sys.stderr)

    # ================= bottom pipeline =================
    steps = [("原始素材", "文章 · 日记"), ("知识提取", "/extract-knowledge"),
             ("Wiki 页面", "概念 · 方法 · 决策 · Claims"), ("维护演进", "/evolve-wiki · 冲突检测"),
             ("图谱导出", "export-graph.py → JSON"), ("Live Graph", "GitHub Pages 交互图")]
    by = GY1 + 152
    a(f'<text x="36" y="{by - 56}" font-size="18" font-weight="700" fill="#e2e8f0">编译流水线</text>')
    a(f'<text x="140" y="{by - 56}" font-size="13" fill="#64748b">知识只编译一次并持续保鲜，而非每次查询重新推导</text>')
    n = len(steps)
    bw = 230
    gap = (W - 72 - bw * n) / (n - 1)
    xs = [36 + i * (bw + gap) for i in range(n)]
    track = f"M{xs[0] + bw / 2:.0f},{by} H{xs[-1] + bw / 2:.0f}"
    a(f'<path d="{track}" stroke="#1e293b" stroke-width="7" stroke-linecap="round"/>')
    a(f'<path d="{track}" stroke="#2dd4bf" stroke-width="3" stroke-opacity="0.8" class="flow"/>')
    for j in range(3):
        a(f'<circle r="5" fill="#a5f3fc" filter="url(#glow)"><animateMotion dur="6s" begin="{-j * 2}s" repeatCount="indefinite" path="{track}"/></circle>')
    for i, (t1, t2) in enumerate(steps):
        x = xs[i]
        a(f'<rect x="{x:.0f}" y="{by - 32}" width="{bw}" height="64" rx="12" fill="#0f2a2a" stroke="#2dd4bf" stroke-opacity="0.7" stroke-width="1.4"/>')
        a(f'<text x="{x + bw / 2:.0f}" y="{by - 5}" font-size="16" font-weight="700" fill="#e2e8f0" text-anchor="middle">{t1}</text>')
        a(f'<text x="{x + bw / 2:.0f}" y="{by + 18}" font-size="13" fill="#94a3b8" text-anchor="middle">{escape(t2)}</text>')
    a("</svg>")

    out_path.write_text("\n".join(o), encoding="utf-8")
    print(f"wrote {out_path}  (camera loop {D:.1f}s, tour: {' → '.join(cats[c]['name'] for c in tour)})")


if __name__ == "__main__":
    main()
