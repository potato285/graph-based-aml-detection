import React, { useMemo, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function ForceGraphCanvas({ graphData, threshold, selectedNode, onSelectNode }) {
  const fgRef = useRef();

  // Create a fast-lookup map for nodes
  const nodesMap = useMemo(() => {
    const map = new Map();
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach((node) => {
        map.set(node.id, node);
      });
    }
    return map;
  }, [graphData]);

  // 1. Filter Nodes and Links according to Risk Threshold
  const filteredData = useMemo(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], links: [] };

    // Filter nodes
    const nodes = graphData.nodes.filter((node) => node.risk_score >= threshold);
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Filter links (ensure source and target both exist in the filtered nodes list)
    const links = graphData.links.filter((link) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes, links };
  }, [graphData, threshold]);

  // Center the graph on dataset changes
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50);
    }
  }, [graphData]);

  const getRawNodeColor = (node) => {
    if (node.risk_score < 0.5) return '#E5E7EB'; // Safe
    if (node.betti_1 === 1) return '#EF4444'; // Loop
    if (node.in_degree > 5) return '#A855F7'; // Collector
    if (node.out_degree > 5) return '#F97316'; // Distributor
    return '#EAB308'; // Mule
  };

  const getNodeColorRgba = (node) => {
    const alpha = 0.4 + node.risk_score * 0.6; // scale from 0.4 to 1.0
    if (node.risk_score < 0.5) return `rgba(229, 231, 235, ${alpha})`;
    if (node.betti_1 === 1) return `rgba(239, 68, 68, ${alpha})`;
    if (node.in_degree > 5) return `rgba(168, 85, 247, ${alpha})`;
    if (node.out_degree > 5) return `rgba(249, 115, 22, ${alpha})`;
    return `rgba(234, 179, 8, ${alpha})`;
  };

  const getLinkColor = (link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    const sourceNode = nodesMap.get(sourceId);
    const targetNode = nodesMap.get(targetId);

    const sourceRisk = sourceNode ? sourceNode.risk_score : 0;
    const targetRisk = targetNode ? targetNode.risk_score : 0;

    if (sourceRisk >= 0.7 || targetRisk >= 0.7) {
      // Highlight matching the higher risk node's classification color
      const higherRiskNode = sourceRisk >= targetRisk ? sourceNode : targetNode;
      if (higherRiskNode) {
        if (higherRiskNode.betti_1 === 1) return 'rgba(239, 68, 68, 0.7)';
        if (higherRiskNode.in_degree > 5) return 'rgba(168, 85, 247, 0.7)';
        if (higherRiskNode.out_degree > 5) return 'rgba(249, 115, 22, 0.7)';
        return 'rgba(234, 179, 8, 0.7)';
      }
    }
    return 'rgba(255, 255, 255, 0.15)'; // Safe link
  };

  const hasParticleFlow = (link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    const sourceNode = nodesMap.get(sourceId);
    const targetNode = nodesMap.get(targetId);

    const sourceRisk = sourceNode ? sourceNode.risk_score : 0;
    const targetRisk = targetNode ? targetNode.risk_score : 0;

    return sourceRisk >= 0.7 || targetRisk >= 0.7;
  };

  // Render nodes with glowing circles and custom canvas context overrides
  const drawNodeCanvas = (node, ctx, globalScale) => {
    const isSelected = selectedNode && selectedNode.id === node.id;
    const size = 3.5 + node.risk_score * 3;

    // 1. Draw Selection Glow Ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fill();

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2 / globalScale;
      ctx.stroke();
    }

    // 2. Draw Node Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColorRgba(node);
    ctx.fill();

    // Node border
    ctx.strokeStyle = node.risk_score >= 0.5 ? getRawNodeColor(node) : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.8 / globalScale;
    ctx.stroke();

    // 3. Draw ID Text Labels on zoom
    if (globalScale > 8 || isSelected) {
      const fontSize = Math.max(3.0, 9.0 / globalScale);
      ctx.font = `${fontSize}px var(--font-sans)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelected ? '#ffffff' : '#9ca3af';
      ctx.fillText(node.account_id, node.x, node.y + size + 3.5);
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '600px',
      background: 'rgba(11, 15, 25, 0.95)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden'
    }}>
      {filteredData.nodes.length === 0 ? (
        <div style={{
          display: 'flex',
          height: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)'
        }}>
          <p>No nodes exceed the current GNN risk threshold filter.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lower the slider to inspect the network topology.</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          width={window.innerWidth > 1024 ? 900 : window.innerWidth - 64}
          height={600}
          backgroundColor="#0b0f19"
          nodeLabel={(node) => `Account: ${node.account_id} (Risk: ${Math.round(node.risk_score * 100)}%)`}
          nodeCanvasObject={drawNodeCanvas}
          linkWidth={(link) => (hasParticleFlow(link) ? 2 : 1)}
          linkColor={getLinkColor}
          linkDirectionalParticles={(link) => (hasParticleFlow(link) ? 3 : 0)}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          onNodeClick={(node) => onSelectNode(node)}
          onBackgroundClick={() => onSelectNode(null)}
          cooldownTicks={100}
          d3VelocityDecay={0.4}
        />
      )}
    </div>
  );
}
