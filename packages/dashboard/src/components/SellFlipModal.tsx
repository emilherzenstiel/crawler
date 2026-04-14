import { FormEvent, useState } from 'react';
import { Deal, Flip, flipsApi, formatCentsPrecise } from '../api/client';

interface SellFlipModalProps {
  deal: Deal;
  onClose: () => void;
  onSaved: (flip: Flip) => void;
}

function defaultFeePct(platform: string): number {
  if (platform === 'ebay') return 13;
  return 0;
}

export function SellFlipModal({ deal, onClose, onSaved }: SellFlipModalProps) {
  const initialBought =
    deal.bought_price != null
      ? deal.bought_price / 100
      : deal.ask_price != null
      ? deal.ask_price / 100
      : 0;

  const [boughtEuros, setBoughtEuros] = useState(String(initialBought));
  const [soldEuros, setSoldEuros] = useState(
    deal.estimated_sell_price != null ? String(deal.estimated_sell_price / 100) : '',
  );
  const [feePct, setFeePct] = useState(String(defaultFeePct(deal.platform)));
  const [shippingEuros, setShippingEuros] = useState('0');
  const [notes, setNotes] = useState('');
  const [soldAt, setSoldAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boughtCents = Math.round(Number(boughtEuros || 0) * 100);
  const soldCents = Math.round(Number(soldEuros || 0) * 100);
  const feeCents = Math.round((soldCents * Number(feePct || 0)) / 100);
  const shippingCents = Math.round(Number(shippingEuros || 0) * 100);
  const totalFees = feeCents + shippingCents;
  const netProfit = soldCents - boughtCents - totalFees;
  const roi = boughtCents > 0 ? (netProfit / boughtCents) * 100 : 0;

  const applyPreset = (preset: 'ebay' | 'kleinanzeigen' | 'custom') => {
    if (preset === 'ebay') setFeePct('13');
    else if (preset === 'kleinanzeigen') setFeePct('0');
    else setFeePct('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !Number.isFinite(boughtCents) ||
      !Number.isFinite(soldCents) ||
      boughtCents < 0 ||
      soldCents < 0
    ) {
      setError('Invalid numbers');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const flip = await flipsApi.create({
        deal_id: deal.id,
        bought_price: boughtCents,
        sold_price: soldCents,
        platform_fees: totalFees,
        sold_at: soldAt ? new Date(soldAt).toISOString() : new Date().toISOString(),
        notes: notes || undefined,
      });
      onSaved(flip);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record flip');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>Mark as Sold</h2>
        <p className="muted mono" style={{ fontSize: 11, marginBottom: 12 }}>
          {deal.title} · {deal.platform}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="row gap-4">
            <div className="form-group grow">
              <label>Bought (€)</label>
              <input
                type="number"
                step="0.01"
                value={boughtEuros}
                onChange={(e) => setBoughtEuros(e.target.value)}
                required
              />
            </div>
            <div className="form-group grow">
              <label>Sold (€)</label>
              <input
                type="number"
                step="0.01"
                value={soldEuros}
                onChange={(e) => setSoldEuros(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Platform Fees</label>
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className={feePct === '13' ? 'primary' : ''}
                onClick={() => applyPreset('ebay')}
              >
                eBay 13%
              </button>
              <button
                type="button"
                className={feePct === '0' ? 'primary' : ''}
                onClick={() => applyPreset('kleinanzeigen')}
              >
                Kleinanzeigen 0%
              </button>
              <input
                type="number"
                step="0.1"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
                placeholder="% custom"
                style={{ width: 110 }}
              />
              <span className="dim mono" style={{ fontSize: 11 }}>
                = {formatCentsPrecise(feeCents)}
              </span>
            </div>
          </div>

          <div className="row gap-4">
            <div className="form-group grow">
              <label>Shipping (€)</label>
              <input
                type="number"
                step="0.01"
                value={shippingEuros}
                onChange={(e) => setShippingEuros(e.target.value)}
              />
            </div>
            <div className="form-group grow">
              <label>Sold At</label>
              <input
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div
            className="card mb-4"
            style={{ padding: 14, background: 'var(--bg)' }}
          >
            <div className="row space-between">
              <div>
                <div className="card-title">Net Profit</div>
                <div
                  className="card-value"
                  style={{
                    fontSize: 24,
                    color:
                      netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}
                >
                  {formatCentsPrecise(netProfit)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="card-title">ROI</div>
                <div
                  className="card-value"
                  style={{
                    fontSize: 24,
                    color: roi >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}
                >
                  {Number.isFinite(roi) ? roi.toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
            <div
              className="dim mono"
              style={{ fontSize: 10, marginTop: 10, letterSpacing: 0.04 }}
            >
              {formatCentsPrecise(soldCents)} sold − {formatCentsPrecise(boughtCents)} bought − {formatCentsPrecise(feeCents)} fees − {formatCentsPrecise(shippingCents)} shipping
            </div>
          </div>

          {error && (
            <div className="text-red mono mb-4" style={{ fontSize: 12 }}>
              {error}
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Record Flip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
