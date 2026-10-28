import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { docHash } from '../docs/content';
import { graphAt, PRIORITY_COLORS, PRIORITY_LABELS } from './history';
import { ACTION_LABELS } from '../gaps/topics';
import type { History } from './history';
import { GROUP_BY_KEY } from './knowledge';
import type { Entry } from './knowledge';

/** 选中条目的详情：wiki 节点看摘要与相关节点，文章看贡献的节点，差距报告看建议与这一期新增 */
export default function Detail({ item, history, related, contributes, onSelect, onClose }: {
  item: Entry;
  history: History;
  related: Entry[];
  contributes: Entry[];
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const group = GROUP_BY_KEY[item.group];
  const snap = item.gap ? graphAt(history, item.date) : undefined;
  const list = (title: string, xs: Entry[]) =>
    xs.length > 0 && (
      <>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 1.5, mb: 0.5 }}>{title}（{xs.length}）</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {xs.slice(0, 40).map((r) => (
            <Chip
              key={r.key}
              size="small"
              label={r.title}
              onClick={() => onSelect(r.key)}
              sx={{ maxWidth: 220, bgcolor: `${GROUP_BY_KEY[r.group].color}18`, '&:hover': { bgcolor: `${GROUP_BY_KEY[r.group].color}30` } }}
            />
          ))}
        </Box>
      </>
    );
  return (
    <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderLeft: 4, borderLeftColor: group.color, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: group.color, fontWeight: 700 }}>
            {item.gap ? `G${item.gap.index + 1} · ` : ''}{group.label} · {item.date}{item.edits ? ` · ${item.edits} 次提交` : ''}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>{item.title}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseRounded fontSize="small" /></IconButton>
      </Box>
      {item.node && (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.node.summary.replace(/\*\*/g, '')}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            {item.node.claims_count} 条 Claims · 平均置信度 {item.node.avg_confidence.toFixed(2)} · {item.node.category || '未分类'}
          </Typography>
        </>
      )}
      {snap && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
          当时 {snap.concepts} 概念 · {snap.methods} 方法 · {snap.claims} Claims（stale {snap.stale}）
        </Typography>
      )}
      {item.gap && (
        <>
          {(item.gap.report.trends?.length ?? 0) > 0 && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 1.5, mb: 0.5 }}>本期趋势（{item.gap.report.trends!.length}）</Typography>
              {item.gap.report.trends!.map((t, i) => (
                <Box key={i} sx={{ mb: 0.6, pl: 1, borderLeft: 3, borderColor: t.priority ? PRIORITY_COLORS[t.priority] : 'divider' }}>
                  <Typography variant="body2" sx={{ fontSize: 13 }}>{t.title}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.3, alignItems: 'center' }}>
                    <Chip size="small" component="a" href={`#/gaps?topic=${encodeURIComponent(t.topic)}`} clickable label={history.gapTopics?.topics[t.topic]?.label ?? t.topic} sx={{ height: 18, fontSize: 11 }} />
                    {t.priority && <Box component="span" sx={{ color: PRIORITY_COLORS[t.priority], fontWeight: 700, fontSize: 11 }}>{PRIORITY_LABELS[t.priority]}</Box>}
                    {t.action && <Box component="span" sx={{ color: 'text.secondary', fontSize: 11 }}>{ACTION_LABELS[t.action]}</Box>}
                    {t.nodes.filter((n) => n.landed).map((n) => (
                      <Chip key={n.node} size="small" label={`已落地 ${n.node} · ${n.date}`} onClick={() => onSelect(n.path)} sx={{ height: 18, fontSize: 11, bgcolor: '#e8f5e9' }} />
                    ))}
                  </Box>
                </Box>
              ))}
            </>
          )}
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 1.5, mb: 0.5 }}>本期建议（{item.gap.report.suggestions.length}）</Typography>
          {item.gap.report.suggestions.map((s, i) => (
            <Box key={i} sx={{ mb: 0.6, pl: 1, borderLeft: 2, borderColor: s.carried ? '#ffb74d' : 'divider' }}>
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {s.priority && <Box component="span" sx={{ color: PRIORITY_COLORS[s.priority], fontWeight: 700, fontSize: 11, mr: 0.5 }}>{PRIORITY_LABELS[s.priority]}</Box>}
                {s.title}{s.carried && <Box component="span" sx={{ color: '#ef6c00', fontSize: 11 }}> · 沿袭</Box>}
              </Typography>
              {s.landed.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.3 }}>
                  {s.landed.map((l) => (
                    <Chip key={l.node} size="small" label={`已落地 ${l.node} · ${l.date}`} onClick={() => onSelect(l.path)}
                      sx={{ height: 18, fontSize: 11, bgcolor: '#e8f5e9' }} />
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </>
      )}
      {list(item.gap ? '本期到下一期之间新增' : item.kind === 'article' ? '这篇文章贡献的 wiki 节点' : '相关节点', item.kind === 'article' ? contributes : related)}
      {item.kind !== 'article' && !item.gap && list('引用它的文章', contributes)}
      {item.path && (
        <Link href={docHash(item.path)} variant="body2" sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>打开原文 →</Link>
      )}
    </Paper>
  );
}
