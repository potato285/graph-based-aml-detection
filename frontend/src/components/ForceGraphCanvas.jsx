import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const MAX_VISIBLE_NODES = 400; // Performance cap

export default function ForceGraphCanvas({ graphData, threshold, selectedNode, onSelectNode }) {
  const fgRef = useRef();

  // Fast lookup map for nodes — only rebuilds when graphData changes
  const nodesMap = useMemo(() => {
    const map = new Map();
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach((node) => map.set(node.id, node));
    }
    return map;
  }, [graphData]);

  // Filter nodes/links by threshold. Cap at MAX_VISIBLE_NODES for performance.
  const { filteredData, isCapped } = useMemo(() => {
    if (!graphData || !graphData.nodes) return { filteredData: { nodes: [], links: [] }, isCapped: false };

    let nodes = graphData.nodes.filter((n) => n.risk_score >= threshold);
    const wasCapped = nodes.length > MAX_VISIBLE_NODES;

    // If too many nodes, prefer high-risk ones
    if (wasCapped) {
      nodes = [...nodes].sort((a, b) => b.risk_score - a.risk_score).slice(0, MAX_VISIBLE_NODES);
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((link) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { filteredData: { nodes, links }, isCapped: wasCapped };
  }, [graphData, threshold]);

  // Set forces and fit after filteredData changes. Guard all d3Force calls.
  useEffect(() => {
    if (!fgRef.current) return;
    const timeout = setTimeout(() => {
      if (!fgRef.current) return;
      try {
        fgRef.current.zoomToFit(600, 80);
        const charge = fgRef.current.d3Force('charge');
        if (charge) charge.strength(-700);
        const link = fgRef.current.d3Force('link');
        if (link) link.distance(100);
        const collision = fgRef.current.d3Force('collision');
        if (collision) collision.radius(12);
      } catch (e) {
        // Ignore transient force errors during unmount
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [filteredData]);

  // ─── Color helpers ────────────────────────────────────────────────────────
  const getRawNodeColor = (node) => {
    if (node.risk_score < 0.5) return '#E5E7EB';
    if (node.betti_1 >= 1)            return '#EF4444'; // Smurfing loop
    if ((node.in_degree  ?? 0) > 5)   return '#A855F7'; // Funnel collector
    if ((node.out_degree ?? 0) > 5)   return '#F97316'; // Scatter distributor
    return '#EAB308';                                    // Pass-through mule
  };

  const getNodeColorRgba = (node) => {
    const alpha = 0.4 + node.risk_score * 0.6;
    if (node.risk_score < 0.5) return `rgba(229, 231, 235, ${alpha})`;
    if (node.betti_1 >= 1)           return `rgba(239, 68, 68, ${alpha})`;
    if ((node.in_degree  ?? 0) > 5)  return `rgba(168, 85, 247, ${alpha})`;
    if ((node.out_degree ?? 0) > 5)  return `rgba(249, 115, 22, ${alpha})`;
    return `rgba(234, 179, 8, ${alpha})`;
  };

  // ─── Memoized callbacks (prevents graph from re-initializing on every render)
  const getLinkColor = useCallback((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    const sNode = nodesMap.get(sourceId);
    const tNode = nodesMap.get(targetId);
    const sRisk = sNode ? sNode.risk_score : 0;
    const tRisk = tNode ? tNode.risk_score : 0;

    if (sRisk >= 0.7 || tRisk >= 0.7) {
      const h = sRisk >= tRisk ? sNode : tNode;
      if (h) {
        if (h.betti_1 >= 1)           return 'rgba(239, 68, 68, 0.55)';
        if ((h.in_degree  ?? 0) > 5)  return 'rgba(168, 85, 247, 0.55)';
        if ((h.out_degree ?? 0) > 5)  return 'rgba(249, 115, 22, 0.55)';
        return 'rgba(234, 179, 8, 0.55)';
      }
    }
    return 'rgba(255, 255, 255, 0.28)';
  }, [nodesMap]);

  const hasParticleFlow = useCallback((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    const sNode = nodesMap.get(sourceId);
    const tNode = nodesMap.get(targetId);
    return (sNode?.risk_score ?? 0) >= 0.7 || (tNode?.risk_score ?? 0) >= 0.7;
  }, [nodesMap]);

  // nodeCanvasObject — only a new reference when selectedNode changes (via useCallback)
  const drawNodeCanvas = useCallback((node, ctx, globalScale) => {
    ctx.save();
    const isSelected = selectedNode && selectedNode.id === node.id;
    const size = 3 + node.risk_score * 4;

    // Selection glow ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.0 / globalScale;
      ctx.stroke();
    }

    // Node fill
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColorRgba(node);
    ctx.fill();

    // Node border
    ctx.strokeStyle = node.risk_score >= 0.5 ? getRawNodeColor(node) : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = isSelected ? 1.5 / globalScale : 0.7 / globalScale;
    ctx.stroke();

    // Labels — only when zoomed in enough to be readable
    if (globalScale >= 2) {
      const fontSize = Math.max(3, 9 / globalScale);
      ctx.font = `${fontSize}px sans-serif`; // literal font — CSS vars don't resolve in canvas
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(156, 163, 175, 0.85)';
      ctx.fillText(node.account_id, node.x, node.y + size + Math.max(4, 7 / globalScale));
    }

    ctx.restore();
  }, [selectedNode]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawNodePointerArea = useCallback((node, color, ctx) => {
    const size = 3 + node.risk_score * 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI, false);
    ctx.fill();
  }, []);

  // ─── Zoom button handlers ─────────────────────────────────────────────────
  const handleZoomIn = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.35, 300);
  };
  const handleZoomOut = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 0.70, 300);
  };
  const handleFitToScreen = () => {
    if (fgRef.current) fgRef.current.zoomToFit(500, 60);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '600px',
        background: 'rgba(14, 14, 16, 0.98)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Performance cap notice */}
      {isCapped && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '6px',
          padding: '0.3rem 0.75rem',
          fontSize: '0.78rem',
          color: '#f59e0b',
          zIndex: 50,
          whiteSpace: 'nowrap',
        }}>
          ⚠ Showing top {MAX_VISIBLE_NODES} highest-risk nodes — raise threshold to filter further
        </div>
      )}

      {/* Floating Zoom Controls */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', zIndex: 50 }}>
        {[
          { label: '+', title: 'Zoom In',       fn: handleZoomIn },
          { label: '−', title: 'Zoom Out',      fn: handleZoomOut },
          { label: '⟲', title: 'Fit to Screen', fn: handleFitToScreen },
        ].map(({ label, title, fn }) => (
          <button
            key={title}
            onClick={fn}
            title={title}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '5px',
              background: 'rgba(17, 18, 20, 0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredData.nodes.length === 0 ? (
        <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <p>No nodes exceed the current GNN risk threshold filter.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lower the slider to inspect the network topology.</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          width={window.innerWidth > 1024 ? 900 : window.innerWidth - 64}
          height={600}
          backgroundColor="#111214"
          nodeLabel={(node) => `Account: ${node.account_id} · Risk: ${Math.round(node.risk_score * 100)}%`}
          nodeCanvasObject={drawNodeCanvas}
          nodePointerAreaPaint={drawNodePointerArea}
          linkWidth={(link) => (hasParticleFlow(link) ? 1.5 : 0.5)}
          linkColor={getLinkColor}
          linkDirectionalParticles={(link) => (hasParticleFlow(link) ? 3 : 0)}
          linkDirectionalParticleWidth={5}
          linkDirectionalParticleSpeed={0.005}
          onNodeClick={(node) => onSelectNode(node)}
          onBackgroundClick={() => onSelectNode(null)}
          cooldownTicks={80}
          d3VelocityDecay={0.55}
          minZoom={0.02}
          maxZoom={25}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      )}
    </div>
  );
}
