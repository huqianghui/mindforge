import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useGraphData } from './hooks/useGraphData';
import FilterBar from './components/FilterBar';
import GraphViewer from './components/GraphViewer';
import NodePanel from './components/NodePanel';
import Legend from './components/Legend';
import type { GraphNode } from './types';

export default function GraphPage() {
  const {
    graphData,
    allNodes,
    allLinks,
    stats,
    loading,
    activeNodeTypes,
    toggleNodeType,
    activeRelationTypes,
    toggleRelationType,
  } = useGraphData();

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSearchSelect = useCallback((nodeId: string) => {
    setFocusNodeId(nodeId);
  }, []);

  const handleFocusHandled = useCallback(() => {
    setFocusNodeId(null);
  }, []);

  const handleNavigate = useCallback(
    (nodeId: string) => {
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setFocusNodeId(nodeId);
      }
    },
    [graphData.nodes]
  );

  if (loading) {
    return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography>加载知识图谱数据...</Typography>
        </Box>
    );
  }

  return (
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <FilterBar
          stats={stats}
          allNodes={allNodes}
          activeNodeTypes={activeNodeTypes}
          toggleNodeType={toggleNodeType}
          activeRelationTypes={activeRelationTypes}
          toggleRelationType={toggleRelationType}
          onSearchSelect={handleSearchSelect}
        />
        <Box sx={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GraphViewer
            graphData={graphData}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
            focusNodeId={focusNodeId}
            onFocusHandled={handleFocusHandled}
            panelOpen={!!selectedNode}
          />
          <Legend />
          <NodePanel
            node={selectedNode}
            allLinks={allLinks}
            onClose={handleClosePanel}
            onNavigate={handleNavigate}
          />
        </Box>
      </Box>
  );
}
