import React, { useMemo } from 'react';

export default function GraphTakeaways({ graphData, threshold }) {
  const takeaways = useMemo(() => {
    if (!graphData || !graphData.nodes) return null;
    
    // Filter nodes based on threshold
    const filteredNodes = graphData.nodes.filter(n => n.risk_score >= threshold);
    
    // Categories
    const smurfing = [];
    const funneling = [];
    const distributing = [];
    const mules = [];
    const safe = [];

    filteredNodes.forEach(node => {
      if (node.risk_score < 0.5) {
        safe.push(node.account_id);
      } else if (node.betti_1 === 1) {
        smurfing.push(node.account_id);
      } else if (node.in_degree > 5) {
        funneling.push(node.account_id);
      } else if (node.out_degree > 5) {
        distributing.push(node.account_id);
      } else {
        mules.push(node.account_id);
      }
    });

    return {
      total: filteredNodes.length,
      smurfing,
      funneling,
      distributing,
      mules,
      safe
    };
  }, [graphData, threshold]);

  if (!takeaways) return null;

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(11, 15, 25, 0.95)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
        Network Takeaways
      </h3>
      
      <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Visible Accounts (≥ {Math.round(threshold * 100)}% Risk): <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', marginLeft: '0.25rem' }}>{takeaways.total}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {takeaways.smurfing.length > 0 && (
          <div>
            <h4 style={{ color: '#EF4444', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
              Smurfing Loops ({takeaways.smurfing.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {takeaways.smurfing.map(acc => <li key={acc}>{acc}</li>)}
            </ul>
          </div>
        )}
        
        {takeaways.funneling.length > 0 && (
          <div>
            <h4 style={{ color: '#A855F7', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
              Funnel Collectors ({takeaways.funneling.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {takeaways.funneling.map(acc => <li key={acc}>{acc}</li>)}
            </ul>
          </div>
        )}

        {takeaways.distributing.length > 0 && (
          <div>
            <h4 style={{ color: '#F97316', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
              Scatter Distributors ({takeaways.distributing.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {takeaways.distributing.map(acc => <li key={acc}>{acc}</li>)}
            </ul>
          </div>
        )}

        {takeaways.mules.length > 0 && (
          <div>
            <h4 style={{ color: '#EAB308', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
              Pass-Through Mules ({takeaways.mules.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {takeaways.mules.map(acc => <li key={acc}>{acc}</li>)}
            </ul>
          </div>
        )}

        {takeaways.safe.length > 0 && (
          <div>
            <h4 style={{ color: '#E5E7EB', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
              Safe Accounts ({takeaways.safe.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {takeaways.safe.map(acc => <li key={acc}>{acc}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
