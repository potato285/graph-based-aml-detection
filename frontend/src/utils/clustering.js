/**
 * Clustering & Connected Components Utility for AML Forensic Graph Analysis.
 * Identifies isolated criminal syndicates using Breadth-First Search (BFS) on high-risk transaction subgraphs.
 */

/**
 * Detects criminal syndicates among high-risk nodes using connected components analysis.
 * 
 * @param {Array} nodes - Raw or parsed node objects from graph results JSON.
 * @param {Array} links - Raw or parsed link objects from graph results JSON.
 * @param {number} riskThreshold - Minimum GNN risk score threshold (default 0.5).
 * @returns {Object} { enrichedNodes, activeSyndicateCount, totalHighRiskCount }
 */
export function detectSyndicates(nodes = [], links = [], riskThreshold = 0.5) {
  if (!nodes || nodes.length === 0) {
    return {
      enrichedNodes: [],
      activeSyndicateCount: 0,
      totalHighRiskCount: 0
    };
  }

  // 1. Filter nodes by risk threshold
  const highRiskNodes = nodes.filter(n => (n.risk_score ?? 0) >= riskThreshold);
  const highRiskNodeIds = new Set(highRiskNodes.map(n => n.id));
  const nodeMap = new Map(highRiskNodes.map(n => [n.id, n]));

  if (highRiskNodes.length === 0) {
    return {
      enrichedNodes: [],
      activeSyndicateCount: 0,
      totalHighRiskCount: 0
    };
  }

  // 2. Build undirected adjacency list for high-risk nodes only
  const adjList = new Map();
  highRiskNodeIds.forEach(id => {
    adjList.set(id, new Set());
  });

  (links || []).forEach(link => {
    const sId = typeof link.source === 'object' ? link.source.id : link.source;
    const tId = typeof link.target === 'object' ? link.target.id : link.target;

    if (highRiskNodeIds.has(sId) && highRiskNodeIds.has(tId) && sId !== tId) {
      adjList.get(sId).add(tId);
      adjList.get(tId).add(sId);
    }
  });

  // 3. BFS Connected Components Traversal
  const visited = new Set();
  const rawComponents = [];

  highRiskNodeIds.forEach(startId => {
    if (!visited.has(startId)) {
      const component = [];
      const queue = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const currId = queue.shift();
        component.push(currId);

        const neighbors = adjList.get(currId) || new Set();
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        });
      }

      rawComponents.push(component);
    }
  });

  // 4. Separate multi-node syndicates from isolated mules
  const multiNodeComponents = rawComponents
    .filter(c => c.length >= 2)
    .sort((a, b) => b.length - a.length); // Sort largest syndicates first

  const singleNodeComponents = rawComponents.filter(c => c.length === 1);

  const enrichedNodes = [];

  // Map multi-node components to Syndicate 1, Syndicate 2, etc.
  multiNodeComponents.forEach((componentNodeIds, index) => {
    const syndicateId = `Syndicate ${index + 1}`;
    
    // Sort nodes within syndicate by risk score descending
    const componentNodes = componentNodeIds
      .map(id => nodeMap.get(id))
      .filter(Boolean)
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));

    componentNodes.forEach(node => {
      enrichedNodes.push({
        ...node,
        syndicate_id: syndicateId,
        syndicate_index: index + 1,
        is_isolated: false
      });
    });
  });

  // Map single-node components to "Isolated Mule"
  const isolatedNodes = singleNodeComponents
    .map(c => nodeMap.get(c[0]))
    .filter(Boolean)
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));

  isolatedNodes.forEach(node => {
    enrichedNodes.push({
      ...node,
      syndicate_id: 'Isolated Mule',
      syndicate_index: 0,
      is_isolated: true
    });
  });

  return {
    enrichedNodes,
    activeSyndicateCount: multiNodeComponents.length,
    totalHighRiskCount: highRiskNodes.length
  };
}
