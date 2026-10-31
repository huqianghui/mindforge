import { useEffect, useState } from 'react';

const BASE_MS = 350; // 1× 时每天的间隔，speed 倍时除以倍数

export interface Playback {
  cursor: number;
  setCursor: (d: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
}

/**
 * 播放：光标一天一天往前走，走到 endDay 自动停。
 * dwell(day) 给出 1× 时在这一天停留的毫秒数，不传就每天一样长；调用方要 memo 住它。
 * hold 为 true 时原地停住（比如鼠标在图上），不改变播放状态，松开后接着走
 */
export function usePlayback(endDay: number, dwell?: (day: number) => number, initialSpeed = 3, hold = false): Playback {
  const [cursor, setCursor] = useState(endDay);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  useEffect(() => {
    if (!playing || hold) return;
    const ms = (dwell?.(cursor) ?? BASE_MS) / speed;
    const t = window.setTimeout(() => {
      if (cursor >= endDay) setPlaying(false);
      else setCursor(cursor + 1);
    }, ms);
    return () => window.clearTimeout(t);
  }, [playing, hold, speed, endDay, cursor, dwell]);
  return { cursor, setCursor, playing, setPlaying, speed, setSpeed };
}
