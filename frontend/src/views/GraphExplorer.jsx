import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import InferenceSelector from '../components/InferenceSelector';
import RiskSlider from '../components/RiskSlider';
import ForceGraphCanvas from '../components/ForceGraphCanvas';
import LegendModal from '../components/LegendModal';
import NodeInspector from '../components/NodeInspector';

export default function GraphExplorer() {
  const [datasets, setDatasets] = useState([]);
  const [selectedInferredId, setSelectedInferredId] = useState('');
  const [graphData, setGraphData] = useState(null);
  
  const [threshold, setThreshold] = useState(0.0); // default show all
  const [selectedNode, setSelectedNode] = useState(null);

  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch registry on mount
  const loadRegistry = async () => {
    try {
      setLoadingRegistry(true);
      const registryData = await api.fetchRegistry();
      
      const arr = Object.entries(registryData || {}).map(([id, info]) => ({
        id,
        ...info
      }));
      setDatasets(arr);

      const inferredList = arr.filter((d) => d.status === 'inferred');
      if (inferredList.length > 0 && !selectedInferredId) {
        setSelectedInferredId(inferredList[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch registry data.');
    } finally {
      setLoadingRegistry(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  // 2. Fetch Graph JSON results when selectedInferredId changes
  useEffect(() => {
    if (!selectedInferredId) {
      setGraphData(null);
      setSelectedNode(null);
      return;
    }

    const loadGraph = async () => {
      try {
        setLoadingGraph(true);
        setError('');
        setSelectedNode(null); // clear selection on dataset switch
        const data = await api.fetchGraphData(selectedInferredId);
        setGraphData(data);
      } catch (err) {
        setError(err.message || `Failed to load graph data for dataset ${selectedInferredId}.`);
        setGraphData(null);
      } finally {
        setLoadingGraph(false);
      }
    };

    loadGraph();
  }, [selectedInferredId]);

  const inferredCount = datasets.filter((d) => d.status === 'inferred').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Graph Explorer</h1>
        <p className="page-subtitle">
          Interactively map financial transaction networks, query structural anomalies, and trace money laundering proceeds.
        </p>
      </div>

      {error && (
        <div className="toast toast-error" style={{ position: 'relative', bottom: 0, right: 0, marginBottom: '2rem', maxWidth: '100%' }}>
          <div style={{ marginTop: '0.15rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="toast-message">{error}</div>
        </div>
      )}

      {loadingRegistry ? (
        <div className="loading-placeholder">
          <span className="spinner spinner-lg"></span>
          <p>Syncing Graph Registries...</p>
        </div>
      ) : inferredCount === 0 ? (
        <div className="placeholder-view">
          <div className="empty-icon" style={{ marginBottom: '1.5rem', color: 'var(--accent-purple)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zM6 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zm12 0a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
              <path d="M9 9l6 6M15 9l-6 6" />
            </svg>
          </div>
          <h2 className="placeholder-title">No Inferred Graphs Available</h2>
          <p className="placeholder-desc">
            To explore interactive transaction topologies, you must first register a Test split dataset and click "Run Inference" inside the Data Control Center.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Selection panel */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            <InferenceSelector
              datasets={datasets}
              selectedId={selectedInferredId}
              onSelect={setSelectedInferredId}
            />
            <RiskSlider
              value={threshold}
              onChange={setThreshold}
            />
          </div>

          {loadingGraph ? (
            <div className="loading-placeholder">
              <span className="spinner spinner-lg"></span>
              <p>Reconstructing Graph Topology...</p>
            </div>
          ) : graphData ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              animation: 'fadeIn 0.3s ease'
            }} className="graph-workspace-grid">
              
              {/* Force Directed Graph Area */}
              <div style={{ position: 'relative', minWidth: 0 }}>
                <ForceGraphCanvas
                  graphData={graphData}
                  threshold={threshold}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                />
                
                {/* Floating Legend Panel overlay */}
                <LegendModal />
              </div>

              {/* Node Inspector details */}
              <div>
                <NodeInspector
                  selectedNode={selectedNode}
                  onClose={() => setSelectedNode(null)}
                />
              </div>

            </div>
          ) : (
            <div className="empty-placeholder">
              <p>Select an inferred Test graph above to render transaction mapping.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
