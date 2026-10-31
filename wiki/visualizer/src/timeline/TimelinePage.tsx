import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { docHash, useContentIndex } from '../docs/content';
import { NODE_COLORS } from '../theme';
import { graphAt, useHistory, useWikiGraph } from './history';
import type { GapReport, History } from './history';
import TimeAxis from './TimeAxis';
import KnowledgeTree from './KnowledgeTree';
import TopicLines from './TopicLines';

const ARTICLE_COLOR = '#5c6bc0';
const ACTIVE_COLOR = '#66bb6a';
const STALE_COLOR = '#ef9a9a';
const CATEGORY_COLORS = ['#4A90D9', '#50C878', '#FF8C42', '#9B59B6', '#E74C3C', '#16A085', '#F39C12', '#95A5A6'];
const PRIORITY_COLORS = { high: '#d32f2f', medium: '#f9a825', low: '#2e7d32' } as const;
const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' } as const;

// 差距报告按 commit 日期落到所在周（周一），用来在周序列图上画竖线
function weekOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const shortDate = (s: string) => s.slice(5);

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      {note && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>{note}</Typography>}
      {children}
    </Paper>
  );
}

function Kpis({ history }: { history: History }) {
  const latest = history.graph.at(-1);
  const items = [
    ['提交', history.totals.commits],
    ['活跃天数', history.totals.activeDays],
    ['文章', history.totals.articles],
    ['wiki 节点', history.totals.nodes],
    ['Claims', latest?.claims ?? '-'],
    ['其中 stale', latest?.stale ?? '-'],
    ['差距报告', history.totals.gapReports],
  ] as const;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1.5, mb: 3 }}>
      {items.map(([label, value]) => (
        <Paper key={label} variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
        </Paper>
      ))}
    </Box>
  );
}

function GrowthChart({ history }: { history: History }) {
  // 同一周的多期报告合成一条竖线，标签写成 G7·G8，避免文字重叠
  const gapWeeks: { week: string; label: string }[] = [];
  history.gaps.forEach((g, i) => {
    const week = weekOf(g.date);
    const prev = gapWeeks.at(-1);
    if (prev?.week === week) prev.label += `·G${i + 1}`;
    else gapWeeks.push({ week, label: `G${i + 1}` });
  });
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={history.weeks} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="week" tickFormatter={shortDate} fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip labelFormatter={(w) => `${w} 那一周`} />
        <Legend />
        <Area type="monotone" dataKey="articles" name="文章（累计）" stroke={ARTICLE_COLOR} fill={ARTICLE_COLOR} fillOpacity={0.15} />
        <Line type="monotone" dataKey="concepts" name="概念" stroke={NODE_COLORS.concept} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="methods" name="方法" stroke={NODE_COLORS.method} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="decisions" name="决策" stroke={NODE_COLORS.decision} dot={false} strokeWidth={2} />
        {gapWeeks.map((g) => (
          <ReferenceLine key={g.label} x={g.week} stroke="#9e9e9e" strokeDasharray="4 4" label={{ value: g.label, position: 'top', fontSize: 10, fill: '#757575' }} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ActivityChart({ history }: { history: History }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={history.weeks} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="week" tickFormatter={shortDate} fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip labelFormatter={(w) => `${w} 那一周`} />
        <Legend />
        <Bar dataKey="commits" name="提交" fill="#b0bec5" />
        <Bar dataKey="articlesAdded" name="新增文章" fill={ARTICLE_COLOR} />
        <Bar dataKey="nodesAdded" name="新增 wiki 节点" fill={NODE_COLORS.concept} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ClaimsChart({ history }: { history: History }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={history.graph} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tickFormatter={shortDate} fontSize={11} />
        <YAxis yAxisId="n" fontSize={11} />
        <YAxis yAxisId="c" orientation="right" domain={[0.5, 1]} fontSize={11} />
        <Tooltip />
        <Legend />
        <Area yAxisId="n" type="monotone" dataKey="active" name="active" stackId="s" stroke={ACTIVE_COLOR} fill={ACTIVE_COLOR} fillOpacity={0.5} />
        <Area yAxisId="n" type="monotone" dataKey="stale" name="stale" stackId="s" stroke={STALE_COLOR} fill={STALE_COLOR} fillOpacity={0.6} />
        <Line yAxisId="c" type="monotone" dataKey="avgConfidence" name="平均置信度" stroke="#37474f" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CategoryChart({ history }: { history: History }) {
  const latest = history.graph.at(-1);
  const top = latest
    ? Object.entries(latest.categories).sort((a, b) => b[1] - a[1]).slice(0, CATEGORY_COLORS.length).map(([name]) => name)
    : [];
  const data = history.graph.map((p) => ({ date: p.date, ...p.categories }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tickFormatter={shortDate} fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {top.map((name, i) => (
          <Line key={name} type="monotone" dataKey={name} stroke={CATEGORY_COLORS[i]} dot={false} strokeWidth={2} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function GapCard({ report, index, history }: { report: GapReport; index: number; history: History }) {
  const snap = graphAt(history, report.date);
  const carried = report.suggestions.filter((s) => s.carried).length;
  const landed = report.suggestions.filter((s) => s.landed.length > 0).length;
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
      <Box sx={{ width: 84, flexShrink: 0, textAlign: 'right' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>G{index + 1}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{report.date}</Typography>
      </Box>
      <Box sx={{ borderLeft: 2, borderColor: 'divider', pl: 2, flex: 1, minWidth: 0 }}>
        <Link href={docHash(report.path)} variant="body2" sx={{ fontWeight: 600 }}>{report.title}</Link>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          {snap && `当时：${snap.concepts} 概念 · ${snap.methods} 方法 · ${snap.claims} Claims（stale ${snap.stale}）· `}
          {report.suggestions.length} 条建议，{carried} 条沿袭上期，{landed} 条点名的页面已建
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {report.suggestions.map((s, i) => (
            <Chip
              key={i}
              size="small"
              variant="outlined"
              label={
                <span>
                  {s.priority && <b style={{ color: PRIORITY_COLORS[s.priority] }}>{PRIORITY_LABELS[s.priority]} </b>}
                  {s.title}
                  {s.carried && ' · 沿袭'}
                  {s.landed.length > 0 && ` · 已建 ${s.landed.map((l) => l.date.slice(5)).join(',')}`}
                </span>
              }
              sx={{ maxWidth: '100%', borderColor: s.landed.length ? ACTIVE_COLOR : s.carried ? '#ffb74d' : undefined }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function DocLists({ history }: { history: History }) {
  const index = useContentIndex();
  const [mode, setMode] = useState<'edited' | 'recent'>('edited');
  const rows = useMemo(() => {
    const entries = Object.entries(history.docs).filter(([p]) => p !== 'README.md');
    entries.sort((a, b) => (mode === 'edited' ? b[1][1] - a[1][1] : b[1][0].localeCompare(a[1][0])));
    return entries.slice(0, 15);
  }, [history, mode]);
  return (
    <>
      <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)} sx={{ mb: 1 }}>
        <ToggleButton value="edited" sx={{ textTransform: 'none' }}>修改最多</ToggleButton>
        <ToggleButton value="recent" sx={{ textTransform: 'none' }}>最近新增</ToggleButton>
      </ToggleButtonGroup>
      {rows.map(([path, [created, edits]]) => (
        <Box key={path} sx={{ display: 'flex', gap: 2, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
          <Link href={docHash(path)} variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {index?.byPath.get(path)?.title ?? path}
          </Link>
          <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {created} · {edits} 次提交
          </Typography>
        </Box>
      ))}
    </>
  );
}

export default function TimelinePage() {
  const { history, failed } = useHistory();
  const index = useContentIndex();
  const graph = useWikiGraph();
  const [view, setView] = useState<'tree' | 'axis' | 'topics'>('tree');

  if (failed) {
    return <Typography sx={{ p: 4 }}>缺少演进数据：运行 <code>python3 scripts/sync-content.py</code> 生成 history.json。</Typography>;
  }
  if (!history) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const gaps = [...history.gaps].map((g, i) => ({ g, i })).reverse();
  return (
    <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>知识演进</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          mindforge 从 {history.firstCommit} 到 {history.lastCommit}。所有时间都是 GitHub 上的 commit 时间；
          G1–G{history.gaps.length} 是各期知识差距分析报告提交的时间点。
        </Typography>

        <Section
          title="知识怎样一天天长出来"
          note={view === 'tree'
            ? '知识之树：从一株小苗开始，每翻过一个有内容的日子（台历），树就长高、分叉一点；知识越多长得越快。叶子是文章与 wiki 节点，花是知识差距报告。鼠标移到树上会暂停，叶子换成知识的颜色，可以悬停、点选查看。'
            : view === 'axis'
              ? '时间轴：横轴是 commit 日期，每条泳道一类知识。点 ▶ 播放，或拖动滑块到任意一天。'
              : '主题脉络：一个主题一条正弦波，所有主题共用第一天到最后一天的时间轴；都是标准的正弦波，文章多的主题波密一些；播放快慢跟着活跃度走，平静处走得快，文章处慢下来，有文章的日子是串在波上的圆点。鼠标移到波浪上会暂停，可以悬停、点选查看。「当下活跃」跟着播放只出现正在更新的一两个主题；「选择主题」单看一个主题的整条发展线。'}
        >
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)} sx={{ mb: 1.5 }}>
            <ToggleButton value="tree" sx={{ textTransform: 'none', px: 2 }}>知识之树</ToggleButton>
            <ToggleButton value="axis" sx={{ textTransform: 'none', px: 2 }}>时间轴</ToggleButton>
            <ToggleButton value="topics" sx={{ textTransform: 'none', px: 2 }}>主题脉络</ToggleButton>
          </ToggleButtonGroup>
          {!index || !graph ? (
            <CircularProgress size={24} />
          ) : view === 'tree' ? (
            <KnowledgeTree history={history} index={index} graph={graph} />
          ) : view === 'axis' ? (
            <TimeAxis history={history} index={index} graph={graph} />
          ) : (
            <TopicLines history={history} index={index} graph={graph} />
          )}
        </Section>

        <Kpis history={history} />

        <Section title="累计增长" note="按周统计；文章和 wiki 节点按首次提交（跟随改名）计入。竖线为差距报告。">
          <GrowthChart history={history} />
        </Section>

        <Section title="每周活动" note="提交次数，以及当周首次出现的文章和 wiki 节点。">
          <ActivityChart history={history} />
        </Section>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          <Section title="Claims 健康度" note="每周取当周最后一次提交的 wiki-graph.json。">
            <ClaimsChart history={history} />
          </Section>
          <Section title="分类成长" note="成员数最多的分类，节点数随时间变化。">
            <CategoryChart history={history} />
          </Section>
        </Box>

        <Section
          title="知识差距与建议"
          note="每期报告里的学习建议。'沿袭'表示建议原文提到延续上期；'已建'表示建议点名的页面在报告之后首次提交——换了名字建的识别不到。"
        >
          {gaps.map(({ g, i }) => (
            <GapCard key={g.path} report={g} index={i} history={history} />
          ))}
        </Section>

        <Section title="文章与节点" note="按提交历史排列。">
          <DocLists history={history} />
        </Section>
      </Box>
    </Box>
  );
}
