import React from 'react';

export default function InferenceSelector({ datasets, selectedId, onSelect }) {
  // Filter for datasets that have been processed for inference (status === 'inferred')
  const inferredModels = datasets.filter((d) => d.status === 'inferred');

  return (
    <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Target Graph Split</span>
          <span style={{ color: 'var(--accent-purple)', fontWeight: 700, fontSize: '0.85rem' }}>
            {inferredModels.length} Inferred Graph(s)
          </span>
        </label>
        
        {inferredModels.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
            No inferred graphs available. Go to the Data Control Center to run inference on a Test set first.
          </div>
        ) : (
          <select
            className="input-text"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            style={{ 
              background: 'rgba(19, 27, 46, 0.8)', 
              borderColor: 'rgba(139, 92, 246, 0.3)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {inferredModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.display_name} ({model.id})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
