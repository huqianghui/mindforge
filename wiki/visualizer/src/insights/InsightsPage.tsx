import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { docHash, useContentIndex } from '../docs/content';
import { NODE_COLORS, NODE_TYPE_LABELS, RELATION_COLORS, RELATION_TYPE_LABELS } from '../theme';
import { useWikiGraph } from '../timeline/history';
import { apply, EMPTY, flatten, norm, parseFilters, stringifyFilters, toggle } from './claims';
import type { ClaimRow, Filters } from './claims';

const ACTIVE = '#66bb6a';
const STALE = '#ef9a9a';
const STATUS_LABELS: Record<string, string> = { active: 'active', stale: 'stale' };
const CONF_BUCKETS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function readQuery(): string {
  const h = window.location.hash;
  const i = h.indexOf('?');
  return i < 0 ? '' : h.slice(i + 1);
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      {note && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>{note}</Typography>}
      {children}
    </Paper>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>{label}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{children}</Box>
    </Box>
  );
}

const confColor = (c: number) => (c >= 0.7 ? 'success' : c >= 0.5 ? 'warning' : 'error');

export default function InsightsPage() {
  const graph = useWikiGraph();
  const index = useContentIndex();
  const [f, setF] = useState<Filters>(() => parseFilters(readQuery()));
  const [nodeId, setNodeId] = useState<string | null>(null);

  // 筛选写回 hash（replaceState 不产生历史记录，也不触发 App 的路由刷新）
  useEffect(() => {
    const q = stringifyFilters(f);
    window.history.replaceState(null, '', `#/insights${q ? `?${q}` : ''}`);
  }, [f]);

  const rows = useMemo(() => (graph ? flatten(graph) : []), [graph]);
  const filtered = useMemo(() => apply(rows, f), [rows, f]);
  const set = (patch: Partial<Filters>) => { setF((prev) => ({ ...prev, ...patch })); setNodeId(null); };

  // 每个图都用"除自己那一维以外"的筛选结果，点自己时还能看到别的选项
  const byCategory = useMemo(() => {
    const m = new Map<string, { name: string; active: number; stale: number }>();
    for (const r of apply(rows, f, 'categories')) {
      const x = m.get(r.category) ?? { name: r.category, active: 0, stale: 0 };
      if (r.status === 'stale') x.stale++;
      else x.active++;
      m.set(r.category, x);
    }
    return [...m.values()].sort((a, b) => b.active + b.stale - (a.active + a.stale));
  }, [rows, f]);
  const byConf = useMemo(() => {
    const src = apply(rows, f, 'conf');
    return CONF_BUCKETS.map((b) => ({
      bucket: b.toFixed(1),
      count: src.filter((r) => r.confidence >= b - 0.05 && r.confidence < b + 0.05).length,
      lo: b - 0.05,
      hi: b + 0.05,
    }));
  }, [rows, f]);
  const byMonth = useMemo(() => {
    const m = new Map<string, { month: string; active: number; stale: number }>();
    for (const r of apply(rows, f, 'month')) {
      const k = r.lastUpdated.slice(0, 7);
      const x = m.get(k) ?? { month: k, active: 0, stale: 0 };
      if (r.status === 'stale') x.stale++;
      else x.active++;
      m.set(k, x);
    }
    return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [rows, f]);
  const byRelation = useMemo(() => {
    if (!graph) return [];
    const nodes = new Set(filtered.map((r) => r.nodeId));
    const c = new Map<string, number>();
    for (const l of graph.links) if (nodes.has(l.source) && nodes.has(l.target)) c.set(l.relation_type, (c.get(l.relation_type) ?? 0) + 1);
    return [...c.entries()].map(([k, n]) => ({ name: RELATION_TYPE_LABELS[k] ?? k, key: k, count: n })).sort((a, b) => b.count - a.count);
  }, [graph, filtered]);
  const tags = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of apply(rows, f, 'tag')) for (const t of r.tags) if (t !== 'wiki' && t !== r.type) c.set(t, (c.get(t) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [rows, f]);

  // 钻取：节点列表 → 节点的 Claims → 原文
  const nodes = useMemo(() => {
    const m = new Map<string, { id: string; title: string; type: string; category: string; claims: ClaimRow[] }>();
    for (const r of filtered) {
      const x = m.get(r.nodeId) ?? { id: r.nodeId, title: r.nodeTitle, type: r.type, category: r.category, claims: [] };
      x.claims.push(r);
      m.set(r.nodeId, x);
    }
    return [...m.values()].sort((a, b) => b.claims.length - a.claims.length);
  }, [filtered]);
  const docByTitle = useMemo(() => new Map(index?.docs.map((d) => [norm(d.title), d.path]) ?? []), [index]);
  const current = nodes.find((n) => n.id === nodeId) ?? null;

  if (!graph || !index) {
    return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  const avg = filtered.length ? filtered.reduce((s, r) => s + r.confidence, 0) / filtered.length : 0;
  const stale = filtered.filter((r) => r.status === 'stale').length;
  const active: string[] = [
    ...f.types.map((t) => `类型：${NODE_TYPE_LABELS[t]}`),
    ...f.statuses.map((s) => `状态：${s}`),
    ...f.categories.map((c) => `分类：${c}`),
    ...(f.tag ? [`标签：${f.tag}`] : []),
    ...(f.month ? [`更新月份：${f.month}`] : []),
    ...(f.conf[0] > 0 || f.conf[1] < 1 ? [`置信度：${f.conf[0].toFixed(2)}–${f.conf[1].toFixed(2)}`] : []),
    ...(f.q ? [`关键词：${f.q}`] : []),
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* 左侧筛选 */}
      <Box sx={{ width: 260, flexShrink: 0, borderRight: 1, borderColor: 'divider', p: 2, overflow: 'auto', bgcolor: '#fff', display: { xs: 'none', md: 'block' } }}>
        <TextField size="small" fullWidth placeholder="搜索 Claim 或节点" value={f.q} onChange={(e) => set({ q: e.target.value })} sx={{ mb: 2 }} />
        <FilterGroup label="类型">
          {Object.entries(NODE_TYPE_LABELS).map(([k, label]) => (
            <Chip key={k} size="small" label={label} onClick={() => set({ types: toggle(f.types, k) })}
              sx={{ bgcolor: f.types.includes(k) ? NODE_COLORS[k] : undefined, color: f.types.includes(k) ? '#fff' : undefined }} variant={f.types.includes(k) ? 'filled' : 'outlined'} />
          ))}
        </FilterGroup>
        <FilterGroup label="状态">
          {Object.keys(STATUS_LABELS).map((s) => (
            <Chip key={s} size="small" label={s} onClick={() => set({ statuses: toggle(f.statuses, s) })}
              sx={{ bgcolor: f.statuses.includes(s) ? (s === 'stale' ? STALE : ACTIVE) : undefined }} variant={f.statuses.includes(s) ? 'filled' : 'outlined'} />
          ))}
        </FilterGroup>
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>置信度 {f.conf[0].toFixed(2)} – {f.conf[1].toFixed(2)}</Typography>
          <Slider size="small" min={0} max={1} step={0.05} value={f.conf} onChange={(_, v) => set({ conf: v as [number, number] })} />
        </Box>
        <FilterGroup label="分类">
          {byCategory.map((c) => (
            <Chip key={c.name} size="small" label={`${c.name} ${c.active + c.stale}`} onClick={() => set({ categories: toggle(f.categories, c.name) })}
              color={f.categories.includes(c.name) ? 'primary' : 'default'} variant={f.categories.includes(c.name) ? 'filled' : 'outlined'} />
          ))}
        </FilterGroup>
        <FilterGroup label="标签（前 24）">
          {tags.map(([t, n]) => (
            <Chip key={t} size="small" label={`${t} ${n}`} onClick={() => set({ tag: f.tag === t ? null : t })}
              color={f.tag === t ? 'secondary' : 'default'} variant={f.tag === t ? 'filled' : 'outlined'} />
          ))}
        </FilterGroup>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>洞察</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>图谱数据生成于 {graph.generated_at.slice(0, 10)} · 点图表上的柱子即可筛选</Typography>
        </Box>
        {active.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mb: 2 }}>
            {active.map((a) => <Chip key={a} size="small" label={a} variant="outlined" />)}
            <Button size="small" onClick={() => set(EMPTY)}>清除全部</Button>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5, mb: 2.5 }}>
          {[
            ['Claims', filtered.length],
            ['节点', nodes.length],
            ['平均置信度', avg.toFixed(2)],
            ['stale 占比', filtered.length ? `${Math.round((stale / filtered.length) * 100)}%` : '-'],
            ['低置信（<0.6）', filtered.filter((r) => r.confidence < 0.6).length],
          ].map(([label, value]) => (
            <Paper key={label} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
          <Panel title="分类 × 状态" note="点某个分类，只看这个分类">
            <ResponsiveContainer width="100%" height={Math.max(220, byCategory.length * 26)}>
              <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={130} fontSize={11} interval={0} />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" stackId="s" fill={ACTIVE} cursor="pointer" onClick={(d) => set({ categories: toggle(f.categories, (d as unknown as { name: string }).name) })} />
                <Bar dataKey="stale" stackId="s" fill={STALE} cursor="pointer" onClick={(d) => set({ categories: toggle(f.categories, (d as unknown as { name: string }).name) })} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Panel title="置信度分布" note="点某一档，只看这个区间">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={byConf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="bucket" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" name="Claims" cursor="pointer" onClick={(d) => { const x = d as unknown as { lo: number; hi: number }; set({ conf: [Number(x.lo.toFixed(2)), Number(x.hi.toFixed(2))] }); }}>
                    {byConf.map((b) => <Cell key={b.bucket} fill={Number(b.bucket) >= 0.7 ? '#4A90D9' : Number(b.bucket) >= 0.5 ? '#ffb74d' : '#e57373'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="按月更新" note="Claim 最后更新的月份；点某个月只看这个月">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="active" stackId="m" fill={ACTIVE} cursor="pointer" onClick={(d) => { const m = (d as unknown as { month: string }).month; set({ month: f.month === m ? null : m }); }} />
                  <Bar dataKey="stale" stackId="m" fill={STALE} cursor="pointer" onClick={(d) => { const m = (d as unknown as { month: string }).month; set({ month: f.month === m ? null : m }); }} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 2 }}>
          <Panel title={`节点（${nodes.length}）`} note="按符合条件的 Claim 数排序；点一个节点看它的 Claims">
            <Box sx={{ maxHeight: 520, overflow: 'auto' }}>
              {nodes.map((n) => (
                <Box key={n.id} onClick={() => setNodeId(n.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1, borderRadius: 1, cursor: 'pointer', bgcolor: n.id === nodeId ? '#e8eaf6' : undefined, '&:hover': { bgcolor: '#f5f5f5' } }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: NODE_COLORS[n.type], flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.claims.length}</Typography>
                </Box>
              ))}
            </Box>
          </Panel>
          <Panel title={current ? current.title : '选择左侧的节点'} note={current ? `${NODE_TYPE_LABELS[current.type]} · ${current.category}` : undefined}>
            {current ? (
              <>
                {index.byStem.get(current.id) && (
                  <Link href={docHash(index.byStem.get(current.id)!.path)} variant="body2" sx={{ fontWeight: 600 }}>打开 wiki 页面 →</Link>
                )}
                <Box sx={{ mt: 1.5, maxHeight: 480, overflow: 'auto' }}>
                  {current.claims.map((c) => {
                    const src = docByTitle.get(norm(c.source));
                    return (
                      <Box key={c.id} sx={{ py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{c.statement}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                          <Box sx={{ width: 80 }}><LinearProgress variant="determinate" value={c.confidence * 100} color={confColor(c.confidence)} /></Box>
                          <Typography variant="caption">{c.confidence.toFixed(2)}</Typography>
                          <Chip size="small" label={c.status} sx={{ height: 18, fontSize: 11, bgcolor: c.status === 'stale' ? STALE : ACTIVE }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>更新 {c.lastUpdated}</Typography>
                          {src ? (
                            <Link href={docHash(src)} variant="caption">来源：{c.source} →</Link>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>来源：{c.source}</Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>分类 → 节点 → Claim → 原文：先用左侧筛选或点图表缩小范围，再从节点列表里挑一个。</Typography>
            )}
          </Panel>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Panel title="关系类型" note="两端都在当前筛选结果里的关系">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byRelation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" name="关系数">
                  {byRelation.map((r) => <Cell key={r.key} fill={RELATION_COLORS[r.key] ?? '#95a5a6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
