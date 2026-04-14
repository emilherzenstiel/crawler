import { formatCents } from '../api/client';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

export function ProfitBarChart({ data, height = 140 }: BarChartProps) {
  if (data.length === 0) {
    return <div className="empty-state">No data yet.</div>;
  }
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((d, i) => {
        const pct = (Math.abs(d.value) / max) * 100;
        const positive = d.value >= 0;
        return (
          <div
            className="bar-col"
            key={i}
            title={`${d.label}: ${formatCents(d.value)}`}
          >
            <div className="bar-value mono">
              {d.value !== 0 ? formatCents(d.value) : ''}
            </div>
            <div className="bar-slot top">
              {positive && d.value !== 0 && (
                <div className="bar positive" style={{ height: `${pct}%` }} />
              )}
            </div>
            <div className="axis" />
            <div className="bar-slot bottom">
              {!positive && (
                <div className="bar negative" style={{ height: `${pct}%` }} />
              )}
            </div>
            <div className="bar-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
