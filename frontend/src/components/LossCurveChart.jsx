import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export default function LossCurveChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="card-panel" style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No training history data available.</p>
      </div>
    );
  }

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Epoch: <span style={{ color: 'var(--text-primary)' }}>{payload[0].payload.epoch}</span>
          </p>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
            Loss: <span style={{ fontFamily: 'var(--font-mono)' }}>{payload[0].value.toFixed(5)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-panel">
      <h3 className="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        GNN Loss Convergence Curve
      </h3>

      <div style={{ width: '100%', height: '350px', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            
            <XAxis 
              dataKey="epoch" 
              stroke="var(--text-muted)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-sans)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
            />
            
            <YAxis 
              stroke="var(--text-muted)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Line 
              type="monotone" 
              dataKey="loss" 
              stroke="var(--primary)" 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }}
              // Injects CSS class that can be targeted for filters or glow effects
              className="chart-glow-line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
