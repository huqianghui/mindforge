import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import { docHash, useContentIndex } from '../docs/content';
import { useHistory, useWikiGraph } from '../timeline/history';
import { stringifyFilters } from '../insights/claims';
import { buildSuggestions, insightsHref } from './rules';
import type { Level, Suggestion } from './rules';

const LEVELS: Record<Level, { label: string; color: string; bg: string; hint: string }> = {
  act: { label: '行动', color: '#c62828', bg: '#ffebee', hint: '值得这周就处理' },
  check: { label: '核查', color: '#ef6c00', bg: '#fff3e0', hint: '需要补证据或确认' },
  note: { label: '提示', color: '#1565c0', bg: '#e3f2fd', hint: '了解即可，顺手处理' },
};

function Card({ s, hrefOf }: { s: Suggestion; hrefOf: (t: Suggestion['targets'][number]) => string | null }) {
  const lv = LEVELS[s.level];
  const [all, setAll] = useState(false);
  const shown = all ? s.targets : s.targets.slice(0, 8);
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderLeft: 4, borderLeftColor: lv.color, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip size="small" label={lv.label} sx={{ bgcolor: lv.bg, color: lv.color, fontWeight: 700 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{s.title}</Typography>
      </Box>
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>依据</Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{s.evidence}</Typography>
      </Box>
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>建议动作</Typography>
        {s.moves.map((m) => (
          <Typography key={m} variant="body2" sx={{ lineHeight: 1.7, pl: 1.5, position: 'relative', '&::before': { content: '"→"', position: 'absolute', left: 0, color: lv.color } }}>{m}</Typography>
        ))}
      </Box>
      {s.targets.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {shown.map((t) => {
            const href = hrefOf(t);
            return <Chip key={t.label} size="small" variant="outlined" label={t.label} component={href ? 'a' : 'div'} href={href ?? undefined} clickable={!!href} sx={{ maxWidth: 260 }} />;
          })}
          {s.targets.length > 8 && (
            <Chip size="small" label={all ? '收起' : `还有 ${s.targets.length - 8} 个`} onClick={() => setAll(!all)} />
          )}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 0.5 }}>
        {s.insights && <Button size="small" variant="outlined" href={insightsHref(s.insights, stringifyFilters)}>在洞察中查看 →</Button>}
        {s.link && <Button size="small" href={s.link.href}>{s.link.label} →</Button>}
      </Box>
    </Paper>
  );
}

export default function SuggestionsPage() {
  const graph = useWikiGraph();
  const { history } = useHistory();
  const index = useContentIndex();
  const [level, setLevel] = useState<Level | 'all'>('all');
  const all = useMemo(() => (graph ? buildSuggestions(graph, history) : []), [graph, history]);

  if (!graph || !index) {
    return <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }
  const hrefOf = (t: Suggestion['targets'][number]) => {
    if (t.path) return docHash(t.path);
    const doc = t.nodeId ? index.byStem.get(t.nodeId) : undefined;
    return doc ? docHash(doc.path) : null;
  };
  const shown = level === 'all' ? all : all.filter((s) => s.level === level);
  const count = (l: Level) => all.filter((s) => s.level === l).length;

  return (
    <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>建议</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          用固定规则从知识图谱和提交历史里找出值得看的地方，每张卡写明依据和动作；以数据自身的日期为准（图谱 {graph.generated_at.slice(0, 10)}
          {history && ` · 最后提交 ${history.lastCommit}`}），同一份数据每次结果相同。阈值见 <code>src/suggestions/rules.ts</code>。
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={level} onChange={(_, v) => v && setLevel(v)} sx={{ mb: 2.5 }}>
          <ToggleButton value="all" sx={{ textTransform: 'none', px: 2 }}>全部 {all.length}</ToggleButton>
          {(Object.keys(LEVELS) as Level[]).map((l) => (
            <ToggleButton key={l} value={l} sx={{ textTransform: 'none', px: 2 }} title={LEVELS[l].hint}>
              <Box component="span" sx={{ color: LEVELS[l].color, fontWeight: 700, mr: 0.75 }}>{LEVELS[l].label}</Box>{count(l)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, gap: 2 }}>
          {shown.map((s) => <Card key={s.id} s={s} hrefOf={hrefOf} />)}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 3 }}>
          "互相冲突的 Claim"需要理解语义，规则做不到，留到 Ask Copilot（阶段 5/6）用模型判断。
        </Typography>
      </Box>
    </Box>
  );
}
