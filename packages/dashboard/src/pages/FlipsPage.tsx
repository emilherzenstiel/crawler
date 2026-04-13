import { useEffect, useState } from 'react';
import {
  flipsApi,
  dealsApi,
  Flip,
  Deal,
  formatCentsPrecise,
} from '../api/client';

interface FormState {
  deal_id: string;
  bought_price_euros: string;
  sold_price_euros: string;
  platform_fees_euros: string;
  sold_at: string;
  notes: string;
}

const EMPTY: FormState = {
  deal_id: '',
  bought_price_euros: '',
  sold_price_euros: '',
  platform_fees_euros: '0',
  sold_at: '',
  notes: '',
};

export function FlipsPage() {
  const [flips, setFlips] = useState<Flip[]>([]);
  const [boughtDeals, setBoughtDeals] = useState<Deal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    flipsApi.list().then(setFlips).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const openCreate = async () => {
    setError(null);
    setForm(EMPTY);
    try {
      // Candidates: deals in "bought" or "contacted" status (ready to flip)
      const [bought, contacted] = await Promise.all([
        dealsApi.list({ status: 'bought', limit: 200 }),
        dealsApi.list({ status: 'contacted', limit: 200 }),
      ]);
      setBoughtDeals([...bought.deals, ...contacted.deals]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidate deals');
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.deal_id) {
      setError('Select a deal');
      return;
    }
    try {
      await flipsApi.create({
        deal_id: Number(form.deal_id),
        bought_price: Math.round(Number(form.bought_price_euros) * 100),
        sold_price: Math.round(Number(form.sold_price_euros) * 100),
        platform_fees: Math.round(Number(form.platform_fees_euros || 0) * 100),
        sold_at: form.sold_at ? new Date(form.sold_at).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Flip löschen?')) return;
    await flipsApi.delete(id);
    load();
  };

  const totalProfit = flips.reduce((sum, f) => sum + f.net_profit, 0);
  const totalFees = flips.reduce((sum, f) => sum + f.platform_fees, 0);
  const totalSold = flips.reduce((sum, f) => sum + f.sold_price, 0);
  const totalBought = flips.reduce((sum, f) => sum + f.bought_price, 0);
  const roi = totalBought > 0 ? (totalProfit / totalBought) * 100 : 0;

  // Live preview of form numbers
  const previewBought = Math.round(Number(form.bought_price_euros || 0) * 100);
  const previewSold = Math.round(Number(form.sold_price_euros || 0) * 100);
  const previewFees = Math.round(Number(form.platform_fees_euros || 0) * 100);
  const previewProfit = previewSold - previewBought - previewFees;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Flips / P&amp;L</h1>
          <div className="subtitle">Completed deals · net profit tracker</div>
        </div>
        <button className="primary" onClick={openCreate}>
          + Record Flip
        </button>
      </div>

      {error && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent-red)' }}>
          <span className="text-red mono">{error}</span>
        </div>
      )}

      <div className="stats-grid">
        <div className="card">
          <div className="card-title">Total Profit</div>
          <div
            className="card-value"
            style={{ color: totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {formatCentsPrecise(totalProfit)}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Total Flips</div>
          <div className="card-value">{flips.length}</div>
        </div>
        <div className="card">
          <div className="card-title">ROI</div>
          <div
            className="card-value"
            style={{ color: roi >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {roi.toFixed(1)}%
          </div>
        </div>
        <div className="card">
          <div className="card-title">Platform Fees</div>
          <div className="card-value text-red">{formatCentsPrecise(totalFees)}</div>
        </div>
      </div>

      <table className="data-table mt-4">
        <thead>
          <tr>
            <th>Sold At</th>
            <th>Deal</th>
            <th>Bought</th>
            <th>Sold</th>
            <th>Fees</th>
            <th>Net Profit</th>
            <th>Notes</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {flips.map((f) => (
            <tr key={f.id}>
              <td className="muted" style={{ fontSize: 11 }}>
                {f.sold_at ? new Date(f.sold_at).toLocaleDateString('de-DE') : '—'}
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
              <td>{formatCentsPrecise(f.bought_price)}</td>
              <td>{formatCentsPrecise(f.sold_price)}</td>
              <td className="text-red">{formatCentsPrecise(f.platform_fees)}</td>
              <td
                className={f.net_profit >= 0 ? 'text-green' : 'text-red'}
                style={{ fontWeight: 700 }}
              >
                {formatCentsPrecise(f.net_profit)}
              </td>
              <td className="muted" style={{ maxWidth: 200, fontSize: 11 }}>
                {f.notes ?? '—'}
              </td>
              <td>
                <button className="danger" onClick={() => handleDelete(f.id)}>
                  Del
                </button>
              </td>
            </tr>
          ))}
          {flips.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-state">
                No flips recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Record Flip</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Deal</label>
                <select
                  value={form.deal_id}
                  onChange={(e) => {
                    const dealId = e.target.value;
                    const deal = boughtDeals.find((d) => d.id === Number(dealId));
                    setForm({
                      ...form,
                      deal_id: dealId,
                      bought_price_euros:
                        deal?.bought_price != null
                          ? String(deal.bought_price / 100)
                          : deal?.ask_price != null
                          ? String(deal.ask_price / 100)
                          : form.bought_price_euros,
                      sold_price_euros:
                        deal?.estimated_sell_price != null
                          ? String(deal.estimated_sell_price / 100)
                          : form.sold_price_euros,
                    });
                  }}
                  required
                >
                  <option value="">— select —</option>
                  {boughtDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title.slice(0, 60)} ({d.status})
                    </option>
                  ))}
                </select>
                {boughtDeals.length === 0 && (
                  <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    No deals with status "bought" or "contacted" found. Mark a deal as bought first.
                  </span>
                )}
              </div>
              <div className="row gap-2">
                <div className="form-group grow">
                  <label>Bought Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.bought_price_euros}
                    onChange={(e) => setForm({ ...form, bought_price_euros: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group grow">
                  <label>Sold Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.sold_price_euros}
                    onChange={(e) => setForm({ ...form, sold_price_euros: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group grow">
                  <label>Fees (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.platform_fees_euros}
                    onChange={(e) => setForm({ ...form, platform_fees_euros: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Sold At (leave empty for now)</label>
                <input
                  type="date"
                  value={form.sold_at}
                  onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div
                className="card"
                style={{
                  padding: 12,
                  background: 'var(--bg)',
                  marginBottom: 12,
                }}
              >
                <div className="card-title">Preview Net Profit</div>
                <div
                  className="card-value"
                  style={{
                    fontSize: 18,
                    color: previewProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}
                >
                  {formatCentsPrecise(previewProfit)}
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
