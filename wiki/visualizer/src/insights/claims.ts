import type { WikiGraph, WikiNode } from '../types';

// 洞察页的数据：把图谱展平成一行一条 Claim，筛选与聚合都在这张表上做
export interface ClaimRow {
  id: string; // nodeId#序号
  nodeId: string;
  nodeTitle: string;
  type: WikiNode['type'];
  category: string;
  tags: string[];
  statement: string;
  confidence: number;
  status: string;
  source: string;
  firstSeen: string;
  lastUpdated: string;
  evidence?: string;
}

export const UNCATEGORIZED = '未分类';

export function flatten(graph: WikiGraph): ClaimRow[] {
  return graph.nodes.flatMap((n) =>
    n.claims.map((c, i) => ({
      id: `${n.id}#${i}`,
      nodeId: n.id,
      nodeTitle: n.title,
      type: n.type,
      category: n.category || UNCATEGORIZED,
      tags: n.tags,
      statement: c.statement,
      confidence: c.confidence,
      status: c.status,
      source: c.source,
      firstSeen: c.first_seen,
      lastUpdated: c.last_updated,
      evidence: c.evidence,
    })),
  );
}

export interface Filters {
  types: string[];
  statuses: string[];
  categories: string[];
  tag: string | null;
  month: string | null; // last_updated 的 YYYY-MM
  conf: [number, number];
  q: string;
}

export const EMPTY: Filters = { types: [], statuses: [], categories: [], tag: null, month: null, conf: [0, 1], q: '' };

export function apply(rows: ClaimRow[], f: Filters, except?: keyof Filters): ClaimRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (except === 'types' || f.types.length === 0 || f.types.includes(r.type)) &&
      (except === 'statuses' || f.statuses.length === 0 || f.statuses.includes(r.status)) &&
      (except === 'categories' || f.categories.length === 0 || f.categories.includes(r.category)) &&
      (except === 'tag' || !f.tag || r.tags.includes(f.tag)) &&
      (except === 'month' || !f.month || r.lastUpdated.startsWith(f.month)) &&
      (except === 'conf' || (r.confidence >= f.conf[0] && r.confidence <= f.conf[1])) &&
      (!q || r.statement.toLowerCase().includes(q) || r.nodeTitle.toLowerCase().includes(q)),
  );
}

// 筛选条件写进 hash 的查询串：#/insights?type=concept&status=stale&cat=...，刷新与分享都能还原
export function parseFilters(query: string): Filters {
  const p = new URLSearchParams(query);
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(',').filter(Boolean) : []);
  const conf = (p.get('conf') ?? '').split('-').map(Number);
  return {
    types: list('type'),
    statuses: list('status'),
    categories: list('cat'),
    tag: p.get('tag'),
    month: p.get('month'),
    conf: conf.length === 2 && conf.every((x) => !Number.isNaN(x)) ? [conf[0], conf[1]] : [0, 1],
    q: p.get('q') ?? '',
  };
}

export function stringifyFilters(f: Filters): string {
  const p = new URLSearchParams();
  if (f.types.length) p.set('type', f.types.join(','));
  if (f.statuses.length) p.set('status', f.statuses.join(','));
  if (f.categories.length) p.set('cat', f.categories.join(','));
  if (f.tag) p.set('tag', f.tag);
  if (f.month) p.set('month', f.month);
  if (f.conf[0] > 0 || f.conf[1] < 1) p.set('conf', `${f.conf[0]}-${f.conf[1]}`);
  if (f.q) p.set('q', f.q);
  return p.toString();
}

/** 列表里切换一个值：有就去掉，没有就加上 */
export const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x]);

// Claim 的 source 是去掉空格的文章标题；两边去掉空白和标点后比较，用来从 Claim 跳回原文
export const norm = (s: string) => s.replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();
