import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ContentIndex } from '../docs/content';
import type { WikiGraph } from '../types';
import type { History } from './history';
import Detail from './Detail';
import { PlaybackBar } from './Playback';
import { usePlayback } from './usePlayback';
import { buildEntries, dateOf, dayIndex, GROUP_BY_KEY, relatedOf } from './knowledge';
import type { Entry } from './knowledge';

// 时间维度：横轴是 commit 日期，每条泳道一类知识；和知识图谱（相关性维度）互补，
// 选中节点时再把相关性叠加回来（相关概念连线、文章贡献的概念）
interface Item extends Entry {
  x: number;
  y: number;
  r: number;
}

const LANE_HEIGHT: Record<string, number> = {
  gap: 54, concept: 92, method: 42, decision: 30, Notes: 70, Azure: 42, paper: 30, book: 24, product: 24,
};
const LANES = Object.keys(LANE_HEIGHT).map((k) => ({ ...GROUP_BY_KEY[k], height: LANE_HEIGHT[k] }));
const LABEL_W = 70;
const PAD_R = 24;
const AXIS_H = 40;
const STEP = 6.5;

function layout(entries: Entry[], totalDays: number, width: number): Item[] {
  const inner = width - LABEL_W - PAD_R;
  const xOf = (day: number) => LABEL_W + (day / totalDays) * inner;
  const laneTop: Record<string, number> = {};
  let top = 0;
  for (const l of LANES) {
    laneTop[l.key] = top;
    top += l.height;
  }
  // 同一泳道同一天的点竖向堆叠，堆满一列往右挪，像蜂群图；相隔不到一周的两期报告上下错开
  const stacks = new Map<string, number>();
  let lastGapDay = -99;
  let gapFlip = false;
  return entries.map((it) => {
    const h = LANE_HEIGHT[it.group];
    if (it.kind === 'gap') {
      gapFlip = it.day - lastGapDay < 7 ? !gapFlip : false;
      lastGapDay = it.day;
      return { ...it, x: xOf(it.day), y: laneTop.gap + h / 2 + (gapFlip ? 12 : -4), r: 11 };
    }
    const k = `${it.group}:${it.day}`;
    const n = stacks.get(k) ?? 0;
    stacks.set(k, n + 1);
    const rows = Math.max(1, Math.floor((h - 8) / STEP));
    const col = Math.floor(n / rows);
    const row = n % rows;
    return { ...it, x: xOf(it.day) + col * STEP * 0.85, y: laneTop[it.group] + h - 6 - row * STEP, r: 2.6 };
  });
}

export default function TimeAxis({ history, index, graph }: { history: History; index: ContentIndex; graph: WikiGraph }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(720, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { entries, totalDays } = useMemo(() => buildEntries(history, index, graph), [history, index, graph]);
  const items = useMemo(() => layout(entries, totalDays, width), [entries, totalDays, width]);
  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const pb = usePlayback(totalDays);
  const { cursor } = pb;

  const [hover, setHover] = useState<Item | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = selectedKey ? byKey.get(selectedKey) ?? null : null;
  const { related, contributes } = useMemo(() => relatedOf(selected, items, graph, history), [selected, items, graph, history]);
  const highlighted = useMemo(() => new Set([...related, ...contributes].map((i) => i.key)), [related, contributes]);

  const laneTops: number[] = [];
  let acc = 0;
  for (const l of LANES) {
    laneTops.push(acc);
    acc += l.height;
  }
  const svgH = acc + AXIS_H;
  const inner = width - LABEL_W - PAD_R;
  const xOfDay = (d: number) => LABEL_W + (d / totalDays) * inner;
  const months: { x: number; label: string }[] = [];
  for (let d = 0; d <= totalDays; d++) {
    const s = dateOf(d, history.firstCommit);
    if (s.endsWith('-01')) months.push({ x: xOfDay(d), label: s.slice(0, 7) });
  }
  const maxCommits = Math.max(...history.days.map(([, n]) => n));

  return (
    <Box>
      <PlaybackBar pb={pb} history={history} entries={entries} totalDays={totalDays} onSelect={setSelectedKey} />
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
        <Box ref={wrapRef} sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <svg width={width} height={svgH} style={{ display: 'block', userSelect: 'none' }} onClick={() => setSelectedKey(null)}>
            <style>{`
              .mf-dot { transition: transform .45s cubic-bezier(.2,1.6,.4,1), opacity .35s; transform-box: fill-box; transform-origin: center; cursor: pointer; }
              @keyframes mfRing { from { r: 3; opacity: .9 } to { r: 14; opacity: 0 } }
            `}</style>
            {LANES.map((l, i) => (
              <g key={l.key}>
                <rect x={0} y={laneTops[i]} width={width} height={l.height} fill={i % 2 ? '#fafafa' : '#fff'} />
                <rect x={LABEL_W - 6} y={laneTops[i] + 4} width={3} height={l.height - 8} rx={1.5} fill={l.color} opacity={0.7} />
                <text x={LABEL_W - 14} y={laneTops[i] + l.height / 2 + 4} textAnchor="end" fontSize={12} fontWeight={600} fill="#455a64">{l.label}</text>
              </g>
            ))}
            {months.map((m) => (
              <g key={m.label}>
                <line x1={m.x} x2={m.x} y1={0} y2={acc} stroke="#e0e0e0" strokeDasharray="2 4" />
                <text x={m.x + 3} y={acc + 32} fontSize={11} fill="#90a4ae">{m.label}</text>
              </g>
            ))}
            {/* 底部每日提交活跃度 */}
            {history.days.map(([d, n]) => {
              const di = dayIndex(d, history.firstCommit);
              const h = (n / maxCommits) * 18;
              return <rect key={d} x={xOfDay(di) - 1} y={acc + 20 - h} width={2} height={h} rx={1} fill={di <= cursor ? '#90a4ae' : '#eceff1'} />;
            })}
            {/* 已走过的时间段 */}
            <rect x={LABEL_W} y={0} width={Math.max(0, xOfDay(cursor) - LABEL_W)} height={acc} fill="#1a237e" opacity={0.025} />
            {/* 选中节点的相关连线 */}
            {selected && [...related, ...contributes].filter((r) => r.day <= cursor).map((r) => {
              const mx = (selected.x + r.x) / 2;
              const my = Math.min(selected.y, r.y) - 18;
              return <path key={r.key} d={`M${selected.x},${selected.y} Q${mx},${my} ${r.x},${r.y}`} fill="none" stroke={GROUP_BY_KEY[selected.group].color} strokeOpacity={0.45} strokeWidth={1} />;
            })}
            {items.map((it) => {
              const color = GROUP_BY_KEY[it.group].color;
              const shown = it.day <= cursor;
              const dim = selected && selected.key !== it.key && !highlighted.has(it.key);
              const fresh = shown && cursor - it.day < 3 && cursor < totalDays;
              return (
                <g
                  key={it.key}
                  onMouseEnter={() => setHover(it)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => { e.stopPropagation(); setSelectedKey(it.key); }}
                >
                  {fresh && <circle cx={it.x} cy={it.y} r={3} fill="none" stroke={color} style={{ animation: 'mfRing 1s ease-out' }} />}
                  <circle
                    className="mf-dot"
                    cx={it.x}
                    cy={it.y}
                    r={selected?.key === it.key ? it.r + 2 : it.r}
                    fill={it.kind === 'gap' ? '#fff' : color}
                    stroke={it.kind === 'gap' ? color : selected?.key === it.key ? '#263238' : 'none'}
                    strokeWidth={it.kind === 'gap' ? 3 : 1.5}
                    style={{ transform: shown ? 'scale(1)' : 'scale(0)', opacity: shown ? (dim ? 0.15 : 0.9) : 0 }}
                  />
                  {it.gap && shown && (
                    <text x={it.x} y={it.y + 4} textAnchor="middle" fontSize={9} fontWeight={800} fill={color} pointerEvents="none" opacity={dim ? 0.3 : 1}>
                      {it.gap.index + 1}
                    </text>
                  )}
                </g>
              );
            })}
            {/* 时间光标 */}
            <line x1={xOfDay(cursor)} x2={xOfDay(cursor)} y1={0} y2={acc + 22} stroke="#1a237e" strokeWidth={1.5} />
            <circle cx={xOfDay(cursor)} cy={acc + 22} r={4} fill="#1a237e" />
          </svg>
          {hover && (
            <Paper
              elevation={4}
              sx={{ position: 'absolute', left: Math.min(hover.x + 12, width - 260), top: Math.max(0, hover.y - 10), p: 1, maxWidth: 260, pointerEvents: 'none', zIndex: 2 }}
            >
              <Typography variant="caption" sx={{ color: GROUP_BY_KEY[hover.group].color, fontWeight: 700 }}>
                {GROUP_BY_KEY[hover.group].label} · {hover.date}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{hover.title}</Typography>
            </Paper>
          )}
        </Box>
        {selected && (
          <Box sx={{ width: 320, flexShrink: 0, maxHeight: svgH }}>
            <Detail item={selected} history={history} related={related} contributes={contributes} onSelect={setSelectedKey} onClose={() => setSelectedKey(null)} />
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
        每个点是一篇文章或一个 wiki 节点，横向位置是它在 GitHub 上的首次提交日期（跟随改名）；红色大圆是知识差距报告。点任意节点查看详情，相关节点会连线高亮。
      </Typography>
    </Box>
  );
}
