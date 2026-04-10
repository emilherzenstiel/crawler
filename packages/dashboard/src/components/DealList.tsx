import { useDeals } from '../hooks/useDeals.ts';
import { DealCard } from './DealCard.tsx';

export function DealList() {
  const { deals, loading, error } = useDeals();

  if (loading) return <p>Lade Deals...</p>;
  if (error) return <p style={{ color: 'red' }}>Fehler: {error}</p>;
  if (deals.length === 0) return <p>Keine Deals gefunden.</p>;

  return (
    <div>
      <h2>Deals ({deals.length})</h2>
      {deals.map(deal => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}
