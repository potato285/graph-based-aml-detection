import React, { useState } from 'react';

export default function LegendModal() {
  const [showInfo, setShowInfo] = useState(false);

  const legendItems = [
    { name: 'Safe Account', color: '#E5E7EB', desc: 'Legitimate node with low GNN risk probability' },
    { name: 'Smurfing Loop', color: '#EF4444', desc: 'Participates in simple transactional cycles (Betti-1 = 1)' },
    { name: 'Funnel Collector', color: '#A855F7', desc: 'Collects transfers from multiple mules (In-Degree > 5)' },
    { name: 'Scatter Distributor', color: '#F97316', desc: 'Splits and scatters funds to downstream mules (Out-Degree > 5)' },
    { name: 'Pass-Through Mule', color: '#EAB308', desc: 'Default intermediary pass-through node (GNN Risk ≥ 50%)' }
  ];

  const [showLegend, setShowLegend] = useState(false);

  return (
    <>
      {/* Floating Toggle Button */}
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '1.5rem',
            background: 'rgba(17, 18, 20, 0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.4rem 0.875rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: 'var(--shadow-md)',
            backdropFilter: 'blur(8px)',
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>ℹ️</span> Show Legend
        </button>
      )}

      {/* Floating Legend Overlay Panel */}
      {showLegend && (
        <div style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '1.5rem',
          background: 'rgba(17, 18, 20, 0.96)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          boxShadow: 'var(--shadow-md)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          maxWidth: '300px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
              Color Mapping Legend
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowInfo(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '2px',
                  fontSize: '1.1rem'
                }}
                title="Read Topological AML Context"
              >
                ⓘ
              </button>
              <button
                onClick={() => setShowLegend(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '2px',
                  fontSize: '1.2rem'
                }}
                title="Hide Legend"
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {legendItems.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                <span style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: item.color, 
                  boxShadow: item.color !== '#E5E7EB' ? `0 0 6px ${item.color}` : 'none',
                  display: 'inline-block',
                  flexShrink: 0
                }}></span>
                <span style={{ fontWeight: 650, color: 'var(--text-primary)' }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AML Explanatory Info Modal */}
      {showInfo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <h3 className="modal-header">Topological AML Risk Architectures</h3>
            
            <div className="modal-body" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', fontSize: '0.88rem', lineHeight: '1.5' }}>
              <p style={{ marginBottom: '1rem' }}>
                Money laundering networks deliberately orchestrate graph shapes to evade statistical rules. Our GNN pipeline leverages both topological features and spatial layers to flag these patterns:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h5 style={{ color: '#EF4444', fontWeight: 700, marginBottom: '0.2rem' }}>Smurfing Loop (Red)</h5>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Funds circulate from A to B to C and back to A (cyclic transaction patterns). Detected via Betti-1 homology loops length 3-5, capturing layering cycles meant to simulate mock trade volumes.
                  </p>
                </div>

                <div>
                  <h5 style={{ color: '#A855F7', fontWeight: 700, marginBottom: '0.2rem' }}>Funnel Collector (Purple)</h5>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    High-in-degree nodes acting as collection points where multiple small transaction inputs funnel into a single central node to bundle illicit proceeds (smurfing layering/aggregation).
                  </p>
                </div>

                <div>
                  <h5 style={{ color: '#F97316', fontWeight: 700, marginBottom: '0.2rem' }}>Scatter Distributor (Orange)</h5>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    High-out-degree nodes splitting large fund batches into dozens of tiny flows sent to distinct accounts to slip beneath transaction threshold limits (smurfing dispersion).
                  </p>
                </div>

                <div>
                  <h5 style={{ color: '#EAB308', fontWeight: 700, marginBottom: '0.2rem' }}>Pass-Through Mule (Yellow)</h5>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Nodes with high flow retention ratios that act as middle-layer intermediaries, immediately forwarding incoming funds downstream with minimal temporal delays.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <button 
                className="modal-btn modal-btn-confirm" 
                onClick={() => setShowInfo(false)}
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
