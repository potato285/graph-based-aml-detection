import React, { useState, useMemo } from 'react';
import { detectSyndicates } from '../utils/clustering';

const SYNDICATE_COLORS = [
  { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)', text: '#c084fc' }, // Purple
  { bg: 'rgba(59, 130, 246, 0.12)',  border: 'rgba(59, 130, 246, 0.3)',  text: '#60a5fa' }, // Blue
  { bg: 'rgba(245, 158, 11, 0.12)',  border: 'rgba(245, 158, 11, 0.3)',  text: '#fbbf24' }, // Amber
  { bg: 'rgba(236, 72, 153, 0.12)',  border: 'rgba(236, 72, 153, 0.3)',  text: '#f472b6' }, // Pink
  { bg: 'rgba(16, 185, 129, 0.12)',  border: 'rgba(16, 185, 129, 0.3)',  text: '#34d399' }, // Emerald
];

export default function HighVolumeDashboard({ nodes = [], links = [] }) {
  const [riskThreshold, setRiskThreshold] = useState(0.5);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Run Connected Components Clustering via detectSyndicates utility
  const { enrichedNodes, activeSyndicateCount, totalHighRiskCount } = useMemo(() => {
    return detectSyndicates(nodes, links, riskThreshold);
  }, [nodes, links, riskThreshold]);

  // 2. Search filter over enriched high-risk nodes
  const filteredDisplayNodes = useMemo(() => {
    if (!searchQuery.trim()) return enrichedNodes;
    const query = searchQuery.toLowerCase().trim();
    return enrichedNodes.filter(n =>
      (n.account_id ?? '').toLowerCase().includes(query) ||
      (n.syndicate_id ?? '').toLowerCase().includes(query)
    );
  }, [enrichedNodes, searchQuery]);

  // Helper for primary topology mapping
  const getPrimaryTopology = (node) => {
    if (node.betti_1 >= 1) {
      return { name: 'Smurfing Loop', color: '#EF4444' };
    }
    if ((node.in_degree ?? 0) > 5) {
      return { name: 'Funnel Collector', color: '#A855F7' };
    }
    if ((node.out_degree ?? 0) > 5) {
      return { name: 'Scatter Distributor', color: '#F97316' };
    }
    return { name: 'Pass-Through Mule', color: '#EAB308' };
  };

  const percentThreshold = Math.round(riskThreshold * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Risk Threshold Filter Controls */}
      <div className="card-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            Forensic Forensic Risk Filter
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Adjust the minimum GNN probability to re-cluster active criminal syndicates in real time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: '1', maxWidth: '480px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
              <span className="form-label" style={{ margin: 0 }}>GNN Risk Threshold</span>
              <span className="id-mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                ≥ {percentThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <input
              type="text"
              className="input-text"
              placeholder="Search Account ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Top 3 Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        
        {/* Metric 1: Total Analyzed Accounts */}
        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Total Analyzed Accounts
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {nodes.length}
            </div>
          </div>
        </div>

        {/* Metric 2: High-Risk Accounts Flagged */}
        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              High-Risk Flagged (≥ {percentThreshold}%)
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
              {totalHighRiskCount}
            </div>
          </div>
        </div>

        {/* Metric 3: Active Syndicates Detected */}
        <div className="card-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-purple)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Active Syndicates Detected
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
              {activeSyndicateCount}
            </div>
          </div>
        </div>

      </div>

      {/* Main Tabular Forensic Data View */}
      <div className="card-panel" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            Forensic Syndicate Inventory ({filteredDisplayNodes.length} Accounts)
          </h3>
        </div>

        {filteredDisplayNodes.length === 0 ? (
          <div className="empty-placeholder">
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No accounts match the criteria.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Try lowering the GNN Risk Threshold slider to inspect lower-risk accounts.
            </p>
          </div>
        ) : (
          <div className="registry-table-container" style={{ maxHeight: '560px', overflowY: 'auto' }}>
            <table className="registry-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Account ID</th>
                  <th>GNN Risk Score</th>
                  <th>Syndicate Group</th>
                  <th>Primary Topology</th>
                  <th>Flow Retention</th>
                  <th>In-Degree</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisplayNodes.map((node) => {
                  const topology = getPrimaryTopology(node);
                  const riskPct = Math.round((node.risk_score ?? 0) * 100);
                  
                  // Color style for syndicate tag
                  let syndicateBadgeStyle = {
                    background: 'rgba(107, 114, 128, 0.12)',
                    border: '1px solid rgba(107, 114, 128, 0.3)',
                    color: 'var(--text-secondary)'
                  };

                  if (!node.is_isolated && node.syndicate_index > 0) {
                    const colorScheme = SYNDICATE_COLORS[(node.syndicate_index - 1) % SYNDICATE_COLORS.length];
                    syndicateBadgeStyle = {
                      background: colorScheme.bg,
                      border: `1px solid ${colorScheme.border}`,
                      color: colorScheme.text
                    };
                  }

                  // Background tinting per syndicate group
                  const rowBg = !node.is_isolated && node.syndicate_index > 0
                    ? SYNDICATE_COLORS[(node.syndicate_index - 1) % SYNDICATE_COLORS.length].bg
                    : 'transparent';

                  return (
                    <tr key={node.id} style={{ background: rowBg }}>
                      <td>
                        <span className="id-mono" style={{ fontWeight: 700 }}>
                          {node.account_id}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            color: riskPct >= 75 ? 'var(--danger)' : 'var(--warning)',
                            minWidth: '42px'
                          }}>
                            {riskPct}%
                          </span>
                          <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${riskPct}%`,
                              height: '100%',
                              background: riskPct >= 75 ? 'var(--danger)' : 'var(--warning)',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="badge" style={syndicateBadgeStyle}>
                          {!node.is_isolated ? (
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: syndicateBadgeStyle.color,
                              display: 'inline-block',
                              marginRight: '0.35rem'
                            }} />
                          ) : null}
                          {node.syndicate_id}
                        </span>
                      </td>

                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: topology.color }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: topology.color, display: 'inline-block' }} />
                          {topology.name}
                        </span>
                      </td>

                      <td>
                        <span className="id-mono" style={{ fontSize: '0.85rem' }}>
                          {typeof node.retention === 'number' ? node.retention.toFixed(4) : '—'}
                        </span>
                      </td>

                      <td>
                        <span className="id-mono" style={{ fontSize: '0.85rem' }}>
                          {node.in_degree ?? 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
