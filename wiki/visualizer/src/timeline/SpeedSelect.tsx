import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const SPEED_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** 时间轴与知识之树共用的播放倍速：1× ~ 10× */
export default function SpeedSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>速度</Typography>
      <Select
        size="small"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        sx={{ fontSize: 13, fontWeight: 600, '& .MuiSelect-select': { py: 0.4, pl: 1.2 } }}
      >
        {SPEED_OPTIONS.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}×</MenuItem>)}
      </Select>
    </Box>
  );
}
