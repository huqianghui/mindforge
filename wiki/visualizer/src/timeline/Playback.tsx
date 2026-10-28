import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import type { History } from './history';
import { dateOf, dayIndex } from './knowledge';
import type { Entry, Kind } from './knowledge';
import type { Playback } from './usePlayback';
import SpeedSelect from './SpeedSelect';

const COUNTS: [Kind, string, string][] = [
  ['article', '文章', '#5c6bc0'],
  ['concept', '概念', '#4A90D9'],
  ['method', '方法', '#50C878'],
  ['decision', '决策', '#FF8C42'],
  ['gap', '差距报告', '#e53935'],
];

export function PlaybackBar({ pb, history, entries, totalDays, onSelect }: {
  pb: Playback;
  history: History;
  entries: Entry[];
  totalDays: number;
  onSelect: (key: string) => void;
}) {
  const { cursor, setCursor, playing, setPlaying, speed, setSpeed } = pb;
  const play = () => {
    if (cursor >= totalDays) setCursor(0);
    setPlaying(true);
  };
  const visible = entries.filter((e) => e.day <= cursor);
  const currentDate = dateOf(cursor, history.firstCommit);
  const commitsToday = history.days.find(([d]) => d === currentDate)?.[1] ?? 0;
  const addedToday = visible.filter((e) => e.day === cursor && e.kind !== 'gap').length;
  const freshGap = [...history.gaps].reverse().find((g) => {
    const d = dayIndex(g.date, history.firstCommit);
    return d <= cursor && cursor - d < 8;
  });
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <IconButton
          onClick={() => (playing ? setPlaying(false) : play())}
          sx={{ bgcolor: '#1a237e', color: '#fff', '&:hover': { bgcolor: '#283593' }, width: 40, height: 40 }}
        >
          {playing ? <PauseRounded /> : <PlayArrowRounded />}
        </IconButton>
        <IconButton size="small" onClick={() => { setCursor(0); setPlaying(true); }} title="从头播放"><ReplayRounded /></IconButton>
        <SpeedSelect value={speed} onChange={setSpeed} />
        <Box sx={{ ml: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{currentDate}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            第 {cursor + 1} 天 · 当天 {commitsToday} 次提交{addedToday > 0 && ` · 新增 ${addedToday} 项`}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {COUNTS.map(([kind, label, color]) => (
          <Box key={kind} sx={{ textAlign: 'right', minWidth: 52 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {visible.filter((e) => e.kind === kind).length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
          </Box>
        ))}
      </Box>
      <Slider
        size="small"
        value={cursor}
        min={0}
        max={totalDays}
        onChange={(_, v) => { setPlaying(false); setCursor(v as number); }}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => dateOf(v, history.firstCommit)}
        sx={{ mb: 0.5 }}
      />
      <Box sx={{ height: 24, mb: 0.5 }}>
        {freshGap && (
          <Chip
            size="small"
            onClick={() => onSelect(freshGap.path)}
            label={`G${history.gaps.indexOf(freshGap) + 1} · ${freshGap.date} 知识差距报告：${freshGap.suggestions.length} 条建议`}
            sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 600, animation: 'mfPulse 1.6s ease-in-out infinite', '@keyframes mfPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } } }}
          />
        )}
      </Box>
    </>
  );
}
