import { useState, useEffect } from 'react';
import { DealList } from './components/DealList.tsx';
import { StatsPanel } from './components/StatsPanel.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'deals' | 'stats'>('deals');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <h1>Deal Radar</h1>
      <nav style={{ marginBottom: 20 }}>
        <button onClick={() => setActiveTab('deals')} style={{ fontWeight: activeTab === 'deals' ? 'bold' : 'normal', marginRight: 10 }}>
          Deals
        </button>
        <button onClick={() => setActiveTab('stats')} style={{ fontWeight: activeTab === 'stats' ? 'bold' : 'normal' }}>
          Stats
        </button>
      </nav>
      {activeTab === 'deals' && <DealList />}
      {activeTab === 'stats' && <StatsPanel />}
    </div>
  );
}
