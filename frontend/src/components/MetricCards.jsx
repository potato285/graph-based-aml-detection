import React from 'react';

export default function MetricCards({ metrics }) {
  const { accuracy = 0, precision = 0, recall = 0, f1 = 0 } = metrics || {};

  const formatPercent = (val) => `${(val * 100).toFixed(2)}%`;
  const formatFloat = (val) => val.toFixed(4);

  return (
    <div className="metrics-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      {/* 1. Recall - Primary Compliance Target */}
      <div className="card-panel" style={{
        borderLeft: '4px solid var(--primary)',
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>Recall</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0', letterSpacing: '-0.02em' }}>
              {formatPercent(recall)}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Value: {formatFloat(recall)}
            </p>
          </div>
          <div style={{
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            padding: '0.5rem',
            borderRadius: '50%'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        <div style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.3'
        }}>
          <strong>Primary Compliance Goal:</strong> Minimizes false negatives (missed illicit paths).
        </div>
      </div>

      {/* 2. Precision */}
      <div className="card-panel" style={{
        borderLeft: '4px solid var(--accent-purple)',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label" style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Precision</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0', letterSpacing: '-0.02em' }}>
              {formatPercent(precision)}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Value: {formatFloat(precision)}
            </p>
          </div>
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            color: 'var(--accent-purple)',
            padding: '0.5rem',
            borderRadius: '50%'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
          </div>
        </div>
        <div style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.3'
        }}>
          <strong>Target Accuracy:</strong> Percentage of flagged paths that are truly illicit.
        </div>
      </div>

      {/* 3. F1-Score */}
      <div className="card-panel" style={{
        borderLeft: '4px solid var(--accent-pink)',
        boxShadow: '0 4px 20px rgba(236, 72, 153, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label" style={{ color: 'var(--accent-pink)', fontWeight: 700 }}>F1-Score</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0', letterSpacing: '-0.02em' }}>
              {formatPercent(f1)}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Value: {formatFloat(f1)}
            </p>
          </div>
          <div style={{
            background: 'rgba(236, 72, 153, 0.1)',
            color: 'var(--accent-pink)',
            padding: '0.5rem',
            borderRadius: '50%'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
        <div style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.3'
        }}>
          <strong>Harmonic Mean:</strong> Balances precision and recall performance.
        </div>
      </div>

      {/* 4. Accuracy */}
      <div className="card-panel" style={{
        borderLeft: '4px solid var(--success)',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label" style={{ color: 'var(--success)', fontWeight: 700 }}>Overall Accuracy</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0', letterSpacing: '-0.02em' }}>
              {formatPercent(accuracy)}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Value: {formatFloat(accuracy)}
            </p>
          </div>
          <div style={{
            background: 'var(--success-glow)',
            color: 'var(--success)',
            padding: '0.5rem',
            borderRadius: '50%'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <div style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.3'
        }}>
          <strong>Global Correctness:</strong> Percentage of all correctly predicted accounts.
        </div>
      </div>
    </div>
  );
}
