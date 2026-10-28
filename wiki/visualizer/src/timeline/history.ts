import { useEffect, useState } from 'react';
import { contentUrl } from '../docs/content';
import type { WikiGraph } from '../types';

// 结构与 scripts/history.py 输出一致；所有日期都是 git commit 时间
export interface WeekPoint {
  week: string;
  commits: number;
  articlesAdded: number;
  nodesAdded: number;
  articles: number;
  concepts: number;
  methods: number;
  decisions: number;
}

export interface GraphPoint {
  date: string;
  commit: string;
  concepts: number;
  methods: number;
  decisions: number;
  links: number;
  claims: number;
  active: number;
  stale: number;
  lowConfidence: number;
  avgConfidence: number;
  categories: Record<string, number>;
}

export interface GapSuggestion {
  title: string;
  priority: 'high' | 'medium' | 'low' | null;
  carried: boolean;
  landed: { node: string; date: string }[];
}

export interface GapReport {
  path: string;
  date: string;
  title: string;
  suggestions: GapSuggestion[];
}

export interface History {
  firstCommit: string;
  lastCommit: string;
  totals: { commits: number; activeDays: number; articles: number; nodes: number; gapReports: number };
  weeks: WeekPoint[];
  /** 有提交的日子：[日期, 提交数] */
  days: [string, number][];
  graph: GraphPoint[];
  gaps: GapReport[];
  /** path -> [首次提交日期, 修改次数] */
  docs: Record<string, [string, number]>;
}

let cached: Promise<History> | null = null;
let graphCached: Promise<WikiGraph> | null = null;

/** 时间轴叠加相关性要用当前图谱（节点摘要、关系、Claim 来源） */
export function useWikiGraph(): WikiGraph | null {
  const [graph, setGraph] = useState<WikiGraph | null>(null);
  useEffect(() => {
    graphCached ??= fetch(`${import.meta.env.BASE_URL}wiki-graph.json`).then((res) => res.json());
    graphCached.then(setGraph).catch((err) => console.error('Failed to load wiki-graph.json', err));
  }, []);
  return graph;
}

function loadHistory(): Promise<History> {
  cached ??= fetch(contentUrl('history.json')).then((res) => (res.ok ? res.json() : Promise.reject(res.status)));
  return cached;
}

/** 旧版同步数据没有 history.json 时返回 null，调用方按"无数据"处理 */
export function useHistory(): { history: History | null; failed: boolean } {
  const [history, setHistory] = useState<History | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    loadHistory().then(setHistory, () => setFailed(true));
  }, []);
  return { history, failed };
}

/** 某个日期当时（之前最近一次）的图谱快照 */
export function graphAt(history: History, day: string): GraphPoint | undefined {
  let found: GraphPoint | undefined;
  for (const p of history.graph) {
    if (p.date <= day) found = p;
  }
  return found;
}
