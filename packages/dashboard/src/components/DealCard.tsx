import { Deal, formatCents } from '../api/client';
import { MarginBadge } from './MarginBadge';

interface DealCardProps {
  deal: Deal;
  onStatusChange?: (id: number, status: Deal['status']) => void;
}

export function DealCard({ deal, onStatusChange }: DealCardProps) {
  const hot = (deal.margin_percent ?? 0) >= 100;

  return (
    <div className={`deal-card ${hot ? 'hot' : ''}`}>
      <div className="thumb">
        {deal.image_url ? (
          <img src={deal.image_url} alt="" loading="lazy" />
        ) : (
          <span>NO IMG</span>
        )}
      </div>

      <div className="content">
        <div className="title">
          <a href={deal.url} target="_blank" rel="noopener noreferrer">
            {deal.title}
          </a>
        </div>

        <div className="meta">
          <span>{deal.platform}</span>
          {deal.location && <span>· {deal.location}</span>}
          {deal.category_name && <span>· {deal.category_name}</span>}
          {deal.reference_display_name && (
            <span className="text-green">↔ {deal.reference_display_name}</span>
          )}
        </div>

        <div className="prices">
          <div>
            <span className="label">Ask</span>
            <span className="val">{formatCents(deal.ask_price)}</span>
          </div>
          <div>
            <span className="label">Est. Sell</span>
            <span className="val">{formatCents(deal.estimated_sell_price)}</span>
          </div>
          <div>
            <span className="label">Margin</span>
            <span
              className={`val ${
                (deal.estimated_margin ?? 0) >= 0 ? 'text-green' : 'text-red'
              }`}
            >
              {formatCents(deal.estimated_margin)}
            </span>
          </div>
          <div>
            <span className="label">Score</span>
            <span className="val mono">{deal.score != null ? deal.score.toFixed(2) : '–'}</span>
          </div>
        </div>
      </div>

      <div className="aside">
        <MarginBadge marginPercent={deal.margin_percent} />
        {onStatusChange ? (
          <select
            className={`status-pill ${deal.status}`}
            value={deal.status}
            onChange={(e) => onStatusChange(deal.id, e.target.value as Deal['status'])}
          >
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="bought">bought</option>
            <option value="sold">sold</option>
            <option value="skipped">skipped</option>
          </select>
        ) : (
          <span className={`status-pill ${deal.status}`}>{deal.status}</span>
        )}
      </div>
    </div>
  );
}
