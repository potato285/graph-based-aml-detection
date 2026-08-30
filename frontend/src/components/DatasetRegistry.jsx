import React, { useState } from 'react';
import * as api from '../services/api';

export default function DatasetRegistry({ datasets, onActionSuccess, onError }) {
  const [actionLoading, setActionLoading] = useState({}); // { [id]: 'train' | 'infer' | 'delete' }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  // Model selection modal state for inference
  const [showInferModal, setShowInferModal] = useState(false);
  const [inferDatasetId, setInferDatasetId] = useState(null);
  const [selectedTrainModelId, setSelectedTrainModelId] = useState('');

  // Extract all trained model options for inference dropdown
  const trainedModels = datasets.filter(
    (d) => d.type === 'train' && d.status === 'trained'
  );

  const startAction = (id, type) => {
    setActionLoading((prev) => ({ ...prev, [id]: type }));
  };

  const endAction = (id) => {
    setActionLoading((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleTrain = async (id) => {
    try {
      startAction(id, 'train');
      await api.startTraining(id);
      onActionSuccess(`Model training successfully started for dataset ${id}!`);
    } catch (err) {
      onError(err.message || 'Failed to start model training.');
    } finally {
      endAction(id);
    }
  };

  const handleInferClick = (id) => {
    if (trainedModels.length === 0) {
      onError('No trained GNN models found. Please train at least one Train dataset first.');
      return;
    }
    
    setInferDatasetId(id);
    // Pre-select first trained model if available
    setSelectedTrainModelId(trainedModels[0].id);
    
    if (trainedModels.length === 1) {
      // If exactly one trained model, we can run immediately or show confirmation
      // The prompt asks to prompt if multiple exist, so if only one exists we can trigger directly or confirm
      runInference(id, trainedModels[0].id);
    } else {
      setShowInferModal(true);
    }
  };

  const runInference = async (testId, trainModelId) => {
    try {
      startAction(testId, 'infer');
      setShowInferModal(false);
      await api.startInference(testId, trainModelId);
      onActionSuccess(`GNN inference complete for dataset ${testId}!`);
    } catch (err) {
      onError(err.message || 'Failed to run GNN inference.');
    } finally {
      endAction(testId);
      setInferDatasetId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      startAction(id, 'delete');
      setConfirmDeleteId(null);
      await api.deleteDataset(id);
      onActionSuccess(`Dataset ${id} purged successfully from registry and disk.`);
    } catch (err) {
      onError(err.message || 'Failed to delete dataset.');
    } finally {
      endAction(id);
    }
  };

  return (
    <div className="card-panel" style={{ padding: 0 }}>
      <div style={{ padding: '1.5rem' }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
          Dataset Lifecycle Control
        </h3>
      </div>

      {datasets.length === 0 ? (
        <div className="empty-placeholder">
          <div className="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Datasets Registered</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Upload a CSV transaction log file to start the GNN analytics pipeline.
          </p>
        </div>
      ) : (
        <div className="registry-table-container">
          <table className="registry-table">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Dataset ID</th>
                <th>Pipeline Controls</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((dataset) => {
                const isLoading = actionLoading[dataset.id];
                const isDeleting = confirmDeleteId === dataset.id;

                return (
                  <tr key={dataset.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dataset.display_name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${dataset.type === 'train' ? 'badge-train' : 'badge-test'}`}>
                        {dataset.type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-status status-${dataset.status}`}>
                        <span className="status-dot"></span>
                        {dataset.status === 'tensor_built' ? 'tensor built' : dataset.status}
                      </span>
                    </td>
                    <td>
                      <span className="id-mono">{dataset.id}</span>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        {/* Train actions */}
                        {dataset.type === 'train' && (
                          <button
                            onClick={() => handleTrain(dataset.id)}
                            className="table-btn table-btn-primary"
                            disabled={
                              isLoading || 
                              (dataset.status !== 'raw' && dataset.status !== 'tensor_built')
                            }
                          >
                            {isLoading === 'train' ? (
                              <>
                                <span className="spinner"></span>
                                Training...
                              </>
                            ) : dataset.status === 'trained' ? (
                              'Model Trained'
                            ) : (
                              'Train Model'
                            )}
                          </button>
                        )}

                        {/* Inference actions */}
                        {dataset.type === 'test' && (
                          <button
                            onClick={() => handleInferClick(dataset.id)}
                            className="table-btn table-btn-primary"
                            disabled={isLoading}
                          >
                            {isLoading === 'infer' ? (
                              <>
                                <span className="spinner"></span>
                                Running GNN...
                              </>
                            ) : dataset.status === 'inferred' ? (
                              'Run Inference Again'
                            ) : (
                              'Run Inference'
                            )}
                          </button>
                        )}

                        {/* Delete confirmation logic */}
                        {isDeleting ? (
                          <>
                            <button
                              onClick={() => handleDelete(dataset.id)}
                              className="table-btn table-btn-danger"
                              disabled={isLoading}
                              style={{ background: 'var(--danger)', color: '#fff' }}
                            >
                              {isLoading === 'delete' ? (
                                <span className="spinner"></span>
                              ) : (
                                'Confirm'
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="table-btn"
                              disabled={isLoading}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(dataset.id)}
                            className="table-btn table-btn-danger"
                            disabled={isLoading}
                            title="Purge dataset"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Model Selection Modal for Inference on Test Sets */}
      {showInferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header">Select GNN Model Model</h3>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                Multiple active GNN training splits were detected. Choose which trained GNN weights to evaluate this test split against:
              </p>
              <div className="form-group">
                <label className="form-label">Trained Model Target</label>
                <select
                  className="input-text"
                  value={selectedTrainModelId}
                  onChange={(e) => setSelectedTrainModelId(e.target.value)}
                >
                  {trainedModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.display_name} ({model.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => {
                  setShowInferModal(false);
                  setInferDatasetId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={() => runInference(inferDatasetId, selectedTrainModelId)}
              >
                Run GNN Inference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
