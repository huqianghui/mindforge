import { useEffect, useState } from 'react';

const BASE_MS = 140; // 1× 时每天的间隔，speed 倍时除以倍数

export interface Playback {
  cursor: number;
  setCursor: (d: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
}

/** 播放：光标一天一天往前走，走到最后一天自动停 */
export function usePlayback(totalDays: number): Playback {
  const [cursor, setCursor] = useState(totalDays);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setCursor((c) => {
        if (c >= totalDays) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, BASE_MS / speed);
    return () => window.clearInterval(t);
  }, [playing, speed, totalDays]);
  return { cursor, setCursor, playing, setPlaying, speed, setSpeed };
}
