import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GROUP_BY_KEY } from './knowledge';
import type { Entry } from './knowledge';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const CARD_H = 380;

export interface DayPage {
  day: number;
  date: string;
  items: Entry[];
}

function CardFace({ page, totals }: { page: DayPage; totals?: string }) {
  const [y, m, d] = page.date.split('-');
  const weekday = WEEKDAYS[new Date(`${page.date}T00:00:00Z`).getUTCDay()];
  const gap = page.items.find((i) => i.gap);
  return (
    <>
      <Box sx={{ bgcolor: '#c62828', color: '#fff', px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, letterSpacing: 1 }}>{y} 年 {Number(m)} 月</Typography>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>{weekday}</Typography>
      </Box>
      {/* 台历的装订孔 */}
      <Box sx={{ position: 'absolute', top: -7, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
        {[0, 1].map((i) => <Box key={i} sx={{ width: 10, height: 16, borderRadius: 5, bgcolor: '#9e9e9e', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.4)' }} />)}
      </Box>
      <Box sx={{ textAlign: 'center', pt: 1 }}>
        <Typography sx={{ fontSize: 84, fontWeight: 800, lineHeight: 1, color: '#263238', fontVariantNumeric: 'tabular-nums' }}>{Number(d)}</Typography>
        {gap && (
          <Typography variant="caption" sx={{ display: 'inline-block', mt: 0.5, px: 1, borderRadius: 8, bgcolor: '#ffebee', color: '#c62828', fontWeight: 700 }}>
            🌸 G{gap.gap!.index + 1} 知识差距报告
          </Typography>
        )}
      </Box>
      <Box sx={{ px: 2, pt: 1.5, flex: 1, overflow: 'hidden' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          {page.items.length > 0 ? `这一天长出 ${page.items.filter((i) => !i.gap).length} 项` : '这一天没有新增'}
        </Typography>
        {page.items.filter((i) => !i.gap).slice(0, 7).map((i) => (
          <Box key={i.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.6 }}>
            <Box sx={{ width: 9, height: 9, borderRadius: '2px 9px', bgcolor: GROUP_BY_KEY[i.group].color, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</Typography>
          </Box>
        ))}
        {page.items.filter((i) => !i.gap).length > 7 && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>还有 {page.items.filter((i) => !i.gap).length - 7} 项……</Typography>
        )}
      </Box>
      {totals && (
        <Box sx={{ px: 2, py: 1, borderTop: '1px dashed #e0e0e0' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{totals}</Typography>
        </Box>
      )}
    </>
  );
}

const cardSx = {
  position: 'absolute' as const,
  inset: 0,
  bgcolor: '#fff',
  borderRadius: 2,
  boxShadow: '0 2px 10px rgba(0,0,0,.12)',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'visible',
};

/**
 * 台历：当前这一天是最上面一张，有新增的日子翻页时上一张向上翻走；
 * 后面叠着之前几张有内容的日子，露出边缘。
 */
export default function DayCalendar({ page, previous, totals, animate, flipMs = 600 }: {
  page: DayPage;
  previous: DayPage[];
  totals: string;
  animate: boolean;
  /** 翻页动画时长；倍速高时要比每页停留时间短，否则前后两页会叠在一起 */
  flipMs?: number;
}) {
  return (
    <Box sx={{ position: 'relative', height: CARD_H + 36, perspective: 900, mt: 1 }}>
      {previous.slice(0, 3).map((p, i) => (
        <Box
          key={p.day}
          sx={{
            ...cardSx,
            height: CARD_H,
            transform: `translateY(${(i + 1) * 9}px) scale(${1 - (i + 1) * 0.035})`,
            opacity: 0.9 - i * 0.25,
            zIndex: 3 - i,
            filter: 'saturate(.6)',
          }}
        >
          <CardFace page={p} />
        </Box>
      ))}
      {/* 上一张翻走：用 key 让每一天都是新元素，进场动画模拟翻页 */}
      <Box
        key={page.day}
        sx={{
          ...cardSx,
          height: CARD_H,
          zIndex: 10,
          transformOrigin: 'top center',
          animation: animate ? `mfFlipIn ${flipMs}ms cubic-bezier(.2,.8,.3,1)` : undefined,
          '@keyframes mfFlipIn': {
            from: { transform: 'rotateX(-80deg)', opacity: 0.2 },
            to: { transform: 'rotateX(0deg)', opacity: 1 },
          },
        }}
      >
        <CardFace page={page} totals={totals} />
      </Box>
    </Box>
  );
}
