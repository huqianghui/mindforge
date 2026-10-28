import type { ContentIndex } from '../docs/content';
import type { WikiGraph, WikiNode } from '../types';
import type { GapReport, History } from './history';

// 时间轴与知识之树共用的数据：每篇文章、每个 wiki 节点、每期差距报告各是一个条目，
// 日期取它在 GitHub 上的首次提交
export type Kind = 'gap' | 'concept' | 'method' | 'decision' | 'article';

export interface Group {
  key: string;
  label: string;
  color: string;
}

export const GROUPS: Group[] = [
  { key: 'gap', label: '知识差距', color: '#e53935' },
  { key: 'concept', label: '概念', color: '#4A90D9' },
  { key: 'method', label: '方法', color: '#50C878' },
  { key: 'decision', label: '决策', color: '#FF8C42' },
  { key: 'Notes', label: '笔记', color: '#5c6bc0' },
  { key: 'Azure', label: 'Azure', color: '#0288d1' },
  { key: 'paper', label: '论文', color: '#8e24aa' },
  { key: 'book', label: '读书', color: '#6d4c41' },
  { key: 'product', label: '产品', color: '#00897b' },
];
export const GROUP_BY_KEY: Record<string, Group> = Object.fromEntries(GROUPS.map((g) => [g.key, g]));

export interface Entry {
  key: string;
  kind: Kind;
  group: string;
  day: number;
  date: string;
  title: string;
  path?: string;
  node?: WikiNode;
  gap?: { report: GapReport; index: number };
  edits?: number;
}

const NODE_DIR: Record<string, Kind> = { 'wiki/concepts/': 'concept', 'wiki/methods/': 'method', 'wiki/decisions/': 'decision' };
const DAY_MS = 86_400_000;

export const dayIndex = (d: string, first: string) => Math.round((Date.parse(d) - Date.parse(first)) / DAY_MS);
export const dateOf = (i: number, first: string) => new Date(Date.parse(first) + i * DAY_MS).toISOString().slice(0, 10);
// Claim 的 source 是去掉空格的文章标题，比较前两边都去掉空白和标点
const norm = (s: string) => s.replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();

export function buildEntries(history: History, index: ContentIndex, graph: WikiGraph): { entries: Entry[]; totalDays: number } {
  const first = history.firstCommit;
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const entries: Entry[] = [];
  history.gaps.forEach((report, i) => {
    entries.push({ key: report.path, kind: 'gap', group: 'gap', day: dayIndex(report.date, first), date: report.date, title: report.title, path: report.path, gap: { report, index: i } });
  });
  for (const [path, [created, edits]] of Object.entries(history.docs)) {
    const dir = Object.keys(NODE_DIR).find((d) => path.startsWith(d));
    const title = index.byPath.get(path)?.title ?? path;
    if (dir) {
      const node = nodeById.get(path.slice(dir.length).replace(/\.md$/, ''));
      entries.push({ key: path, kind: NODE_DIR[dir], group: NODE_DIR[dir], day: dayIndex(created, first), date: created, title: node?.title ?? title, path, node, edits });
      continue;
    }
    const top = path.split('/')[0];
    if (GROUP_BY_KEY[top] && path.includes('/')) {
      entries.push({ key: path, kind: 'article', group: top, day: dayIndex(created, first), date: created, title, path, edits });
    }
  }
  entries.sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  return { entries, totalDays: dayIndex(history.lastCommit, first) };
}

/** 选中条目时叠加相关性：概念之间的关系、文章与它贡献的节点、差距报告与这一期新增的内容 */
export function relatedOf<T extends Entry>(selected: T | null, entries: T[], graph: WikiGraph, history: History): { related: T[]; contributes: T[] } {
  if (!selected) return { related: [], contributes: [] };
  if (selected.gap) {
    const next = history.gaps[selected.gap.index + 1]?.date ?? '9999';
    return { related: entries.filter((i) => i.kind !== 'gap' && i.date >= selected.date && i.date < next), contributes: [] };
  }
  if (selected.node) {
    const id = selected.node.id;
    const byNode = new Map(entries.filter((e) => e.node).map((e) => [e.node!.id, e]));
    const rel = graph.links
      .filter((l) => l.source === id || l.target === id)
      .map((l) => byNode.get(l.source === id ? l.target : l.source))
      .filter((x): x is T => !!x);
    const sources = new Set(selected.node.claims.map((c) => norm(c.source)));
    return {
      related: [...new Map(rel.map((r) => [r.key, r])).values()],
      contributes: entries.filter((i) => i.kind === 'article' && sources.has(norm(i.title))),
    };
  }
  const t = norm(selected.title);
  return { related: [], contributes: entries.filter((i) => i.node?.claims.some((c) => norm(c.source) === t)) };
}
