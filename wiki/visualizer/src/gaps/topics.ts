import type { GapReport, GapTopics, GapTrend, History, Priority } from '../timeline/history';

// 差距追踪页的数据：把每期报告的 trends 按 topic 归并成"主题 × 期数"

export const ACTION_LABELS: Record<NonNullable<GapTrend['action']>, string> = {
  deep: '深入学习',
  page: '建页',
  claim: '补 Claim',
  overview: '了解概况',
  watch: '观望',
};

export const SIGNAL_LABELS: Record<string, string> = { github: 'GitHub', arxiv: 'arXiv', hf: 'HF', introspection: '内省' };

export const LINE_COLORS: Record<string, string> = {
  voice: '#8e24aa',
  agent: '#1e88e5',
  harness: '#00897b',
  rl: '#ef6c00',
  inference: '#6d4c41',
  pkc: '#3949ab',
  engineering: '#827717',
  other: '#78909c',
};

const WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
const RANK: Priority[] = ['high', 'medium', 'low'];

export interface Appearance {
  index: number; // 第几期（0 起）
  report: GapReport;
  trends: GapTrend[]; // 同一期可能有多条落在同一主题
  priority: Priority | null; // 这一期里最高的优先级
}

export type TopicState = 'new' | 'ongoing' | 'back' | 'cooling' | 'dormant';

export const STATE_LABELS: Record<TopicState, { label: string; color: string; hint: string }> = {
  new: { label: '新出现', color: '#d81b60', hint: '最近一期第一次出现' },
  ongoing: { label: '持续', color: '#e53935', hint: '最近两期及以上连续出现' },
  back: { label: '再现', color: '#8e24aa', hint: '最近一期出现，上一期没有，更早出现过' },
  cooling: { label: '降温', color: '#fb8c00', hint: '最近一期没有，但前两期内出现过' },
  dormant: { label: '沉寂', color: '#90a4ae', hint: '前三期都没出现' },
};

export interface Topic {
  slug: string;
  label: string;
  line: string;
  appearances: Appearance[];
  /** 加权热度：每次出现按优先级记 3/2/1 */
  score: number;
  /** 截至最近一期的连续出现期数 */
  streak: number;
  firstSeen: string;
  lastSeen: string;
  state: TopicState;
  /** 关联 wiki 节点（去重）；landed 指在首次提到之后才建页 */
  nodes: { node: string; path: string; date: string; landed: boolean }[];
}

/** 只保留带 trends 的报告；旧数据没有 trends 时返回空 */
export function reportsWithTrends(history: History): GapReport[] {
  return history.gaps.filter((g) => (g.trends?.length ?? 0) > 0);
}

export function buildTopics(reports: GapReport[], registry: GapTopics): Topic[] {
  const last = reports.length - 1;
  const bySlug = new Map<string, Appearance[]>();
  reports.forEach((report, index) => {
    const groups = new Map<string, GapTrend[]>();
    for (const t of report.trends ?? []) groups.set(t.topic, [...(groups.get(t.topic) ?? []), t]);
    for (const [slug, trends] of groups) {
      const priority = RANK.find((p) => trends.some((t) => t.priority === p)) ?? null;
      bySlug.set(slug, [...(bySlug.get(slug) ?? []), { index, report, trends, priority }]);
    }
  });

  return [...bySlug.entries()].map(([slug, appearances]) => {
    const meta = registry.topics[slug] ?? { label: slug, line: 'other' };
    const seen = new Set(appearances.map((a) => a.index));
    let streak = 0;
    for (let i = last; i >= 0 && seen.has(i); i--) streak++;
    const lastIndex = appearances.at(-1)!.index;
    const state: TopicState =
      lastIndex === last
        ? appearances.length === 1 ? 'new' : streak >= 2 ? 'ongoing' : 'back'
        : last - lastIndex <= 2 ? 'cooling' : 'dormant';
    const nodes = new Map<string, Topic['nodes'][number]>();
    for (const a of appearances) {
      for (const t of a.trends) {
        for (const n of t.nodes) {
          const prev = nodes.get(n.node);
          // 同一节点在多期出现时，以最早提到它的那期判断是否"之后才建页"
          if (!prev) nodes.set(n.node, { node: n.node, path: n.path, date: n.date, landed: n.landed });
        }
      }
    }
    return {
      slug,
      label: meta.label,
      line: meta.line,
      appearances,
      score: appearances.reduce((s, a) => s + (a.priority ? WEIGHT[a.priority] : 1), 0),
      streak,
      firstSeen: appearances[0].report.date,
      lastSeen: appearances.at(-1)!.report.date,
      state,
      nodes: [...nodes.values()],
    };
  });
}

/** 排序：先看最近是否还在（连续期数），再看总热度 */
export function sortTopics(topics: Topic[]): Topic[] {
  return [...topics].sort((a, b) => b.streak - a.streak || b.score - a.score || a.label.localeCompare(b.label));
}
