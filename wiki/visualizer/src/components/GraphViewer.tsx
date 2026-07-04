import { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { forceCollide } from 'd3-force-3d';
import Box from '@mui/material/Box';
import type { GraphData, GraphNode, GraphLink } from '../types';
import { RELATION_COLORS } from '../theme';

const nodeRadius = (node: GraphNode) => Math.sqrt(node.val) * 1.5;

interface GraphViewerProps {
  graphData: GraphData;
  selectedNode: GraphNode | null;
  onNodeClick: (node: GraphNode) => void;
  focusNodeId: string | null;
  onFocusHandled: () => void;
  panelOpen: boolean;
}

export default function GraphViewer({
  graphData,
  selectedNode,
  onNodeClick,
  focusNodeId,
  onFocusHandled,
  panelOpen,
}: GraphViewerProps) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight - 64 });
  // 拖拽回弹用：默认摩擦保持动态；回弹阶段临时加大摩擦让节点缓慢归位
  const [velocityDecay, setVelocityDecay] = useState(0.3);
  const dragTimers = useRef<number[]>([]);

  useEffect(() => () => dragTimers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const handleResize = () => {
      const w = panelOpen ? window.innerWidth - 350 : window.innerWidth;
      setDimensions({ width: w, height: window.innerHeight - 64 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panelOpen]);

  // 调力学参数：加大斥力 + 拉长连线 + 防重叠，让节点散开、布局更干净
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-260).distanceMax(600);
    fg.d3Force('link')?.distance(90).strength(0.35);
    fg.d3Force('collide', forceCollide<GraphNode>((n) => nodeRadius(n) + 8).iterations(2));
    fg.d3ReheatSimulation();
  }, [graphData]);

  useEffect(() => {
    if (focusNodeId && fgRef.current) {
      const node = graphData.nodes.find((n) => n.id === focusNodeId);
      if (node) {
        fgRef.current.centerAt(
          (node as GraphNode & { x?: number }).x ?? 0,
          (node as GraphNode & { y?: number }).y ?? 0,
          800
        );
        fgRef.current.zoom(3, 800);
        onNodeClick(node);
      }
      onFocusHandled();
    }
  }, [focusNodeId, graphData.nodes, onNodeClick, onFocusHandled]);

  const highlightNodes = useCallback(() => {
    const set = new Set<string>();
    const target = hoverNode || selectedNode;
    if (!target) return set;
    set.add(target.id);
    graphData.links.forEach((l) => {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      if (src === target.id) set.add(tgt);
      if (tgt === target.id) set.add(src);
    });
    return set;
  }, [hoverNode, selectedNode, graphData.links]);

  const highlighted = highlightNodes();

  const nodeCanvasObject = useCallback(
    (node: GraphNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = Math.sqrt(node.val) * 1.5;
      const isHighlighted = highlighted.has(node.id);
      const isSelected = selectedNode?.id === node.id;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.globalAlpha = isHighlighted || highlighted.size === 0 ? 1 : 0.25;
      ctx.fill();

      if (isSelected) {
        const SEL = '#FF1744'; // 高对比选中色（红粉），在浅背景与各类节点色上都醒目

        // 扩散"雷达波"环：随时间从节点边缘向外扩张并淡出，循环
        const t = (Date.now() % 1300) / 1300; // 0..1，约 1.3s 一圈
        ctx.beginPath();
        ctx.arc(x, y, r + 3 + t * 16, 0, 2 * Math.PI);
        ctx.strokeStyle = SEL;
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 常驻发光描边环：粗环 + 阴影辉光，让选中节点始终突出
        ctx.beginPath();
        ctx.arc(x, y, r + 2.5, 0, 2 * Math.PI);
        ctx.strokeStyle = SEL;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = SEL;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (globalScale > 1.5 || isHighlighted) {
        const fontSize = Math.max(10 / globalScale, 1.5);
        ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isSelected ? '#FF1744' : '#333';
        ctx.globalAlpha = isHighlighted || highlighted.size === 0 ? 1 : 0.3;
        ctx.fillText(node.title, x, y + r + 2);
      }

      ctx.globalAlpha = 1;
    },
    [highlighted, selectedNode]
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const src = typeof link.source === 'string' ? link.source : link.source.id;
      const tgt = typeof link.target === 'string' ? link.target : link.target.id;
      if (highlighted.size > 0 && !highlighted.has(src) && !highlighted.has(tgt)) {
        return 'rgba(200,200,200,0.15)';
      }
      return RELATION_COLORS[link.relation_type] || RELATION_COLORS.untyped;
    },
    [highlighted]
  );

  return (
    <Box sx={{ position: 'relative', flex: 1, bgcolor: '#fafafa' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: GraphNode & { x?: number; y?: number }, color, ctx) => {
          const r = Math.sqrt(node.val) * 1.5;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
          ctx.fill();
        }}
        linkColor={linkColor}
        linkWidth={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={(node) => onNodeClick(node as GraphNode)}
        onNodeHover={(node) => setHoverNode((node as GraphNode) || null)}
        onNodeDragEnd={(node) => {
          type PinNode = GraphNode & { x?: number; y?: number; fx?: number; fy?: number };
          const n = node as PinNode;
          // 收集被拖节点 + 直接相邻节点，作为一簇一起停留
          const cluster: PinNode[] = [n];
          graphData.links.forEach((l) => {
            const src = typeof l.source === 'string' ? l.source : l.source.id;
            const tgt = typeof l.target === 'string' ? l.target : l.target.id;
            const otherId = src === n.id ? tgt : tgt === n.id ? src : null;
            if (otherId) {
              const nb = graphData.nodes.find((g) => g.id === otherId) as PinNode | undefined;
              if (nb && !cluster.includes(nb)) cluster.push(nb);
            }
          });
          // 冻结整簇在拉出的位置，供阅读观察
          cluster.forEach((c) => {
            c.fx = c.x;
            c.fy = c.y;
          });
          dragTimers.current.forEach(clearTimeout);
          dragTimers.current = [];
          const HOLD = 2600; // 停留观察窗口
          // 停留后：加大摩擦 → 释放钉住 → 轻加热，让整簇缓慢回弹
          dragTimers.current.push(
            window.setTimeout(() => {
              setVelocityDecay(0.6);
              cluster.forEach((c) => {
                c.fx = undefined;
                c.fy = undefined;
              });
              fgRef.current?.d3ReheatSimulation();
            }, HOLD)
          );
          // 回弹结束后恢复默认动态摩擦
          dragTimers.current.push(
            window.setTimeout(() => setVelocityDecay(0.3), HOLD + 3000)
          );
        }}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={velocityDecay}
      />
    </Box>
  );
}
