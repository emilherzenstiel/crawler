import { useState, useEffect } from 'react';
import axios from 'axios';

interface Stats {
  total_deals: number;
  new_deals: number;
  bought_deals: number;
  sold_deals: number;
  total_profit_cents: number;
  avg_margin_percent: number;
}

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    axios.get('/api/stats').then(res => setStats(res.data));
  }, []);

  if (!stats) return <p>Lade Statistiken...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatBox label="Deals gesamt" value={stats.total_deals} />
        <StatBox label="Neue Deals" value={stats.new_deals} />
        <StatBox label="Gekauft" value={stats.bought_deals} />
        <StatBox label="Verkauft" value={stats.sold_deals} />
        <StatBox label="Profit gesamt" value={`${(stats.total_profit_cents / 100).toFixed(2)} €`} />
        <StatBox label="Ø Marge" value={`${stats.avg_margin_percent}%`} />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#666', fontSize: 14 }}>{label}</div>
    </div>
  );
}
