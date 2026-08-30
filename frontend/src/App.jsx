import React, { useState } from 'react';
import DataControlCenter from './views/DataControlCenter';
import ModelStudio from './views/ModelStudio';

export default function App() {
  const [activeTab, setActiveTab] = useState('data-center'); // 'data-center' | 'model-studio' | 'graph-explorer'

  return (
    <div className="app-container">
      {/* Top Navbar Header */}
      <header className="top-navbar">
        <div className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          ANTIGRAVITY AML SYSTEM
        </div>
        
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'data-center' ? 'active' : ''}`}
            onClick={() => setActiveTab('data-center')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Data Control Center
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'model-studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('model-studio')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Model Studio
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'graph-explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph-explorer')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zM6 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zm12 0a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zm-3-6l-6 6M9 9l6 6" />
            </svg>
            Graph Explorer
          </button>
        </nav>
      </header>

      {/* Main View Panel */}
      <main className="main-content">
        {activeTab === 'data-center' && <DataControlCenter />}

        {activeTab === 'model-studio' && <ModelStudio />}

        {activeTab === 'graph-explorer' && (
          <div className="placeholder-view">
            <div className="empty-icon" style={{ marginBottom: '1.5rem', color: 'var(--accent-purple)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zM6 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zm12 0a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                <path d="M9 9l6 6M15 9l-6 6" />
              </svg>
            </div>
            <h2 className="placeholder-title">Graph Explorer</h2>
            <p className="placeholder-desc">
              Explore interactively structured financial transactions, visualize Smurf rings and loops, and isolate suspicious accounts using 2D force-directed node-link visualizers.
            </p>
            <button className="btn btn-primary" style={{ maxWidth: '200px', marginTop: '2rem' }} onClick={() => setActiveTab('data-center')}>
              Go to Data Center
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
