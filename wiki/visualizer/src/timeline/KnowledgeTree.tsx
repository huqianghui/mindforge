import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ContentIndex } from '../docs/content';
import type { WikiGraph } from '../types';
import type { History } from './history';
import Detail from './Detail';
import DayCalendar from './DayCalendar';
import SpeedSelect from './SpeedSelect';
import type { DayPage } from './DayCalendar';
import { buildEntries, dateOf, GROUPS, GROUP_BY_KEY, relatedOf } from './knowledge';
import type { Entry } from './knowledge';

// 知识之树：主角是一棵按固定种子生成的分形树，从小苗开始一节节长高、分叉、长满树冠。
// 生长速度跟着知识量走——某天新增得多，树就猛长一截。每一项知识按时间顺序挂到当时最新
// 长出的枝梢上成为一片叶子，差距报告是枝头的花。平时叶子只是深浅不一的绿；鼠标移入树上
// 才切换成知识的颜色，可以悬停、点选具体的知识点；离开后接着长。

const VIEW_H = 680;
const GROUND = 640;
const TRUNK_LEN = 150;
const MAX_DEPTH = 7;
const DAY_MS = 1300; // 1× 时每个有内容的日子停留的时间，够看清台历上这一天长了什么；n× 时除以 n
const REST_MS = 7000; // 长满后停一会儿再从头长
const GREENS = ['#7cb342', '#689f38', '#8bc34a', '#558b2f', '#9ccc65', '#33691e'];

interface Branch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number; // 弯曲控制点
  cy: number;
  depth: number;
  birth: number; // 以"生长量" g∈[0,1] 计的出生时刻
  dur: number;
  parentAt: number; // 父枝长到这个比例才长出本枝
  parent: number;
}

interface Slot {
  branch: number;
  frac: number; // 在枝条上的位置
  side: number;
  birth: number;
}

// 固定种子的随机数，保证每次长出来是同一棵树
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTree(cx: number) {
  const rand = rng(20260318);
  const branches: Branch[] = [];
  const slots: Slot[] = [];
  const grow = (x: number, y: number, ang: number, len: number, depth: number, birth: number, parent: number, parentAt: number) => {
    const bend = (rand() - 0.5) * 0.35;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    const mx = x + Math.cos(ang + bend) * len * 0.5;
    const my = y + Math.sin(ang + bend) * len * 0.5;
    const dur = 0.16 - depth * 0.011;
    const id = branches.length;
    branches.push({ x1: x, y1: y, x2, y2, cx: mx, cy: my, depth, birth, dur, parentAt, parent });
    // 主枝上也留少量叶位，早期的知识（树还小时）才有地方长
    if (depth >= 1) {
      const n = depth >= 6 ? 5 : depth >= 3 ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const frac = 0.35 + (0.65 * (i + 1)) / n;
        slots.push({ branch: id, frac, side: i % 2 ? 1 : -1, birth: birth + dur * frac });
      }
    }
    if (depth >= MAX_DEPTH) return;
    // 树干分三枝，往上多是两枝，偶尔三枝；越往上越向外张
    const kids = depth === 0 ? 3 : rand() < 0.28 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const spread = (depth === 0 ? 0.42 : 0.34 + rand() * 0.22) * (kids === 3 ? i - 1 : i ? 1 : -1);
      const at = depth === 0 ? [0.62, 0.86, 1][i] : kids === 3 && i === 1 ? 0.7 : 1;
      const sx = x + (x2 - x) * at;
      const sy = y + (y2 - y) * at;
      // 向上的趋光性：子枝角度略向竖直方向收拢
      const childAng = ang + spread + (-Math.PI / 2 - ang) * 0.12;
      grow(sx, sy, childAng, len * (0.66 + rand() * 0.13), depth + 1, birth + dur * (at * 0.8 + rand() * 0.25), id, at);
    }
  };
  grow(cx, GROUND, -Math.PI / 2, TRUNK_LEN, 0, 0, -1, 0);
  slots.sort((a, b) => a.birth - b.birth);
  return { branches, slots };
}

// 只走有内容的日子（新增文章、wiki 节点或差距报告），没有新增的日子直接跳过
function useGrowth(entries: Entry[], paused: boolean, speed: number) {
  const days = useMemo(() => [...new Set(entries.map((e) => e.day))].sort((a, b) => a - b), [entries]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (paused) return;
    const atEnd = idx >= days.length - 1;
    const t = window.setTimeout(() => setIdx((i) => (i >= days.length - 1 ? 0 : i + 1)), atEnd ? REST_MS : DAY_MS / speed);
    return () => window.clearTimeout(t);
  }, [idx, paused, days.length, speed]);
  return { cursor: days[Math.min(idx, days.length - 1)] ?? 0, step: idx, steps: days.length };
}

const bez = (b: Branch, t: number): [number, number] => {
  const u = 1 - t;
  return [u * u * b.x1 + 2 * u * t * b.cx + t * t * b.x2, u * u * b.y1 + 2 * u * t * b.cy + t * t * b.y2];
};

export default function KnowledgeTree({ history, index, graph }: { history: History; index: ContentIndex; graph: WikiGraph }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(520, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { entries, totalDays } = useMemo(() => buildEntries(history, index, graph), [history, index, graph]);
  const [hovering, setHovering] = useState(false);
  const [hover, setHover] = useState<Entry | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const { cursor, step, steps } = useGrowth(entries, hovering || selectedKey !== null, speed);
  const knowledgeMode = hovering || selectedKey !== null;

  // 树在世界坐标里固定，宽度只影响左右留白
  const { branches, slots } = useMemo(() => buildTree(450), []);
  const viewX = 450 - width / 2;

  // 每项知识按时间顺序均匀地占用叶位：第 i 项占出生顺序里第 i/N 处的叶位
  const placed = useMemo(() => {
    const m = new Map<string, Slot>();
    entries.forEach((e, i) => m.set(e.key, slots[Math.floor((i * slots.length) / entries.length)]));
    return m;
  }, [entries, slots]);
  const byKey = useMemo(() => new Map(entries.map((e) => [e.key, e])), [entries]);

  // 生长量：一半看过去了多少天，一半看已经长出多少知识。起点不是 0——像真的树苗，
  // 先抽出一截茎和两三根嫩枝，第一批叶子才有地方长
  const SPROUT = 0.13;
  const grownCount = entries.filter((e) => e.day <= cursor).length;
  const g = SPROUT + (1 - SPROUT) * (0.45 * (cursor / Math.max(1, totalDays)) + 0.55 * (grownCount / Math.max(1, entries.length)));
  const progress = (b: Branch) => {
    const parentOk = b.parent < 0 || progressOf[b.parent] >= b.parentAt;
    return parentOk ? Math.min(1, Math.max(0, (g - b.birth) / b.dur)) : 0;
  };
  const progressOf: number[] = [];
  branches.forEach((b, i) => { progressOf[i] = progress(b); });

  // 叶子挂在分到的枝条上；那根枝条还没长出来时，沿着父枝往树干方向找最近一根已经长出的枝条，
  // 挂在它已长出部分上——叶子永远连着树，等原来的枝条长出来再挪过去
  const leafPos = (e: Entry): [number, number] => {
    const s = placed.get(e.key)!;
    let bi = s.branch;
    let frac = s.frac;
    let hops = 0;
    while (progressOf[bi] < 0.25 && branches[bi].parent >= 0) {
      bi = branches[bi].parent;
      hops++;
    }
    if (hops > 0) frac = 0.35 + ((s.frac * 7 + hops * 0.13) % 0.6);
    const b = branches[bi];
    const [x, y] = bez(b, frac * progressOf[bi]);
    const ang = Math.atan2(b.y2 - b.y1, b.x2 - b.x1) + (s.side * Math.PI) / 2;
    const off = 5 + Math.min(4, b.depth === 0 ? 4 : 0);
    return [x + Math.cos(ang) * off, y + Math.sin(ang) * off];
  };

  const selected = selectedKey ? byKey.get(selectedKey) ?? null : null;
  const { related, contributes } = useMemo(() => relatedOf(selected, entries, graph, history), [selected, entries, graph, history]);
  const highlighted = useMemo(() => new Set([...related, ...contributes].map((i) => i.key)), [related, contributes]);

  const grown = entries.filter((e) => e.day <= cursor);
  const count = (kind: string) => grown.filter((l) => l.kind === kind).length;
  const pages = useMemo(() => {
    const m = new Map<number, Entry[]>();
    for (const e of entries) m.set(e.day, [...(m.get(e.day) ?? []), e]);
    return m;
  }, [entries]);
  const page: DayPage = { day: cursor, date: dateOf(cursor, history.firstCommit), items: pages.get(cursor) ?? [] };
  const previous: DayPage[] = [];
  for (let d = cursor - 1; d >= 0 && previous.length < 3; d--) {
    if (pages.has(d)) previous.push({ day: d, date: dateOf(d, history.firstCommit), items: pages.get(d)! });
  }
  const totals = `第 ${step + 1} / ${steps} 个有内容的日子 · 已长出 ${count('article')} 篇文章 · ${count('concept') + count('method') + count('decision')} 个节点 · ${count('gap')} 朵花`;

  // 枝条粗细：越靠近根越粗，整棵树越大枝条也越粗（管道模型的简化）
  const widthOf = (b: Branch) => Math.max(0.8, (16 - b.depth * 2.1) * (0.35 + 0.65 * g));
  const tips = branches.map((b, i) => ({ b, i })).filter(({ b, i }) => b.depth >= MAX_DEPTH - 1 && progressOf[i] > 0.6);

  return (
    <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
      <Box
        ref={wrapRef}
        sx={{ flex: 1, minWidth: 0, position: 'relative', borderRadius: 2, overflow: 'hidden', background: 'linear-gradient(180deg, #e8f1ff 0%, #f6fbf2 62%, #efe6d6 100%)' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); setHover(null); }}
      >
        <svg width={width} height={VIEW_H} viewBox={`${viewX} 0 ${width} ${VIEW_H}`} style={{ display: 'block', userSelect: 'none' }} onClick={() => setSelectedKey(null)}>
          <defs>
            <linearGradient id="mf-bark" x1="0" x2="1">
              <stop offset="0" stopColor="#4e342e" />
              <stop offset="0.5" stopColor="#795548" />
              <stop offset="1" stopColor="#3e2723" />
            </linearGradient>
            <radialGradient id="mf-crown">
              <stop offset="0" stopColor="#9ccc65" stopOpacity="0.45" />
              <stop offset="1" stopColor="#9ccc65" stopOpacity="0" />
            </radialGradient>
          </defs>
          <style>{`
            .mf-leaf { cursor: pointer; transition: opacity .5s; }
            .mf-leaf path { transition: fill .45s; }
            .mf-sway { animation: mfSway 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
            @keyframes mfSway { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(6deg) } }
            @keyframes mfPop { from { transform: scale(0) } to { transform: scale(1) } }
          `}</style>
          {/* 地面 */}
          <ellipse cx={450} cy={GROUND + 6} rx={70 + 230 * g} ry={8 + 8 * g} fill="#a1887f" opacity={0.28} />
          <ellipse cx={450} cy={GROUND + 4} rx={30 + 60 * g} ry={5} fill="#6d4c41" opacity={0.25} />
          {/* 树冠的柔光 */}
          {tips.map(({ b, i }) => {
            const [x, y] = bez(b, progressOf[i]);
            return <circle key={`c${i}`} cx={x} cy={y} r={20 + 14 * progressOf[i]} fill="url(#mf-crown)" />;
          })}
          {/* 枝干：按出生顺序画，先粗后细 */}
          {branches.map((b, i) => {
            const p = progressOf[i];
            if (p <= 0) return null;
            const [ex, ey] = bez(b, p);
            const [qx, qy] = [b.x1 + (b.cx - b.x1) * p, b.y1 + (b.cy - b.y1) * p];
            return (
              <path key={i} d={`M${b.x1},${b.y1} Q${qx},${qy} ${ex},${ey}`} fill="none" stroke={b.depth === 0 ? 'url(#mf-bark)' : '#5d4037'} strokeWidth={widthOf(b)} strokeLinecap="round" />
            );
          })}
          {/* 选中节点的相关连线 */}
          {selected && [...related, ...contributes].filter((r) => r.day <= cursor).map((r) => {
            const [x1, y1] = leafPos(selected);
            const [x2, y2] = leafPos(r);
            return <path key={r.key} d={`M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - 30} ${x2},${y2}`} fill="none" stroke={GROUP_BY_KEY[selected.group].color} strokeOpacity={0.6} strokeWidth={1.3} />;
          })}
          {grown.map((e, i) => {
            const [x, y] = leafPos(e);
            const age = cursor - e.day;
            const isSel = selected?.key === e.key;
            const dim = selected && !isSel && !highlighted.has(e.key);
            const color = knowledgeMode ? GROUP_BY_KEY[e.group].color : GREENS[i % GREENS.length];
            const handlers = {
              onMouseEnter: () => setHover(e),
              onMouseLeave: () => setHover(null),
              onClick: (ev: React.MouseEvent) => { ev.stopPropagation(); setSelectedKey(e.key); },
            };
            const s = placed.get(e.key)!;
            const b = branches[s.branch];
            const rot = (Math.atan2(b.y2 - b.y1, b.x2 - b.x1) * 180) / Math.PI + 90 + s.side * 50;
            if (e.gap) {
              return (
                <g key={e.key} className="mf-leaf" transform={`translate(${x},${y})`} style={{ opacity: dim ? 0.2 : 1 }} {...handlers}>
                  <g style={{ animation: age < 1 ? 'mfPop .8s cubic-bezier(.2,1.6,.4,1)' : undefined }}>
                    {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-6} rx={4.2} ry={6.5} fill="#f8bbd0" stroke="#f48fb1" strokeWidth={0.6} transform={`rotate(${a})`} />)}
                    <circle r={2.8} fill="#fff176" />
                    {(knowledgeMode || isSel) && <text y={-15} textAnchor="middle" fontSize={9} fontWeight={800} fill="#c2185b">G{e.gap.index + 1}</text>}
                    {isSel && <circle r={13} fill="none" stroke="#e53935" strokeWidth={1.5} />}
                  </g>
                </g>
              );
            }
            // 幼苗的叶子小，树长大后叶子才长到正常大小
            const scale = (0.6 + 0.4 * Math.min(1, g / 0.5)) * (e.kind === 'article' ? 0.85 : 1) * (isSel ? 1.6 : highlighted.has(e.key) ? 1.3 : 1);
            return (
              <g key={e.key} className="mf-leaf" transform={`translate(${x},${y})`} style={{ opacity: dim ? 0.15 : 1 }} {...handlers}>
                <g style={{ animation: age < 1 ? 'mfPop .6s cubic-bezier(.2,1.6,.4,1)' : undefined }}>
                  <g transform={`rotate(${rot}) scale(${scale})`}>
                    <path className="mf-sway" d="M0,0 C-4.5,-3 -4.5,-9 0,-12 C4.5,-9 4.5,-3 0,0Z" fill={color} stroke={isSel ? '#263238' : 'rgba(255,255,255,.55)'} strokeWidth={0.6} style={{ animationDelay: `${(i % 11) * 0.45}s` }} />
                  </g>
                </g>
              </g>
            );
          })}
        </svg>

        {/* 鼠标移入后才出现的知识图例 */}
        {knowledgeMode && (
          <Box sx={{ position: 'absolute', top: 10, left: 12, display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: '70%', bgcolor: 'rgba(255,255,255,.8)', borderRadius: 1, px: 1, py: 0.5 }}>
            {GROUPS.map((gr) => (
              <Box key={gr.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: gr.key === 'gap' ? '50%' : '2px 8px', bgcolor: gr.key === 'gap' ? '#f48fb1' : gr.color }} />
                <Typography variant="caption">{gr.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
        {hover && (() => {
          const [x, y] = leafPos(hover);
          return (
            <Paper elevation={4} sx={{ position: 'absolute', left: Math.min(x - viewX + 14, width - 270), top: Math.max(4, y - 12), p: 1, maxWidth: 260, pointerEvents: 'none' }}>
              <Typography variant="caption" sx={{ color: GROUP_BY_KEY[hover.group].color, fontWeight: 700 }}>
                {GROUP_BY_KEY[hover.group].label} · {hover.date}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{hover.title}</Typography>
            </Paper>
          );
        })()}
        <Typography variant="caption" sx={{ position: 'absolute', left: 16, bottom: 8, color: 'text.secondary' }}>
          {knowledgeMode ? '已暂停 · 叶子按知识类别着色，悬停看标题，点击看详情' : '正在一天天长大 · 鼠标移到树上查看知识'}
        </Typography>
      </Box>

      <Box sx={{ width: 300, flexShrink: 0 }}>
        {/* 倍速放在树外面：鼠标进树就会暂停生长 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <SpeedSelect value={speed} onChange={setSpeed} />
        </Box>
        {selected ? (
          <Box sx={{ height: VIEW_H }}>
            <Detail item={selected} history={history} related={related} contributes={contributes} onSelect={setSelectedKey} onClose={() => setSelectedKey(null)} />
          </Box>
        ) : (
          <DayCalendar page={page} previous={previous} totals={totals} animate flipMs={Math.min(600, Math.round((DAY_MS / speed) * 0.7))} />
        )}
      </Box>
    </Box>
  );
}
