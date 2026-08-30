import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import ModelSelector from '../components/ModelSelector';
import MetricCards from '../components/MetricCards';
import LossCurveChart from '../components/LossCurveChart';

export default function ModelStudio() {
  const [datasets, setDatasets] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [modelMetrics, setModelMetrics] = useState(null);
  
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch registry on mount
  const loadRegistry = async () => {
    try {
      setLoadingRegistry(true);
      const registryData = await api.fetchRegistry();
      
      // Convert to array of objects
      const arr = Object.entries(registryData || {}).map(([id, info]) => ({
        id,
        ...info
      }));
      setDatasets(arr);

      // Find trained/inferred datasets
      const trainedList = arr.filter(
        (d) => d.status === 'trained' || d.status === 'inferred'
      );

      // Auto-select most recently trained model if none selected yet
      if (trainedList.length > 0 && !selectedModelId) {
        setSelectedModelId(trainedList[0].id);
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

  // 2. Fetch metrics whenever selected model changes
  useEffect(() => {
    if (!selectedModelId) {
      setModelMetrics(null);
      return;
    }

    const loadMetrics = async () => {
      try {
        setLoadingMetrics(true);
        setError('');
        const metrics = await api.fetchModelMetrics(selectedModelId);
        setModelMetrics(metrics);
      } catch (err) {
        setError(err.message || `Failed to load metrics for model ${selectedModelId}.`);
        setModelMetrics(null);
      } finally {
        setLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [selectedModelId]);

  const trainedCount = datasets.filter(
    (d) => d.status === 'trained' || d.status === 'inferred'
  ).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Model Studio</h1>
        <p className="page-subtitle">
          Evaluate GNN training loss history, examine recall correctness, and audit classifier performance profiles.
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
          <p>Syncing Model Registries...</p>
        </div>
      ) : trainedCount === 0 ? (
        <div className="placeholder-view">
          <div className="empty-icon" style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h2 className="placeholder-title">No Trained Models Available</h2>
          <p className="placeholder-desc">
            To view convergence history and recall metrics, you must first register a Train split dataset and click "Train Model" inside the Data Control Center.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Top section: Select model */}
          <ModelSelector
            datasets={datasets}
            selectedId={selectedModelId}
            onSelect={setSelectedModelId}
          />

          {loadingMetrics ? (
            <div className="loading-placeholder">
              <span className="spinner spinner-lg"></span>
              <p>Fetching GNN Performance Metrics...</p>
            </div>
          ) : modelMetrics ? (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {/* Scorecard grid */}
              <MetricCards metrics={modelMetrics.metrics} />

              {/* Loss Line Chart */}
              <LossCurveChart history={modelMetrics.history} />
            </div>
          ) : (
            <div className="empty-placeholder">
              <p>Select a trained GNN split dataset above to display metrics.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
