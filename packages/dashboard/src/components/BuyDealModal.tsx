import { FormEvent, useState } from 'react';
import { Deal, dealsApi, formatCentsPrecise } from '../api/client';

interface BuyDealModalProps {
  deal: Deal;
  onClose: () => void;
  onSaved: (deal: Deal) => void;
}

export function BuyDealModal({ deal, onClose, onSaved }: BuyDealModalProps) {
  const [price, setPrice] = useState(() =>
    deal.bought_price != null
      ? String(deal.bought_price / 100)
      : deal.ask_price != null
      ? String(deal.ask_price / 100)
      : '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(price) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setError('Invalid price');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await dealsApi.update(deal.id, {
        status: 'bought',
        bought_price: cents,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Mark as Bought</h2>
        <p className="muted mono" style={{ fontSize: 11, marginBottom: 12 }}>
          {deal.title}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Actual Bought Price (€)</label>
            <input
              type="number"
              step="0.01"
              autoFocus
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <span className="dim mono" style={{ fontSize: 10, marginTop: 4 }}>
              Ask was {formatCentsPrecise(deal.ask_price)}
              {deal.estimated_sell_price != null && (
                <> · est. sell {formatCentsPrecise(deal.estimated_sell_price)}</>
              )}
            </span>
          </div>

          {error && (
            <div className="text-red mono mb-4" style={{ fontSize: 12 }}>
              {error}
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Mark as Bought'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
