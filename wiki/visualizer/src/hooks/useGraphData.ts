import { useState, useEffect, useMemo } from 'react';
import type { WikiGraph, WikiNode, WikiLink, WikiCategory, WikiGraphStats, GraphNode, GraphLink, GraphData } from '../types';
import { NODE_COLORS, RELATION_COLORS, getNodeSize } from '../theme';

interface UseGraphDataReturn {
  graphData: GraphData;
  allNodes: WikiNode[];
  allLinks: WikiLink[];
  categories: WikiCategory[];
  stats: WikiGraphStats | null;
  loading: boolean;
  activeNodeTypes: Set<string>;
  toggleNodeType: (type: string) => void;
  activeRelationTypes: Set<string>;
  toggleRelationType: (type: string) => void;
}

export function useGraphData(): UseGraphDataReturn {
  const [raw, setRaw] = useState<WikiGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<string>>(
    new Set(['concept', 'method', 'decision'])
  );
  const [activeRelationTypes, setActiveRelationTypes] = useState<Set<string>>(
    new Set(Object.keys(RELATION_COLORS))
  );

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}wiki-graph.json`)
      .then((res) => res.json())
      .then((data: WikiGraph) => {
        setRaw(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load wiki-graph.json', err);
        setLoading(false);
      });
  }, []);

  const toggleNodeType = (type: string) => {
    setActiveNodeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleRelationType = (type: string) => {
    setActiveRelationTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const graphData = useMemo<GraphData>(() => {
    if (!raw) return { nodes: [], links: [] };

    const claimsCounts = raw.nodes.map((n) => n.claims_count);
    const minCount = Math.min(...claimsCounts);
    const maxCount = Math.max(...claimsCounts);

    const filteredNodes = raw.nodes.filter((n) => activeNodeTypes.has(n.type));
    const nodeIdSet = new Set(filteredNodes.map((n) => n.id));

    const nodes: GraphNode[] = filteredNodes.map((n) => ({
      ...n,
      color: NODE_COLORS[n.type] || '#999',
      val: getNodeSize(n.claims_count, minCount, maxCount),
    }));

    const links: GraphLink[] = raw.links
      .filter(
        (l) =>
          nodeIdSet.has(l.source) &&
          nodeIdSet.has(l.target) &&
          activeRelationTypes.has(l.relation_type)
      )
      .map((l) => ({
        source: l.source,
        target: l.target,
        relation_type: l.relation_type,
        description: l.description,
        color: RELATION_COLORS[l.relation_type] || RELATION_COLORS.untyped,
      }));

    return { nodes, links };
  }, [raw, activeNodeTypes, activeRelationTypes]);

  return {
    graphData,
    allNodes: raw?.nodes ?? [],
    allLinks: raw?.links ?? [],
    categories: raw?.categories ?? [],
    stats: raw?.stats ?? null,
    loading,
    activeNodeTypes,
    toggleNodeType,
    activeRelationTypes,
    toggleRelationType,
  };
}
