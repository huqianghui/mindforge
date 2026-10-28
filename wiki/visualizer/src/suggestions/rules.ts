import type { WikiGraph, WikiNode } from '../types';
import type { History } from '../timeline/history';
import { EMPTY } from '../insights/claims';
import type { Filters } from '../insights/claims';

// 建议卡片：固定规则 + 固定阈值，以数据自身的日期为基准（不看今天），同一份数据每次结果相同。
// 每张卡写清"依据"（数字怎么说）和"动作"（该做什么），并给出涉及的节点与洞察页的筛选入口。

export const LOW_CONFIDENCE = 0.6;
export const CONFIDENT_BUT_STALE = 0.8;
export const MOSTLY_STALE_SHARE = 0.8;
export const MOSTLY_STALE_MIN_CLAIMS = 5;
export const STALE_CATEGORY_SHARE = 0.8;
export const SMALL_CATEGORY_NODES = 2;
export const SINGLE_SOURCE_MIN_CLAIMS = 3;
export const WEAK_LINK_DEGREE = 1;
export const RECENT_DAYS = 14;

export type Level = 'act' | 'check' | 'note';

export interface Target {
  label: string;
  nodeId?: string;
  path?: string;
}

export interface Suggestion {
  id: string; // 规则 id（同一规则多张卡时带后缀），用于去重与测试
  level: Level;
  title: string;
  evidence: string;
  moves: string[];
  targets: Target[];
  /** 在洞察页查看时带上的筛选 */
  insights?: Partial<Filters>;
  /** 不适合洞察页时的其他入口 */
  link?: { label: string; href: string };
}

const UNCATEGORIZED = '未分类';
const pct = (x: number) => `${Math.round(x * 100)}%`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const nodeTarget = (n: WikiNode, extra?: string): Target => ({ label: extra ? `${n.title}（${extra}）` : n.title, nodeId: n.id });

export function buildSuggestions(graph: WikiGraph, history: History | null): Suggestion[] {
  const out: Suggestion[] = [];
  const nodes = graph.nodes;
  const claims = nodes.flatMap((n) => n.claims.map((c) => ({ n, c })));
  const staleOf = (n: WikiNode) => n.claims.filter((c) => c.status === 'stale').length;

  // 行动：曾经很有把握、现在过时——最值得复核的一批
  const confidentStale = claims.filter(({ c }) => c.status === 'stale' && c.confidence >= CONFIDENT_BUT_STALE);
  if (confidentStale.length) {
    const byNode = new Map<WikiNode, number>();
    for (const { n } of confidentStale) byNode.set(n, (byNode.get(n) ?? 0) + 1);
    const top = [...byNode.entries()].sort((a, b) => b[1] - a[1]);
    out.push({
      id: 'confident-stale',
      level: 'act',
      title: '曾经很有把握、现在过时的结论',
      evidence: `${confidentStale.length} 条 Claim 置信度 ≥ ${CONFIDENT_BUT_STALE} 却已标为 stale，分布在 ${byNode.size} 个节点；占全部 Claim 的 ${pct(confidentStale.length / claims.length)}。`,
      moves: ['从下面 Claim 最多的节点开始，逐条判断"仍成立 / 已被推翻 / 需要更新数字"', '仍成立的改回 active 并补上新的证据日期'],
      targets: top.slice(0, 12).map(([n, k]) => nodeTarget(n, `${k} 条`)),
      insights: { statuses: ['stale'], conf: [CONFIDENT_BUT_STALE, 1] },
    });
  }

  // 行动：大部分结论已过时的节点
  const mostlyStale = nodes
    .filter((n) => n.claims.length >= MOSTLY_STALE_MIN_CLAIMS && staleOf(n) / n.claims.length >= MOSTLY_STALE_SHARE)
    .sort((a, b) => staleOf(b) - staleOf(a));
  if (mostlyStale.length) {
    out.push({
      id: 'mostly-stale-nodes',
      level: 'act',
      title: '大部分结论已过时的节点',
      evidence: `${mostlyStale.length} 个节点有 ≥ ${MOSTLY_STALE_MIN_CLAIMS} 条 Claim，且 ≥ ${pct(MOSTLY_STALE_SHARE)} 是 stale。这些页面整体可能已经落后于现状。`,
      moves: ['优先重读这些节点的来源文章，整页更新而不是逐条修补', '确实过时的主题，在页面开头写明"历史记录"以免误用'],
      targets: mostlyStale.slice(0, 12).map((n) => nodeTarget(n, `${staleOf(n)}/${n.claims.length} stale`)),
      insights: { statuses: ['stale'] },
    });
  }

  // 行动：整体过时的分类，每个分类一张卡
  const byCategory = new Map<string, WikiNode[]>();
  for (const n of nodes) {
    const c = n.category || UNCATEGORIZED;
    byCategory.set(c, [...(byCategory.get(c) ?? []), n]);
  }
  for (const [cat, ns] of byCategory) {
    if (cat === UNCATEGORIZED) continue;
    const cl = ns.flatMap((n) => n.claims);
    const share = cl.length ? cl.filter((c) => c.status === 'stale').length / cl.length : 0;
    if (cl.length && share >= STALE_CATEGORY_SHARE) {
      out.push({
        id: `stale-category:${cat}`,
        level: 'act',
        title: `「${cat}」整体过时`,
        evidence: `这个分类 ${ns.length} 个节点、${cl.length} 条 Claim，其中 ${pct(share)} 是 stale，平均置信度 ${(cl.reduce((s, c) => s + c.confidence, 0) / cl.length).toFixed(2)}。`,
        moves: ['先确认这个方向是否还在关注：不再关注就归档，仍关注就安排一次集中更新', '更新时顺便补方法页，让概念能落到可操作的步骤'],
        targets: ns.map((n) => nodeTarget(n)),
        insights: { categories: [cat] },
      });
    }
  }

  // 行动：差距报告里连续沿袭、一直没落地的建议
  const lastGap = history?.gaps.at(-1);
  const carried = lastGap?.suggestions.filter((s) => s.carried) ?? [];
  if (lastGap && carried.length) {
    out.push({
      id: 'carried-gap-suggestions',
      level: 'act',
      title: '差距报告里一再沿袭的建议',
      evidence: `最新一期（${lastGap.date}）${lastGap.suggestions.length} 条建议中有 ${carried.length} 条原文写明延续上期，说明它们已经被提出过、还没有完成。`,
      moves: ['挑一条拆成本周能完成的最小动作', '确实不再做的，在下一期报告里明确放弃，避免一直滚动'],
      targets: carried.map((s) => ({ label: s.title, path: lastGap.path })),
      link: { label: '在演进页看各期建议', href: '#/timeline' },
    });
  }

  // 核查：低置信度
  const low = claims.filter(({ c }) => c.confidence < LOW_CONFIDENCE);
  if (low.length) {
    const ns = [...new Set(low.map(({ n }) => n))];
    out.push({
      id: 'low-confidence',
      level: 'check',
      title: '低置信度的结论',
      evidence: `${low.length} 条 Claim 置信度 < ${LOW_CONFIDENCE}，分布在 ${ns.length} 个节点。`,
      moves: ['补一个独立来源再判断：能证实就提高置信度，证实不了就标注"待验证"'],
      targets: ns.map((n) => nodeTarget(n)),
      insights: { conf: [0, Number((LOW_CONFIDENCE - 0.05).toFixed(2))] },
    });
  }

  // 核查：只有一个来源
  const single = nodes
    .filter((n) => n.claims.length >= SINGLE_SOURCE_MIN_CLAIMS && new Set(n.claims.map((c) => c.source)).size === 1)
    .sort((a, b) => b.claims.length - a.claims.length);
  if (single.length) {
    out.push({
      id: 'single-source',
      level: 'check',
      title: '只有一个来源的节点',
      evidence: `${single.length} 个节点有 ≥ ${SINGLE_SOURCE_MIN_CLAIMS} 条 Claim，但全部来自同一篇文章，尚未经过交叉验证。`,
      moves: ['为 Claim 最多的几个节点各找一篇不同来源的材料', '两个来源说法不一致时，把分歧写进页面'],
      targets: single.slice(0, 12).map((n) => nodeTarget(n, `${n.claims.length} 条`)),
    });
  }

  // 核查：未分类
  const uncategorized = byCategory.get(UNCATEGORIZED) ?? [];
  if (uncategorized.length) {
    out.push({
      id: 'uncategorized',
      level: 'check',
      title: '还没有分类的节点',
      evidence: `${uncategorized.length} 个节点（${pct(uncategorized.length / nodes.length)}）不属于任何分类，在分类视图和成熟度统计里都看不到。`,
      moves: ['逐个归入现有分类；归不进去的多了，说明需要一个新分类'],
      targets: uncategorized.map((n) => nodeTarget(n)),
      insights: { categories: [UNCATEGORIZED] },
    });
  }

  // 提示：样本太少的分类
  const small = [...byCategory.entries()].filter(([c, ns]) => c !== UNCATEGORIZED && ns.length <= SMALL_CATEGORY_NODES);
  if (small.length) {
    out.push({
      id: 'small-categories',
      level: 'note',
      title: '样本太少的分类',
      evidence: `${small.length} 个分类只有 ≤ ${SMALL_CATEGORY_NODES} 个节点：${small.map(([c, ns]) => `${c}（${ns.length}）`).join('、')}。分类成熟度在这里不可比。`,
      moves: ['决定是扩充这个方向，还是并入相近的分类'],
      targets: small.flatMap(([, ns]) => ns.map((n) => nodeTarget(n))),
    });
  }

  // 提示：弱连接
  const degree = new Map<string, number>();
  for (const l of graph.links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }
  const weak = nodes.filter((n) => (degree.get(n.id) ?? 0) <= WEAK_LINK_DEGREE);
  if (weak.length) {
    out.push({
      id: 'weakly-linked',
      level: 'note',
      title: '几乎孤立的节点',
      evidence: `${weak.length} 个节点的关系数 ≤ ${WEAK_LINK_DEGREE}，在知识图谱里几乎是孤岛。`,
      moves: ['补上与相近概念的"扩展 / 对比 / 使用"关系'],
      targets: weak.map((n) => nodeTarget(n, `${degree.get(n.id) ?? 0} 条关系`)),
      link: { label: '在知识图谱里看', href: '#/graph' },
    });
  }

  // 提示：最近两周学了什么（以数据里最晚的日期为"今天"）
  const ref = history?.lastCommit ?? graph.generated_at.slice(0, 10);
  const recentClaims = claims.filter(({ c }) => daysBetween(c.last_updated, ref) <= RECENT_DAYS);
  const recentPages = history
    ? Object.entries(history.docs).filter(([p, [d]]) => p.startsWith('wiki/') && !p.startsWith('wiki/knowledge-gap') && daysBetween(d, ref) <= RECENT_DAYS)
    : [];
  if (recentClaims.length || recentPages.length) {
    const ns = [...new Set(recentClaims.map(({ n }) => n))];
    out.push({
      id: 'recent',
      level: 'note',
      title: `最近 ${RECENT_DAYS} 天学了什么`,
      evidence: `截至 ${ref}：新建 ${recentPages.length} 个 wiki 页面，${recentClaims.length} 条 Claim 有更新，涉及 ${ns.length} 个节点。`,
      moves: ['趁记忆新鲜，给这些节点补上与旧知识的关系'],
      targets: [
        ...recentPages.map(([p]) => ({ label: p.split('/').pop()!.replace(/\.md$/, ''), path: p })),
        ...ns.filter((n) => !recentPages.some(([p]) => p.endsWith(`/${n.id}.md`))).map((n) => nodeTarget(n)),
      ].slice(0, 16),
      insights: { month: ref.slice(0, 7) },
    });
  }

  return out;
}

export const insightsHref = (patch: Partial<Filters>, stringify: (f: Filters) => string) => {
  const q = stringify({ ...EMPTY, ...patch });
  return `#/insights${q ? `?${q}` : ''}`;
};
