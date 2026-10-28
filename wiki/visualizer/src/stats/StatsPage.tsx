import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Area,
  AreaChart,
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
import { useHistory } from '../timeline/history';
import { useStats } from './useStats';

// 文档统计：字数、标签、系列完成度、链接健康度都在同步时预计算（scripts/stats.py），这里只做聚合与展示
const SECTIONS: { key: string; label: string; color: string }[] = [
  { key: 'Notes', label: '笔记', color: '#5c6bc0' },
  { key: 'Azure', label: 'Azure', color: '#0288d1' },
  { key: 'paper', label: '论文', color: '#8e24aa' },
  { key: 'book', label: '读书', color: '#6d4c41' },
  { key: 'product', label: '产品', color: '#00897b' },
  { key: 'wiki', label: 'Wiki', color: '#f4511e' },
];
// 节点类型这类结构性标签不算"主题"
const STRUCTURAL_TAGS = new Set(['wiki', 'concept', 'method', 'decision']);
const ACTIVE_SERIES_DAYS = 30;

const sectionOf = (path: string) => SECTIONS.find((s) => path.startsWith(`${s.key}/`))?.key;
const fmtWords = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)} 万` : n.toLocaleString());
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function weekOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, minWidth: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      {note && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>{note}</Typography>}
      {children}
    </Paper>
  );
}

export default function StatsPage() {
  const { stats, failed } = useStats();
  const { history } = useHistory();
  const index = useContentIndex();

  const derived = useMemo(() => {
    if (!stats) return null;
    const entries = Object.entries(stats.docs).filter(([p]) => p !== 'README.md');
    const bySection = SECTIONS.map((s) => {
      const xs = entries.filter(([p]) => sectionOf(p) === s.key);
      return { ...s, docs: xs.length, words: xs.reduce((n, [, d]) => n + d.words, 0) };
    });
    const tagCount = new Map<string, number>();
    // 标签大小写不统一（MCP / mcp），合并后计数；同一篇里重复的只算一次
    for (const [, d] of entries) {
      for (const t of new Set(d.tags.map((x) => x.toLowerCase()))) {
        if (!STRUCTURAL_TAGS.has(t)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      }
    }
    const tags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);
    const longest = [...entries].sort((a, b) => b[1].words - a[1].words).slice(0, 10);
    const links = entries.reduce(
      (acc, [, d]) => ({
        internal: acc.internal + d.links.internal,
        external: acc.external + d.links.external,
        private: acc.private + d.links.private,
        broken: acc.broken + d.links.broken.length,
      }),
      { internal: 0, external: 0, private: 0, broken: 0 },
    );
    const broken = entries.filter(([, d]) => d.links.broken.length > 0);
    return { entries, bySection, tags, longest, links, broken };
  }, [stats]);

  // 字数累计：每篇按首次提交那一周计入，分板块堆叠
  const growth = useMemo(() => {
    if (!stats || !history) return [];
    const add = new Map<string, Record<string, number>>();
    for (const [p, d] of Object.entries(stats.docs)) {
      const created = history.docs[p]?.[0];
      const sec = sectionOf(p);
      if (!created || !sec) continue;
      const w = weekOf(created);
      const row = add.get(w) ?? {};
      row[sec] = (row[sec] ?? 0) + d.words;
      add.set(w, row);
    }
    const total: Record<string, number> = {};
    return history.weeks.map(({ week }) => {
      for (const [k, v] of Object.entries(add.get(week) ?? {})) total[k] = (total[k] ?? 0) + v;
      return { week, ...total };
    });
  }, [stats, history]);

  if (failed) return <Typography sx={{ p: 4 }}>缺少统计数据：运行 <code>python3 scripts/sync-content.py</code> 生成 stats.json。</Typography>;
  if (!stats || !derived || !index) {
    return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  const { entries, bySection, tags, longest, links, broken } = derived;
  const totalWords = entries.reduce((n, [, d]) => n + d.words, 0);
  const articles = entries.filter(([p]) => sectionOf(p) && sectionOf(p) !== 'wiki');
  const ref = history?.lastCommit;
  const titleOf = (p: string) => index.byPath.get(p)?.title ?? p.split('/').pop()!.replace(/\.md$/, '');
  const lastAdded = (paths: string[]) => paths.map((p) => history?.docs[p]?.[0]).filter((x): x is string => !!x).sort().at(-1);

  return (
    <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>统计</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          同步时预计算：中文按字、英文按词计（不含代码块与链接地址）；时间取 GitHub 首次提交。内容 mindforge@{index.sourceCommit} · 同步于 {index.generatedAt.slice(0, 10)}。
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5, mb: 3 }}>
          {[
            ['总字数', fmtWords(totalWords)],
            ['文章', articles.length],
            ['文章平均', `${Math.round(articles.reduce((n, [, d]) => n + d.words, 0) / Math.max(1, articles.length)).toLocaleString()} 字`],
            ['主题标签', tags.length],
            ['系列', stats.series.length],
            ['坏链', links.broken],
          ].map(([label, value]) => (
            <Paper key={label} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="字数累计" note="每篇按首次提交那一周计入，分板块堆叠">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growth} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="week" tickFormatter={(w) => w.slice(5)} fontSize={11} />
                <YAxis tickFormatter={(n) => fmtWords(n)} fontSize={11} width={64} />
                <Tooltip formatter={(v) => fmtWords(Number(v))} labelFormatter={(w) => `${w} 那一周`} />
                <Legend />
                {SECTIONS.map((s) => (
                  <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="w" stroke={s.color} fill={s.color} fillOpacity={0.35} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
            <Panel title="各板块" note="篇数与字数">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bySection} margin={{ top: 8, right: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis tickFormatter={(n) => fmtWords(n)} fontSize={11} width={64} />
                  <Tooltip formatter={(v, k) => (k === 'words' ? fmtWords(Number(v)) : v)} />
                  <Bar dataKey="words" name="字数">
                    {bySection.map((s) => <Cell key={s.key} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {bySection.map((s) => (
                  <Typography key={s.key} variant="caption" sx={{ color: 'text.secondary' }}>
                    <Box component="span" sx={{ color: s.color, fontWeight: 700 }}>{s.label}</Box> {s.docs} 篇 · 篇均 {Math.round(s.words / Math.max(1, s.docs)).toLocaleString()} 字
                  </Typography>
                ))}
              </Box>
            </Panel>
            <Panel title="最长的 10 篇">
              {longest.map(([p, d], i) => (
                <Box key={p} sx={{ display: 'flex', gap: 1.5, py: 0.6, borderBottom: 1, borderColor: 'divider', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', width: 16 }}>{i + 1}</Typography>
                  <Link href={docHash(p)} variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleOf(p)}</Link>
                  <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{d.words.toLocaleString()} 字</Typography>
                </Box>
              ))}
            </Panel>
          </Box>

          <Panel title="主题标签（前 30）" note={`共 ${tags.length} 个；不含 wiki / concept / method / decision 这类结构性标签`}>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={tags.slice(0, 30).map(([t, n]) => ({ t, n }))} margin={{ top: 8, right: 24, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="t" angle={-40} textAnchor="end" interval={0} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="n" name="篇数" fill="#26a69a" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="系列完成度" note={`文件名带"系列 NN"的文章；编号从 1（或 0）到当前最大号，缺号即未写或改名。最后一篇在 ${ACTIVE_SERIES_DAYS} 天内提交算进行中。`}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, gap: 1.5 }}>
              {stats.series.map((s) => {
                const start = s.numbers[0] === 0 ? 0 : 1;
                const expected = s.numbers.at(-1)! - start + 1;
                const done = s.numbers.length / expected;
                const last = lastAdded(s.docs);
                const idle = last && ref ? days(last, ref) : null;
                return (
                  <Paper key={`${s.folder}/${s.name}`} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>{s.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.numbers.length} / {expected} 篇</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>{s.folder}</Typography>
                    <LinearProgress variant="determinate" value={done * 100} color={done === 1 ? 'success' : 'warning'} sx={{ my: 1, height: 6, borderRadius: 3 }} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mb: 0.75 }}>
                      {s.docs.map((p, i) => (
                        <Chip key={p} size="small" label={String(s.numbers[i] ?? i + start).padStart(2, '0')} component="a" href={docHash(p)} clickable title={titleOf(p)} sx={{ height: 20, fontSize: 11 }} />
                      ))}
                      {s.missing.map((n) => (
                        <Chip key={`m${n}`} size="small" label={String(n).padStart(2, '0')} variant="outlined" title="缺号" sx={{ height: 20, fontSize: 11, borderStyle: 'dashed', color: 'text.disabled' }} />
                      ))}
                    </Box>
                    <Typography variant="caption" sx={{ color: idle !== null && idle <= ACTIVE_SERIES_DAYS ? 'success.main' : 'text.secondary' }}>
                      {last ? `最后一篇 ${last}` : ''}{idle !== null ? (idle <= ACTIVE_SERIES_DAYS ? ' · 进行中' : ` · 已 ${idle} 天没有新篇`) : ''}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          </Panel>

          <Panel title="链接健康度" note="按文章阅读器的规则解析相对链接与 wikilink；代码里的示例与 _ 开头的模板文件不检查">
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 1.5 }}>
              {[
                ['站内链接', links.internal, 'text.primary'],
                ['外部链接', links.external, 'text.primary'],
                ['指向私有日记', links.private, 'text.secondary'],
                ['坏链', links.broken, links.broken ? 'error.main' : 'success.main'],
              ].map(([label, n, color]) => (
                <Box key={label as string}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: color as string }}>{(n as number).toLocaleString()}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              "指向私有日记"是 [[YYYY-MM-DD-周X]] 这类链接：日记不公开、不在 git 里，所以应用里打不开，但在作者本地是通的。
            </Typography>
            {broken.map(([p, d]) => (
              <Box key={p} sx={{ py: 0.75, borderTop: 1, borderColor: 'divider' }}>
                <Link href={docHash(p)} variant="body2" sx={{ fontWeight: 600 }}>{titleOf(p)}</Link>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {d.links.broken.map((b) => <Chip key={b} size="small" color="error" variant="outlined" label={b} sx={{ maxWidth: '100%' }} />)}
                </Box>
              </Box>
            ))}
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
