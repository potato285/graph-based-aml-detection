import React, { useState } from 'react';
import DataControlCenter from './views/DataControlCenter';
import ModelStudio from './views/ModelStudio';
import GraphExplorer from './views/GraphExplorer';

export default function App() {
  const [activeTab, setActiveTab] = useState('data-center'); // 'data-center' | 'model-studio' | 'graph-explorer'

  return (
    <div className="app-container">
      <header className="top-navbar">
        <div className="nav-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          AML Detection System
        </div>
        
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'data-center' ? 'active' : ''}`}
            onClick={() => setActiveTab('data-center')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Data Control
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'model-studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('model-studio')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zM6 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zm12 0a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zm-3-6l-6 6M9 9l6 6" />
            </svg>
            Graph Explorer
          </button>
        </nav>

        <div className="nav-status">
          <span className="nav-status-dot" />
          Live
        </div>
      </header>

      {/* Main View Panel */}
      <main className="main-content">
        {activeTab === 'data-center' && <DataControlCenter />}

        {activeTab === 'model-studio' && <ModelStudio />}

        {activeTab === 'graph-explorer' && <GraphExplorer />}
      </main>
    </div>
  );
}
