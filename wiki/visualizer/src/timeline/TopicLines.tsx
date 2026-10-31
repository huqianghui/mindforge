import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import CloseRounded from '@mui/icons-material/CloseRounded';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { docHash } from '../docs/content';
import type { ContentIndex } from '../docs/content';
import type { WikiGraph } from '../types';
import type { History } from './history';
import { PlaybackBar } from './Playback';
import { usePlayback } from './usePlayback';
import { buildEntries, dateOf, dayIndex, GROUP_BY_KEY } from './knowledge';

// 主题脉络：一个目录就是一个主题。所有主题共用同一条时间轴（第一次提交到最后一次提交）。
// 每个主题一条标准的正弦波：摆幅不变，整条只有一个周期，从第一天到最后一天正好是整数个周期；
// 文章多的主题周期短一些、波密一些，文章少的周期长一些。有文章的日子是串在波上的圆点。
// 播放的快慢跟着活跃度走：平静的日子走得快，快到有文章的日子慢下来。
// 波永远先长到，圆点才亮。主题出场时先从第一天回顾到当天，再跟着播放一天天长；
// 鼠标移到波浪上暂停，悬停、点选圆点看那天的文章，和知识之树一样
const PAD_X = 40;
const ROW_H = 220;
// 基准周期在屏幕上大约 PERIOD_PX 宽，用来算播放的节拍
const PERIOD_PX = 120;
const AMP = 40;
// 每个主题整条线上的周期数：按文章日子的多少，在 MIN 到 MAX 之间
const MIN_CYCLES = 4;
const MAX_CYCLES = 14;
// 活跃度：每篇文章在前后约 SIGMA 天里有影响，新增算 1，修改算 0.5
const SIGMA = 3;
const ACTIVE_WINDOW = 7;
const MAX_SHOWN = 2;
// 1× 时每天的生长时间：平静的日子 QUIET 毫秒，越靠近有文章的日子越慢，最多再加 BUSY 毫秒
const PLAY_QUIET_MS = 160;
const PLAY_BUSY_MS = 900;
// 出场回顾：平静的一天 INTRO_UNIT_MS，有文章的日子最多再加 INTRO_BUSY 倍，一路扫过平静处、到文章处放慢；
// 总长压在 INTRO_MIN_MS（至少一个基准周期的时间）到 INTRO_MAX_MS 之间
const INTRO_UNIT_MS = 20;
const INTRO_BUSY = 14;
const INTRO_MIN_MS = 1800;
const INTRO_MAX_MS = 8000;
const GROUP_ORDER = ['Notes', 'Azure', 'paper', 'book', 'product'];

interface Point {
  day: number;
  date: string;
  added: string[];
  edited: string[];
}

interface Topic {
  dir: string;
  group: string;
  label: string;
  points: Point[];
}

/** 播放一步：用 grow 毫秒长到下一天（delay 留作停顿，目前为 0） */
interface Step {
  delay: number;
  grow: number;
}

const NO_STEP: Step = { delay: 0, grow: 0 };

function loadTopics(history: History): Topic[] {
  const first = history.firstCommit;
  return Object.entries(history.topics ?? {})
    .map(([dir, days]) => {
      const group = dir.split('/')[0];
      const points = days.map(([date, added, edited]) => ({ day: dayIndex(date, first), date, added, edited }));
      return {
        dir,
        group,
        label: dir.slice(group.length + 1) || GROUP_BY_KEY[group]?.label || dir,
        points,
      };
    })
    .filter((t) => GROUP_BY_KEY[t.group])
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.label.localeCompare(b.label));
}

/** 所有行共用的横轴 */
interface Axis {
  dayPx: number;
  periodDays: number;
  width: number;
  xOfDay: (day: number) => number;
}

const CY = ROW_H * 0.47;

/** 活跃度 0..1：附近有文章的日子高，平静的日子接近 0 */
function activity(points: Point[]): (day: number) => number {
  return (day) => {
    let v = 0;
    for (const p of points) {
      const d = (day - p.day) / SIGMA;
      if (d > -3 && d < 3) v += (p.added.length ? 1 : 0.5) * Math.exp(-d * d);
    }
    return Math.tanh(v);
  };
}

/** 一个主题自己的波：标准正弦，摆幅固定，周期固定，第一天在波峰，整条线正好整数个周期 */
function topicWave(points: Point[], axis: Axis, totalDays: number) {
  const act = activity(points);
  const cycles = Math.min(MAX_CYCLES, Math.max(MIN_CYCLES, Math.round(points.length * 0.6)));
  const periodDays = (totalDays + 1) / cycles;
  const yOfDay = (day: number) => CY - AMP * Math.cos((2 * Math.PI * day) / periodDays);
  let wave = '';
  for (let x = axis.xOfDay(0); x <= axis.xOfDay(totalDays + 1) + 0.5; x += 1) wave += `${wave ? 'L' : 'M'}${x.toFixed(1)},${yOfDay((x - PAD_X) / axis.dayPx).toFixed(1)}`;
  return { act, yOfDay, wave };
}

function TopicRow({ topic, axis, cursor, reveal, step, speed, totalDays, titleOf, selectedDate, onPick, onIntro }: {
  topic: Topic;
  axis: Axis;
  cursor: number;
  /** 波浪露到的横坐标 */
  reveal: number;
  /** 播放中这一步的停留和生长时间；不播放时为 0 */
  step: Step;
  speed: number;
  totalDays: number;
  titleOf: (dir: string, name: string) => string;
  selectedDate: string | null;
  /** 点圆点：选中那一天看详情 */
  onPick: (p: Point) => void;
  /** 出场回顾中报告波浪长到了哪一天，回顾完报 null；回顾期间主播放停住等它，发展记录也只列到这一天 */
  onIntro: (dir: string, day: number | null) => void;
}) {
  const color = GROUP_BY_KEY[topic.group].color;
  const clipId = useId();
  const [hover, setHover] = useState<Point | null>(null);
  const { xOfDay, width } = axis;
  const { act, yOfDay, wave } = useMemo(() => topicWave(topic.points, axis, totalDays), [topic.points, axis, totalDays]);
  // 出场：先把这个主题从第一天到当天回顾一遍，平静处一扫而过，有文章处放慢，圆点等波浪长到才亮；
  // 回顾完再跟着播放一天天长。introX 是回顾中波浪长到的横坐标，null 表示回顾完了
  const [introX, setIntroX] = useState<number | null>(PAD_X);
  const introRef = useRef({ cursor, speed, axis, act });
  useEffect(() => {
    const { cursor: day, speed: sp, axis: ax, act: actOf } = introRef.current;
    // 每一天用的时间按活跃度定，累加成时间表；总长不足一个基准周期的时间就整体放慢
    const ends: number[] = [];
    let total = 0;
    for (let d = 0; d <= day; d++) ends.push((total += 1 + INTRO_BUSY * actOf(d + 0.5)));
    const scale = Math.min(INTRO_MAX_MS, Math.max(INTRO_MIN_MS, total * INTRO_UNIT_MS)) / total / sp;
    let raf = 0;
    let t0 = 0;
    let d = 0;
    onIntro(topic.dir, -1);
    const tick = (now: number) => {
      t0 ||= now;
      const t = (now - t0) / scale;
      if (t < total) {
        while (ends[d] <= t) d++;
        const start = d ? ends[d - 1] : 0;
        setIntroX(ax.xOfDay(d + (t - start) / (ends[d] - start)));
        onIntro(topic.dir, d);
        raf = requestAnimationFrame(tick);
      } else {
        setIntroX(null);
        onIntro(topic.dir, null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      onIntro(topic.dir, null);
    };
  }, [topic.dir, onIntro]);
  // 永远先有波，再有点：只显示波浪已经长到的圆点，圆点都串在波上
  const waveX = introX ?? reveal;
  const seen = topic.points.filter((p) => p.day <= cursor && xOfDay(p.day) <= waveX + 0.5);
  const latest = seen.at(-1);
  // 日期标签分两行放，两行都挤不下的就不标（悬停圆点仍能看到日期）
  const labelRow = new Map<string, number>();
  const lastX = [-99, -99];
  for (const p of seen) {
    const x = xOfDay(p.day);
    const row = x - lastX[0] >= 38 ? 0 : x - lastX[1] >= 38 ? 1 : -1;
    if (row >= 0) {
      labelRow.set(p.date, row);
      lastX[row] = x;
    }
  }
  const callout = (p: Point) => {
    const names = p.added.length ? p.added : p.edited;
    const title = titleOf(topic.dir, names[0]);
    const total = p.added.length + p.edited.length;
    return `${p.added.length ? '新增' : '修改'}「${title.length > 16 ? `${title.slice(0, 15)}…` : title}」${total > 1 ? ` 等 ${total} 篇` : ''}`;
  };

  return (
    <Box sx={{ animation: 'mfTopicIn .5s ease-out', width }}>
      {/* 标题钉在可视区左边，横向滚动时不跟着走 */}
      <Box sx={{ position: 'sticky', left: 0, width: 'fit-content', display: 'flex', alignItems: 'baseline', gap: 1, px: `${PAD_X}px` }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color }}>{topic.label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {GROUP_BY_KEY[topic.group].label}
          {latest ? ` · 到当天累计新增 ${seen.reduce((s, p) => s + p.added.length, 0)} 篇 · 有文章的日子 ${seen.length} 天` : ' · 到当天还没有文章'}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', width, height: ROW_H }}>
        <svg width={width} height={ROW_H} style={{ display: 'block' }}>
          <line x1={PAD_X} x2={width - PAD_X} y1={CY} y2={CY} stroke="#cfd8dc" />
          <clipPath id={clipId}>
            <rect
              x={0}
              y={0}
              height={ROW_H}
              style={{
                width: introX ?? Math.max(0, reveal),
                transition: introX === null ? `width ${step.grow}ms linear ${step.delay}ms` : undefined,
              }}
            />
          </clipPath>
          <path d={wave} clipPath={`url(#${clipId})`} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
          {/* 回顾中波浪的笔尖：眼睛跟着它走 */}
          {introX !== null && (
            <g>
              <circle cx={introX} cy={yOfDay((introX - PAD_X) / axis.dayPx)} r={9} fill={color} opacity={0.18} />
              <circle cx={introX} cy={yOfDay((introX - PAD_X) / axis.dayPx)} r={3.5} fill={color} />
            </g>
          )}
          {seen.map((p) => {
            const x = xOfDay(p.day);
            const y = yOfDay(p.day);
            const fresh = (introX !== null ? p === latest : cursor - p.day < 2) && cursor < totalDays;
            return (
              <g
                key={p.date}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPick(p)}
                // 回顾中圆点在波浪长到它时淡入
                style={{ cursor: 'pointer', animation: introX !== null ? 'mfDotIn .3s ease-out both' : undefined }}
              >
                {fresh && <circle cx={x} cy={y} r={8} fill="none" stroke={color} strokeWidth={2} style={{ animation: 'mfRing 1.1s ease-out' }} />}
                <circle cx={x} cy={y} r={16} fill="transparent" />
                {p.date === selectedDate && <circle cx={x} cy={y} r={13} fill="none" stroke="#263238" strokeWidth={2} />}
                <circle cx={x} cy={y} r={p.added.length ? 8 : 6} fill={color} stroke="#fff" strokeWidth={1.5} />
                {labelRow.has(p.date) && (
                  <text x={x} y={CY + AMP + 24 + labelRow.get(p.date)! * 13} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{p.date.slice(5)}</text>
                )}
                {p === latest && (
                  <text x={x} y={CY - AMP - 14} textAnchor={x > width - 160 ? 'end' : x < 160 ? 'start' : 'middle'} fontSize={11.5} fontWeight={600} fill={color}>{callout(p)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <Paper
            elevation={4}
            sx={{ position: 'absolute', left: Math.min(xOfDay(hover.day) + 16, width - 300), top: CY - 20, p: 1, maxWidth: 300, pointerEvents: 'none', zIndex: 3 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{hover.date}</Typography>
            {hover.added.map((n) => <Typography key={n} variant="caption" sx={{ display: 'block', lineHeight: 1.35 }}>新增 {titleOf(topic.dir, n)}</Typography>)}
            {hover.edited.map((n) => <Typography key={n} variant="caption" sx={{ display: 'block', lineHeight: 1.35, color: 'text.secondary' }}>修改 {titleOf(topic.dir, n)}</Typography>)}
          </Paper>
        )}
      </Box>
    </Box>
  );
}

/** 横轴：每月 1 日标一个日期，所有行共用 */
function MonthAxis({ axis, totalDays, firstCommit }: { axis: Axis; totalDays: number; firstCommit: string }) {
  const ticks: number[] = [];
  for (let day = 0; day <= totalDays; day++) if (dateOf(day, firstCommit).endsWith('-01')) ticks.push(day);
  const step = axis.dayPx * 30 < 44 ? 2 : 1;
  return (
    <svg width={axis.width} height={22} style={{ display: 'block' }}>
      {ticks.map((day, i) => (
        <g key={day}>
          <line x1={axis.xOfDay(day)} x2={axis.xOfDay(day)} y1={0} y2={5} stroke="#cfd8dc" />
          {i % step === 0 && <text x={axis.xOfDay(day)} y={17} textAnchor="middle" fontSize={10} fill="#90a4ae">{dateOf(day, firstCommit).slice(5)}</text>}
        </g>
      ))}
    </svg>
  );
}

/** 发展记录：已经长到的每个有文章的日子，新增、修改了哪些文章，最新的在上 */
function DevLog({ topic, cursor, titleOf, selectedDate }: { topic: Topic; cursor: number; titleOf: (dir: string, name: string) => string; selectedDate: string | null }) {
  const color = GROUP_BY_KEY[topic.group].color;
  const seen = topic.points.filter((p) => p.day <= cursor).reverse();
  if (!seen.length) return null;
  return (
    <Box sx={{ mx: `${PAD_X}px`, mt: 1, maxHeight: 260, overflowY: 'auto', borderLeft: 2, borderColor: color, pl: 1.5 }}>
      {seen.map((p, i) => (
        <Box key={p.date} sx={{ py: 0.5, px: 1, opacity: i === 0 || p.date === selectedDate ? 1 : 0.7, bgcolor: p.date === selectedDate ? '#eef1fb' : undefined, borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: i === 0 ? color : 'text.secondary' }}>
            {p.date}{i === 0 ? ' · 最新' : ''}
          </Typography>
          {p.added.map((n) => <Typography key={n} variant="body2" sx={{ lineHeight: 1.4 }}>新增 {titleOf(topic.dir, n)}</Typography>)}
          {p.edited.map((n) => <Typography key={n} variant="body2" sx={{ lineHeight: 1.4, color: 'text.secondary' }}>修改 {titleOf(topic.dir, n)}</Typography>)}
        </Box>
      ))}
    </Box>
  );
}

export default function TopicLines({ history, index, graph }: { history: History; index: ContentIndex; graph: WikiGraph }) {
  const { entries, totalDays } = useMemo(() => buildEntries(history, index, graph), [history, index, graph]);
  const topics = useMemo(() => loadTopics(history), [history]);
  // 两种看法：当下活跃（跟着播放自动出现、退场）和选择主题（单看一个主题的整条发展线）
  const [mode, setMode] = useState<'live' | 'pick'>('live');
  const [picked, setPicked] = useState<Topic | null>(null);
  const busiest = useMemo(() => topics.reduce((a, b) => (b.points.length > a.points.length ? b : a), topics[0]), [topics]);
  const focus = picked ?? busiest;
  // 所有主题同样的起止：从第一次提交到最后一次提交
  const range: [number, number] = [0, totalDays];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(1100);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setViewW(Math.max(560, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const axis = useMemo((): Axis => {
    const dayPx = (viewW - PAD_X * 2) / (totalDays + 1);
    const periodDays = Math.max(7, Math.round(PERIOD_PX / dayPx / 7) * 7);
    const xOfDay = (day: number) => PAD_X + Math.min(Math.max(day, 0), totalDays + 1) * dayPx;
    return { dayPx, periodDays, width: viewW, xOfDay };
  }, [viewW, totalDays]);

  // 「当下活跃」的舞台：从第一天一路排下来，已经在台上的主题只要还在更新就留着，
  // 当天有更新的新主题只补空位，这样一个主题能把自己的故事讲完，不会一天一换
  const stage = useMemo(() => {
    const lastOn = (t: Topic, c: number) => t.points.filter((p) => p.day <= c).at(-1)?.day ?? -1;
    const byDay: Topic[][] = [];
    let on: Topic[] = [];
    for (let c = 0; c <= totalDays; c++) {
      on = on.filter((t) => c - lastOn(t, c) < ACTIVE_WINDOW);
      for (const t of topics) if (on.length < MAX_SHOWN && !on.includes(t) && t.points.some((p) => p.day === c)) on = [...on, t];
      byDay.push(on);
    }
    return byDay;
  }, [topics, totalDays]);
  // 播放节奏跟着屏幕上的内容走：平静的日子一晃而过，快到有文章的日子慢下来。
  // 「选择主题」看这个主题的活跃度，「当下活跃」看那天台上主题的
  const focusAct = useMemo(() => focus && activity(focus.points), [focus]);
  const stageAct = useMemo(() => stage.map((on) => activity(on.flatMap((t) => t.points))), [stage]);
  const dwell = useCallback((day: number) => {
    const act = mode === 'pick' ? focusAct : stageAct[day];
    return PLAY_QUIET_MS + PLAY_BUSY_MS * (act?.(day + 0.5) ?? 0);
  }, [mode, focusAct, stageAct]);
  const stepOf = useCallback((day: number): Step => ({ delay: 0, grow: dwell(day) }), [dwell]);
  // 和知识之树一样：鼠标在波浪上或选中了某一天就停住，移开、关掉详情后接着长
  const [hovering, setHovering] = useState(false);
  const [selected, setSelected] = useState<{ dir: string; point: Point } | null>(null);
  // 有主题在出场回顾时，主播放停住等它回顾完
  const [introDay, setIntroDay] = useState<Record<string, number>>({});
  const onIntro = useCallback((dir: string, day: number | null) => {
    setIntroDay((m) => {
      if (m[dir] === (day ?? undefined)) return m;
      const next = { ...m };
      if (day === null) delete next[dir];
      else next[dir] = day;
      return next;
    });
  }, []);
  const introducing = Object.keys(introDay);
  const held = hovering || selected !== null || introducing.length > 0;
  const pb = usePlayback(range[1], dwell, 1, held);
  const { cursor, playing, setCursor, setPlaying, speed } = pb;
  const cur = stepOf(cursor);
  const step = playing && !held && cursor < range[1] ? { delay: cur.delay / speed, grow: cur.grow / speed } : NO_STEP;
  // 整条波先画好，再用裁剪框露出来：播放时在这一步里先停 delay，再匀速扩到下一天
  const reveal = axis.xOfDay(step.grow > 0 ? cursor + 1 : cursor);

  const choose = (m: 'live' | 'pick', t: Topic | null) => {
    setMode(m);
    setPicked(t);
    setPlaying(false);
    setSelected(null);
    setCursor(totalDays);
  };

  const shown = mode === 'pick' ? (focus ? [focus] : []) : (stage[cursor] ?? []);

  const titleOf = useCallback((dir: string, name: string) => index.byPath.get(`${dir}/${name}`)?.title ?? name.replace(/\.md$/, ''), [index]);

  if (!topics.length) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>当前数据还没有主题脉络，重新同步内容后再看。</Typography>;
  }

  return (
    <Box sx={{ '@keyframes mfTopicIn': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'none' } } }}>
      <PlaybackBar pb={pb} history={history} entries={entries} totalDays={totalDays} onSelect={() => {}} startDay={range[0]} endDay={range[1]} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && choose(v, picked)}>
          <ToggleButton value="live" sx={{ textTransform: 'none', px: 1.5 }}>当下活跃</ToggleButton>
          <ToggleButton value="pick" sx={{ textTransform: 'none', px: 1.5 }}>选择主题</ToggleButton>
        </ToggleButtonGroup>
        {mode === 'pick' ? (
          <Autocomplete
            size="small"
            disableClearable
            options={topics}
            value={focus}
            onChange={(_, v) => choose('pick', v)}
            groupBy={(t) => GROUP_BY_KEY[t.group].label}
            getOptionLabel={(t) => t.label}
            isOptionEqualToValue={(a, b) => a.dir === b.dir}
            renderOption={(props, t) => (
              <li {...props} key={t.dir}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                  <span>{t.label}</span>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t.points[0].date.slice(5)} → {t.points.at(-1)!.date.slice(5)} · {t.points.length} 天
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => <TextField {...params} placeholder="选择主题" />}
            sx={{ width: 360 }}
          />
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>播放时只出现最近 {ACTIVE_WINDOW} 天里有更新的主题，沉寂下来就退场</Typography>
        )}
      </Box>
      {!shown.length && (
        <Typography variant="body2" sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>这几天没有主题在更新</Typography>
      )}
      <Box
        ref={wrapRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <style>{`@keyframes mfRing { from { r: 8; opacity: .9 } to { r: 30; opacity: 0 } } @keyframes mfDotIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
        {shown.map((t) => (
          <TopicRow
            key={t.dir}
            topic={t}
            axis={axis}
            cursor={cursor}
            reveal={reveal}
            step={step}
            speed={speed}
            totalDays={totalDays}
            titleOf={titleOf}
            selectedDate={selected?.dir === t.dir ? selected.point.date : null}
            onPick={(p) => setSelected({ dir: t.dir, point: p })}
            onIntro={onIntro}
          />
        ))}
        {shown.length > 0 && <MonthAxis axis={axis} totalDays={totalDays} firstCommit={history.firstCommit} />}
      </Box>
      <Typography variant="caption" sx={{ display: 'block', px: `${PAD_X}px`, color: held ? '#1a237e' : 'text.secondary' }}>
        {introducing.length && !hovering && !selected ? '正在回顾这个主题从第一天到今天的发展，回顾完接着往前长' : held ? '已暂停 · 悬停圆点看那天的文章，点击看详情' : playing ? '正在一天天往前长 · 鼠标移到波浪上暂停查看' : '点 ▶ 播放；鼠标移到波浪上查看，点圆点看详情'}
      </Typography>
      {selected && (
        <Paper variant="outlined" sx={{ mx: `${PAD_X}px`, mt: 1, p: 1.5, position: 'relative', borderColor: GROUP_BY_KEY[selected.dir.split('/')[0]]?.color }}>
          <IconButton size="small" onClick={() => setSelected(null)} sx={{ position: 'absolute', top: 4, right: 4 }} title="关闭，继续播放"><CloseRounded fontSize="small" /></IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{selected.dir} · {selected.point.date}</Typography>
          {selected.point.added.map((n) => (
            <Typography key={n} variant="body2">新增 <Link href={docHash(`${selected.dir}/${n}`)}>{titleOf(selected.dir, n)}</Link></Typography>
          ))}
          {selected.point.edited.map((n) => (
            <Typography key={n} variant="body2" sx={{ color: 'text.secondary' }}>修改 <Link href={docHash(`${selected.dir}/${n}`)}>{titleOf(selected.dir, n)}</Link></Typography>
          ))}
        </Paper>
      )}
      {mode === 'pick' && focus && <DevLog topic={focus} cursor={introDay[focus.dir] ?? cursor} titleOf={titleOf} selectedDate={selected?.dir === focus.dir ? selected.point.date : null} />}
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
        一个目录就是一个主题，只算它直接下面的文章。所有主题共用同一条时间轴（第一天到最后一天），每个主题一条连续的正弦波，
        都是标准的正弦波，摆幅和周期不变，从第一天到最后一天正好整数个周期；文章多的主题波密一些，文章少的疏一些。
        有文章的日子是串在波上的圆点（大圆点有新文章，小圆点只修改）。
        播放的快慢也跟着内容：平静的日子一晃而过，快到有文章的日子慢下来；波先长到，圆点才亮，旁边显示那天的文章。
        主题出场时先从第一天回顾到当天，回顾完再接着往前播。鼠标移到波浪上暂停，悬停、点选圆点看详情。
        「当下活跃」最多同时看 {MAX_SHOWN} 个主题，台上的主题沉寂 {ACTIVE_WINDOW} 天才退场；「选择主题」单看一个主题，
        下方是它的发展记录。全库改名、批量改链接这类一次动几十个文件的提交不算作修改。
      </Typography>
    </Box>
  );
}
