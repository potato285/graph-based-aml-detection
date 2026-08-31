import React from 'react';

export default function RiskSlider({ value, onChange }) {
  const percentVal = Math.round(value * 100);

  // Return helper label for the risk threshold level
  const getSeverityLabel = (val) => {
    if (val < 0.25) return { label: 'Show All Paths', color: 'var(--text-muted)' };
    if (val < 0.5) return { label: 'Suspicious Elements', color: 'var(--warning)' };
    if (val < 0.75) return { label: 'High Risk Focus', color: 'var(--danger)' };
    return { label: 'Critical Scam Rings Only', color: '#f87171' };
  };

  const severity = getSeverityLabel(value);

  return (
    <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label className="form-label" style={{ margin: 0 }}>GNN Risk Threshold</label>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 700, 
            fontSize: '0.9rem',
            color: 'var(--primary)',
            background: 'var(--primary-glow)',
            padding: '0.1rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(220, 38, 38, 0.2)'
          }}>
            ≥ {percentVal}%
          </span>
        </div>
        
        <input
          type="range"
          min="0.0"
          max="0.95"
          step="0.05"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
            margin: '0.75rem 0'
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 600, color: severity.color }}>
            {severity.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>Max: 95%</span>
        </div>
      </div>
    </div>
  );
}
