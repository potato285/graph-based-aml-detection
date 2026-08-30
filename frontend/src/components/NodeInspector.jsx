import React from 'react';

export default function NodeInspector({ selectedNode, onClose }) {
  if (!selectedNode) {
    return (
      <div className="card-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyItems: 'center', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1.5rem' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Node Inspector</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
          Click any account node on the canvas to inspect topological features and GNN fraud risk percentages.
        </p>
      </div>
    );
  }

  const riskPct = Math.round(selectedNode.risk_score * 100);
  const isFraud = selectedNode.risk_score >= 0.5;

  // Identify heuristic type
  let scamType = 'Safe Account';
  let color = 'var(--text-secondary)';
  if (isFraud) {
    if (selectedNode.betti_1 === 1) {
      scamType = 'Smurfing Loop Participant';
      color = '#EF4444';
    } else if (selectedNode.in_degree > 5) {
      scamType = 'Funnel Collector Node';
      color = '#A855F7';
    } else if (selectedNode.out_degree > 5) {
      scamType = 'Scatter Distributor Node';
      color = '#F97316';
    } else {
      scamType = 'Pass-Through Mule Account';
      color = '#EAB308';
    }
  }

  return (
    <div className="card-panel animate-fadeIn" style={{ height: '100%', position: 'relative' }}>
      {/* Close Button */}
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '0.25rem'
        }}
        title="Deselect Node"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <h3 className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Account Inspector
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Account ID */}
        <div>
          <span className="form-label">Account Number</span>
          <span className="id-mono" style={{ fontSize: '1rem', padding: '0.4rem 0.6rem', display: 'block', wordBreak: 'break-all', marginTop: '0.25rem' }}>
            {selectedNode.account_id}
          </span>
        </div>

        {/* GNN Score Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
            <span className="form-label" style={{ margin: 0 }}>GNN Fraud Probability</span>
            <span style={{ fontWeight: 850, fontSize: '1.2rem', color: isFraud ? 'var(--danger)' : 'var(--success)' }}>
              {riskPct}%
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${riskPct}%`, 
              height: '100%', 
              background: isFraud ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #3b82f6, #10b981)',
              borderRadius: '4px'
            }} />
          </div>
        </div>

        {/* Classification heuristic */}
        <div>
          <span className="form-label">Pipeline Classification</span>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: color, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }}></span>
            {scamType}
          </p>
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }}></div>

        {/* Topological features grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <span className="form-label" style={{ fontSize: '0.75rem' }}>In-Degree</span>
            <p style={{ fontWeight: 700, fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
              {selectedNode.in_degree}
            </p>
          </div>
          
          <div>
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Out-Degree</span>
            <p style={{ fontWeight: 700, fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
              {selectedNode.out_degree}
            </p>
          </div>

          <div>
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Betti-1 Cycle</span>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedNode.betti_1 === 1 ? 'var(--danger)' : 'var(--text-muted)' }}>
              {selectedNode.betti_1 === 1 ? 'ACTIVE (Loop)' : 'INACTIVE'}
            </p>
          </div>

          <div>
            <span className="form-label" style={{ fontSize: '0.75rem' }}>Flow Retention</span>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-mono)', color: selectedNode.retention > 0.5 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {selectedNode.retention.toFixed(4)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
