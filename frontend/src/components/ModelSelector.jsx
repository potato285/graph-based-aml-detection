import React from 'react';

export default function ModelSelector({ datasets, selectedId, onSelect }) {
  // Filter for datasets that are trained (or inferred)
  const trainedModels = datasets.filter(
    (d) => d.status === 'trained' || d.status === 'inferred'
  );

  return (
    <div className="card-panel" style={{ marginBottom: '2rem' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Inspect GNN Model</span>
          <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
            {trainedModels.length} Active Model(s)
          </span>
        </label>
        
        {trainedModels.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
            No trained models available. Go to the Data Control Center to train a model first.
          </div>
        ) : (
          <select
            className="input-text"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            style={{ 
              background: 'rgba(0, 0, 0, 0.35)', 
              borderColor: 'rgba(220, 38, 38, 0.25)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem'
            }}
          >
            {trainedModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.display_name} ({model.id}) — {model.type === 'train' ? 'Train Split' : 'Inference'}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
