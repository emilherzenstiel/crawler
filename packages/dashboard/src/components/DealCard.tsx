import { Deal } from '../hooks/useDeals.ts';
import { MarginBadge } from './MarginBadge.tsx';

interface DealCardProps {
  deal: Deal;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' €';
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      display: 'flex',
      gap: 16,
    }}>
      {deal.image_url && (
        <img src={deal.image_url} alt={deal.title} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 4 }} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <h3 style={{ margin: 0 }}>
            <a href={deal.url} target="_blank" rel="noopener noreferrer">{deal.title}</a>
          </h3>
          {deal.margin_percent != null && <MarginBadge marginPercent={deal.margin_percent} />}
        </div>
        <p style={{ margin: '4px 0', color: '#666' }}>
          {deal.platform} {deal.location && `· ${deal.location}`}
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          <span><strong>Preis:</strong> {formatCents(deal.ask_price)}</span>
          {deal.estimated_sell_price && <span><strong>Verkauf:</strong> ~{formatCents(deal.estimated_sell_price)}</span>}
          {deal.estimated_margin && <span><strong>Marge:</strong> {formatCents(deal.estimated_margin)}</span>}
        </div>
        <span style={{ fontSize: 12, color: '#999' }}>Status: {deal.status} · Score: {deal.score?.toFixed(2) ?? '–'}</span>
      </div>
    </div>
  );
}
