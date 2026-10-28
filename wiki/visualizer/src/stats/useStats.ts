import { useEffect, useState } from 'react';
import { contentUrl } from '../docs/content';

// 结构与 scripts/stats.py 输出一致，同步时预计算
export interface DocStats {
  words: number;
  tags: string[];
  links: { internal: number; external: number; private: number; broken: string[] };
}

export interface Series {
  name: string;
  folder: string;
  numbers: number[];
  missing: number[];
  docs: string[];
}

export interface Stats {
  docs: Record<string, DocStats>;
  series: Series[];
}

let cached: Promise<Stats> | null = null;

export function useStats(): { stats: Stats | null; failed: boolean } {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    cached ??= fetch(contentUrl('stats.json')).then((res) => (res.ok ? res.json() : Promise.reject(res.status)));
    cached.then(setStats, () => setFailed(true));
  }, []);
  return { stats, failed };
}
