import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import DatasetUpload from '../components/DatasetUpload';
import DatasetRegistry from '../components/DatasetRegistry';

export default function DataControlCenter() {
  const [registryData, setRegistryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]); // Array of { id, type: 'success' | 'error' | 'info', message }

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadRegistry = async () => {
    try {
      const data = await api.fetchRegistry();
      setRegistryData(data || {});
    } catch (err) {
      addToast(err.message || 'Failed to sync dataset registry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  // Convert registry dict keyed by ID to an array of objects
  const datasetsArray = Object.entries(registryData).map(([id, item]) => ({
    id,
    ...item,
  }));

  const handleUploadSuccess = (msg) => {
    addToast(msg, 'success');
    loadRegistry();
  };

  const handleActionSuccess = (msg) => {
    addToast(msg, 'success');
    loadRegistry();
  };

  const handleError = (msg) => {
    addToast(msg, 'error');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Data Control Center</h1>
        <p className="page-subtitle">
          Load transaction streams, serialize Graph structures, and trigger the GNN processing layers.
        </p>
      </div>

      {loading ? (
        <div className="loading-placeholder">
          <span className="spinner spinner-lg"></span>
          <p>Syncing Registry State...</p>
        </div>
      ) : (
        <div className="grid-layout">
          {/* Left panel: Upload form */}
          <div>
            <DatasetUpload 
              onUploadSuccess={handleUploadSuccess} 
              onError={handleError} 
            />
          </div>

          {/* Right panel: Table Registry */}
          <div>
            <DatasetRegistry
              datasets={datasetsArray}
              onActionSuccess={handleActionSuccess}
              onError={handleError}
            />
          </div>
        </div>
      )}

      {/* Global Toast Notification Banners */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div style={{ marginTop: '0.15rem' }}>
              {toast.type === 'success' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
