import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import { docHash } from '../docs/content';
import { PRIORITY_COLORS, PRIORITY_LABELS, useHistory } from '../timeline/history';
import { ACTION_LABELS, buildTopics, LINE_COLORS, reportsWithTrends, SIGNAL_LABELS, sortTopics, STATE_LABELS } from './topics';
import type { Topic, TopicState } from './topics';

// 选中的主题写进 hash：#/gaps?topic=agent-memory，刷新与分享都能还原
function readTopic(): string | null {
  const h = window.location.hash;
  const i = h.indexOf('?');
  return i < 0 ? null : new URLSearchParams(h.slice(i + 1)).get('topic');
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

function StateChip({ state }: { state: TopicState }) {
  const s = STATE_LABELS[state];
  return <Chip size="small" label={s.label} title={s.hint} sx={{ height: 18, fontSize: 11, color: '#fff', bgcolor: s.color }} />;
}

/** 主题详情：逐期的原话、动作、信号来源与关联节点 */
function TopicDetail({ topic, lines }: { topic: Topic; lines: Record<string, string> }) {
  const actions = new Map<string, number>();
  for (const a of topic.appearances) for (const t of a.trends) if (t.action) actions.set(t.action, (actions.get(t.action) ?? 0) + 1);
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: LINE_COLORS[topic.line] }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{topic.label}</Typography>
        <StateChip state={topic.state} />
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        {lines[topic.line] ?? topic.line} · 出现 {topic.appearances.length} 期 · 连续 {topic.streak} 期 · {topic.firstSeen} 首次 · {topic.lastSeen} 最近
        {actions.size > 0 && ` · ${[...actions.entries()].map(([k, n]) => `${ACTION_LABELS[k as keyof typeof ACTION_LABELS]} ${n}`).join(' / ')}`}
      </Typography>

      {topic.nodes.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>关联 wiki 页（{topic.nodes.length}）</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {topic.nodes.map((n) => (
              <Chip key={n.node} size="small" component="a" href={docHash(n.path)} clickable
                label={n.landed ? `${n.node} · ${n.date} 落地` : n.node}
                sx={{ bgcolor: n.landed ? '#e8f5e9' : undefined, fontWeight: n.landed ? 700 : undefined }} variant={n.landed ? 'filled' : 'outlined'} />
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        {[...topic.appearances].reverse().map((a) => (
          <Box key={a.index} sx={{ py: 1.25, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>G{a.index + 1} · {a.report.date}</Typography>
              <Link href={docHash(a.report.path)} variant="caption">打开报告 →</Link>
            </Box>
            {a.trends.map((t, i) => (
              <Box key={i} sx={{ pl: 1, mb: 0.75, borderLeft: 3, borderColor: t.priority ? PRIORITY_COLORS[t.priority] : 'divider' }}>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{t.title}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.4, alignItems: 'center' }}>
                  {t.priority && <Typography variant="caption" sx={{ color: PRIORITY_COLORS[t.priority], fontWeight: 700 }}>{PRIORITY_LABELS[t.priority]}</Typography>}
                  {t.action && <Chip size="small" label={ACTION_LABELS[t.action]} sx={{ height: 18, fontSize: 11 }} />}
                  {t.signals.map((s) => <Chip key={s} size="small" variant="outlined" label={SIGNAL_LABELS[s] ?? s} sx={{ height: 18, fontSize: 11 }} />)}
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function GapsPage() {
  const { history, failed } = useHistory();
  const [line, setLine] = useState<string>('all');
  const [slug, setSlug] = useState<string | null>(readTopic);

  useEffect(() => {
    window.history.replaceState(null, '', `#/gaps${slug ? `?topic=${encodeURIComponent(slug)}` : ''}`);
  }, [slug]);

  const reports = useMemo(() => (history ? reportsWithTrends(history) : []), [history]);
  const topics = useMemo(
    () => (history?.gapTopics ? sortTopics(buildTopics(reports, history.gapTopics)) : []),
    [history, reports],
  );

  if (failed) return <Box sx={{ p: 4 }}><Typography>没有 history.json，先运行 scripts/sync-content.py。</Typography></Box>;
  if (!history) return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;

  const lines = history.gapTopics?.lines ?? {};
  const shown = line === 'all' ? topics : topics.filter((t) => t.line === line);
  const current = topics.find((t) => t.slug === slug) ?? null;
  const maxScore = Math.max(1, ...topics.map((t) => t.score));
  const latest = reports.at(-1);
  const landed = topics.reduce((s, t) => s + t.nodes.filter((n) => n.landed).length, 0);

  if (reports.length === 0) {
    return <Box sx={{ p: 4 }}><Typography>差距报告的 frontmatter 里还没有 trends。</Typography></Box>;
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>差距追踪</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          最近一期 {latest?.date}。把每期知识差距报告的趋势按主题归并：一个主题热了几期、现在还在不在、建议做什么、有没有落成 wiki 页。主题表见 <code>wiki/knowledge-gap/topics.yml</code>。
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5, mb: 2.5 }}>
          {[
            ['报告期数', reports.length],
            ['主题', topics.length],
            ['最近一期主题', new Set(latest?.trends?.map((t) => t.topic)).size],
            ['连续 ≥3 期', topics.filter((t) => t.streak >= 3).length],
            ['之后落地的页', landed],
          ].map(([label, value]) => (
            <Paper key={label} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
            </Paper>
          ))}
        </Box>

        <ToggleButtonGroup size="small" exclusive value={line} onChange={(_, v) => v && setLine(v)} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <ToggleButton value="all" sx={{ textTransform: 'none', px: 1.5 }}>全部 {topics.length}</ToggleButton>
          {Object.entries(lines).filter(([k]) => topics.some((t) => t.line === k)).map(([k, label]) => (
            <ToggleButton key={k} value={k} sx={{ textTransform: 'none', px: 1.5 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: LINE_COLORS[k], mr: 0.75 }} />
              {label} {topics.filter((t) => t.line === k).length}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Panel title="主题标签" note="字号按加权热度（🔴3 / 🟡2 / 🟢1 累加），颜色是主线；点一个看详情">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', py: 1 }}>
            {shown.map((t) => (
              <Chip key={t.slug} onClick={() => setSlug(t.slug === slug ? null : t.slug)}
                label={<>{t.label}<Box component="span" sx={{ opacity: 0.7, ml: 0.75, fontSize: '0.8em' }}>×{t.appearances.length}</Box></>}
                sx={{
                  fontSize: 12 + (t.score / maxScore) * 8,
                  height: 'auto',
                  py: 0.5,
                  '& .MuiChip-label': { py: 0.25 },
                  color: t.slug === slug ? '#fff' : LINE_COLORS[t.line],
                  bgcolor: t.slug === slug ? LINE_COLORS[t.line] : `${LINE_COLORS[t.line]}14`,
                  border: 1,
                  borderColor: `${LINE_COLORS[t.line]}55`,
                  opacity: t.state === 'dormant' ? 0.55 : 1,
                }} />
            ))}
          </Box>
        </Panel>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2, mt: 2 }}>
          <Panel title="主题 × 期数" note="格子颜色是这一期里该主题的最高优先级；空格表示这期没提到。按连续期数、再按热度排序">
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: `minmax(180px, 240px) repeat(${reports.length}, 26px) 56px 52px`, columnGap: '3px', rowGap: '3px', alignItems: 'center', minWidth: 'max-content' }}>
                <Box />
                {reports.map((r, i) => (
                  <Tooltip key={r.path} title={r.date}>
                    <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 10 }}>G{i + 1}</Typography>
                  </Tooltip>
                ))}
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, textAlign: 'center' }}>状态</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, textAlign: 'center' }}>连续</Typography>
                {shown.map((t) => {
                  const by = new Map(t.appearances.map((a) => [a.index, a]));
                  const selected = t.slug === slug;
                  return [
                    <Box key={`${t.slug}-l`} onClick={() => setSlug(t.slug)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', px: 0.75, py: 0.25, borderRadius: 1, bgcolor: selected ? '#e8eaf6' : undefined, '&:hover': { bgcolor: '#f5f5f5' } }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: LINE_COLORS[t.line], flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selected ? 700 : undefined }}>{t.label}</Typography>
                    </Box>,
                    ...reports.map((r, i) => {
                      const a = by.get(i);
                      return (
                        <Tooltip key={`${t.slug}-${i}`} title={a ? `${r.date} · ${a.trends.map((x) => x.title).join(' / ')}` : r.date}>
                          <Box onClick={() => setSlug(t.slug)}
                            sx={{ height: 22, borderRadius: 0.5, cursor: 'pointer', bgcolor: a ? (a.priority ? PRIORITY_COLORS[a.priority] : '#9e9e9e') : '#f0f0f0', opacity: a ? 0.9 : 1 }} />
                        </Tooltip>
                      );
                    }),
                    <Box key={`${t.slug}-s`} sx={{ textAlign: 'center' }}><StateChip state={t.state} /></Box>,
                    <Typography key={`${t.slug}-k`} variant="caption" sx={{ textAlign: 'center', fontWeight: t.streak >= 3 ? 700 : undefined }}>{t.streak || '-'}</Typography>,
                  ];
                })}
              </Box>
            </Box>
          </Panel>
          <Panel title={current ? '主题详情' : '选择一个主题'}>
            {current ? (
              <TopicDetail topic={current} lines={lines} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>点上面的标签或左边任意一行，看这个主题每一期怎么说、建议做什么、关联哪些 wiki 页。</Typography>
            )}
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
