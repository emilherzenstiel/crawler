import { useEffect, useMemo, useState } from 'react';
import {
  flipsApi,
  dealsApi,
  Flip,
  Deal,
  formatCents,
  formatCentsPrecise,
} from '../api/client';
import { SellFlipModal } from '../components/SellFlipModal';
import { ProfitBarChart } from '../components/BarChart';

export function FlipsPage() {
  const [flips, setFlips] = useState<Flip[]>([]);
  const [candidates, setCandidates] = useState<Deal[] | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    flipsApi.list().then(setFlips).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const openPicker = async () => {
    setError(null);
    setShowPicker(true);
    try {
      const [bought, contacted] = await Promise.all([
        dealsApi.list({ status: 'bought', limit: 200 }),
        dealsApi.list({ status: 'contacted', limit: 200 }),
      ]);
      setCandidates([...bought.deals, ...contacted.deals]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidate deals');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Flip löschen?')) return;
    try {
      await flipsApi.delete(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // ------ Derived stats ------
  const sortedFlips = useMemo(
    () =>
      [...flips].sort((a, b) => {
        const da = a.sold_at ? new Date(a.sold_at).getTime() : 0;
        const db = b.sold_at ? new Date(b.sold_at).getTime() : 0;
        return db - da;
      }),
    [flips],
  );

  const totalProfit = flips.reduce((sum, f) => sum + f.net_profit, 0);
  const totalBought = flips.reduce((sum, f) => sum + f.bought_price, 0);
  const avgRoi = totalBought > 0 ? (totalProfit / totalBought) * 100 : 0;

  const now = new Date();
  const thisMonthProfit = flips
    .filter((f) => {
      if (!f.sold_at) return false;
      const d = new Date(f.sold_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, f) => sum + f.net_profit, 0);

  const bestFlip = flips.reduce<Flip | null>(
    (best, f) => (!best || f.net_profit > best.net_profit ? f : best),
    null,
  );

  // ------ Monthly profit buckets (last 6 months) ------
  const monthlyProfit = useMemo(() => {
    const buckets = new Map<string, number>();
    const labels = new Map<string, string>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, 0);
      labels.set(
        key,
        d.toLocaleString('de-DE', { month: 'short' }).replace('.', ''),
      );
    }
    for (const f of flips) {
      if (!f.sold_at) continue;
      const d = new Date(f.sold_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + f.net_profit);
      }
    }
    return Array.from(buckets.entries()).map(([key, value]) => ({
      label: labels.get(key) ?? key.slice(5),
      value,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flips]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Flips / P&amp;L</h1>
          <div className="subtitle">Completed deals · net profit tracker</div>
        </div>
        <button className="primary" onClick={openPicker}>
          + Record Flip
        </button>
      </div>

      {error && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent-red)' }}>
          <span className="text-red mono">{error}</span>
        </div>
      )}

      {/* Stats grid: 5 cards */}
      <div className="stats-grid five">
        <div className="card">
          <div className="card-title">Total Profit</div>
          <div
            className="card-value"
            style={{
              color:
                totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          >
            {formatCentsPrecise(totalProfit)}
          </div>
        </div>
        <div className="card">
          <div className="card-title">This Month</div>
          <div
            className="card-value"
            style={{
              color:
                thisMonthProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          >
            {formatCentsPrecise(thisMonthProfit)}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Avg ROI</div>
          <div
            className="card-value"
            style={{
              color: avgRoi >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          >
            {avgRoi.toFixed(1)}%
          </div>
        </div>
        <div className="card">
          <div className="card-title">Total Flips</div>
          <div className="card-value">{flips.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Best Flip</div>
          <div
            className="card-value text-green"
            style={{ fontSize: 20 }}
            title={bestFlip?.deal_title ?? ''}
          >
            {bestFlip ? formatCentsPrecise(bestFlip.net_profit) : '—'}
          </div>
          {bestFlip?.deal_title && (
            <div
              className="muted mono"
              style={{
                fontSize: 10,
                marginTop: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {bestFlip.deal_title}
            </div>
          )}
        </div>
      </div>

      {/* Profit per month bar chart */}
      <div className="card mb-4">
        <div className="card-title">Profit / Month (last 6)</div>
        <ProfitBarChart data={monthlyProfit} />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>Sold At</th>
            <th>Deal</th>
            <th style={{ width: 100 }}>Bought</th>
            <th style={{ width: 100 }}>Sold</th>
            <th style={{ width: 100 }}>Fees</th>
            <th style={{ width: 120 }}>Net Profit</th>
            <th style={{ width: 80 }}>ROI</th>
            <th style={{ width: 60 }} />
          </tr>
        </thead>
        <tbody>
          {sortedFlips.map((f) => {
            const roi =
              f.bought_price > 0 ? (f.net_profit / f.bought_price) * 100 : 0;
            const positive = f.net_profit >= 0;
            return (
              <tr
                key={f.id}
                className={positive ? 'flip-row-positive' : 'flip-row-negative'}
              >
                <td className="muted" style={{ fontSize: 11 }}>
                  {f.sold_at
                    ? new Date(f.sold_at).toLocaleDateString('de-DE')
                    : '—'}
                </td>
                <td>
                  {f.deal_url ? (
                    <a href={f.deal_url} target="_blank" rel="noopener noreferrer">
                      {f.deal_title ?? `#${f.deal_id}`}
                    </a>
                  ) : (
                    f.deal_title ?? `#${f.deal_id}`
                  )}
                </td>
                <td>{formatCents(f.bought_price)}</td>
                <td>{formatCents(f.sold_price)}</td>
                <td className="muted">{formatCents(f.platform_fees)}</td>
                <td
                  className={positive ? 'text-green' : 'text-red'}
                  style={{ fontWeight: 700 }}
                >
                  {formatCentsPrecise(f.net_profit)}
                </td>
                <td
                  className={positive ? 'text-green' : 'text-red'}
                  style={{ fontWeight: 500 }}
                >
                  {f.bought_price > 0 ? `${roi.toFixed(1)}%` : '—'}
                </td>
                <td>
                  <button className="danger" onClick={() => handleDelete(f.id)}>
                    Del
                  </button>
                </td>
              </tr>
            );
          })}
          {flips.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-state">
                No flips recorded yet. Mark a bought deal as "Sold" to start
                tracking P&amp;L.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Deal picker for Record Flip fallback flow */}
      {showPicker && !selectedDeal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowPicker(false);
            setCandidates(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Pick a Deal to Flip</h2>
            {candidates == null ? (
              <p className="muted mono">Loading…</p>
            ) : candidates.length === 0 ? (
              <p className="muted mono" style={{ fontSize: 12 }}>
                No deals with status "bought" or "contacted" found. Mark a deal
                as bought first from the Dashboard.
              </p>
            ) : (
              <div
                className="col"
                style={{ maxHeight: 400, overflowY: 'auto', gap: 6 }}
              >
                {candidates.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDeal(d);
                      setShowPicker(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: 10,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ color: 'var(--text)' }}>
                      {d.title.slice(0, 70)}
                    </div>
                    <div
                      className="muted"
                      style={{ fontSize: 10, marginTop: 2 }}
                    >
                      {d.platform} · {d.status} · ask{' '}
                      {formatCentsPrecise(d.ask_price)}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setShowPicker(false);
                  setCandidates(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDeal && (
        <SellFlipModal
          deal={selectedDeal}
          onClose={() => {
            setSelectedDeal(null);
            setCandidates(null);
          }}
          onSaved={() => {
            load();
            setSelectedDeal(null);
            setCandidates(null);
          }}
        />
      )}
    </div>
  );
}
