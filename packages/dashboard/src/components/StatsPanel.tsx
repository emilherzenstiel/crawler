import { useEffect, useState } from 'react';
import { statsApi, Stats, formatCents } from '../api/client';
import { Sparkline } from './Sparkline';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  spark?: number[];
  color?: string;
}

function StatCard({ label, value, sub, spark, color }: StatCardProps) {
  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div className="card-value" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="muted mono" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
      {spark && spark.length > 1 && <Sparkline values={spark} color={color} />}
    </div>
  );
}

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statsApi
      .get()
      .then(setStats)
      .catch((err) => setError(err.message ?? 'Failed to load stats'));
  }, []);

  if (error) {
    return (
      <div className="card" style={{ borderColor: 'var(--accent-red)' }}>
        <span className="text-red mono">STATS ERROR: {error}</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="card-title">—</div>
            <div className="card-value muted">…</div>
          </div>
        ))}
      </div>
    );
  }

  // Synthetic sparkline data (placeholder until we have real time series endpoints)
  const randomSpark = (seed: number, len = 12) => {
    const out: number[] = [];
    let x = seed;
    for (let i = 0; i < len; i++) {
      x = (x * 9301 + 49297) % 233280;
      out.push(x / 233280);
    }
    return out;
  };

  const profit = stats.flips.total_profit_cents;
  const profitColor =
    profit > 0 ? 'var(--accent-green)' : profit < 0 ? 'var(--accent-red)' : undefined;

  return (
    <div className="stats-grid">
      <StatCard
        label="Deals Today"
        value={String(stats.deals.today)}
        sub={`${stats.deals.this_week} this week`}
        spark={randomSpark(stats.deals.today + 1)}
        color="var(--accent-blue)"
      />
      <StatCard
        label="Total Deals"
        value={String(stats.deals.total)}
        sub={`${stats.deals.by_status.new} new · ${stats.deals.by_status.bought} bought`}
        spark={randomSpark(stats.deals.total + 2)}
      />
      <StatCard
        label="Avg. Margin (Top 10%)"
        value={`${stats.margins.top_10pct_avg_percent.toFixed(1)}%`}
        sub={`Overall avg: ${stats.margins.overall_avg_percent.toFixed(1)}%`}
        spark={randomSpark(Math.round(stats.margins.top_10pct_avg_percent) + 3)}
        color="var(--accent-yellow)"
      />
      <StatCard
        label="Profit (All Time)"
        value={formatCents(profit)}
        sub={`This month: ${formatCents(stats.flips.profit_this_month_cents)}`}
        spark={randomSpark(stats.flips.total_count + 4)}
        color={profitColor}
      />
    </div>
  );
}
