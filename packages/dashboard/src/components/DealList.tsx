import { useEffect, useState } from 'react';
import { DealCard } from './DealCard';
import { useDeals } from '../hooks/useDeals';
import { categoriesApi, Category, DealsQuery, dealsApi, Deal } from '../api/client';

type SortKey = NonNullable<DealsQuery['sort_by']>;
type StatusFilter = '' | NonNullable<DealsQuery['status']>;

export function DealList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [minMargin, setMinMargin] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('score');

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(console.error);
  }, []);

  const query: DealsQuery = {
    sort_by: sortBy,
    limit: 100,
  };
  if (categoryId !== '') query.category_id = categoryId;
  if (status) query.status = status;
  // The API filters by min_score, so we map minMargin (%) to a heuristic
  // min_score threshold: 0 margin => score 0, 100% margin => ~0.4 + freshness/conf contribution.
  // We still pass min_score = minMargin / 250 as a rough floor; front-end filters the rest.
  if (minMargin) query.min_score = Math.max(0, Number(minMargin) / 250);

  const { data, loading, error, refetch, updateLocalDeal } = useDeals(query);

  const filtered = (data?.deals ?? []).filter((d) => {
    if (!minMargin) return true;
    return (d.margin_percent ?? -Infinity) >= Number(minMargin);
  });

  const handleStatusChange = async (id: number, newStatus: Deal['status']) => {
    const prev = data?.deals.find((d) => d.id === id);
    updateLocalDeal(id, { status: newStatus });
    try {
      await dealsApi.update(id, { status: newStatus });
    } catch (err) {
      console.error('Status update failed:', err);
      if (prev) updateLocalDeal(id, { status: prev.status });
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <label>
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="">All</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="bought">Bought</option>
            <option value="sold">Sold</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>

        <label>
          Min Margin %
          <input
            type="number"
            value={minMargin}
            onChange={(e) => setMinMargin(e.target.value)}
            placeholder="0"
            style={{ width: 80 }}
          />
        </label>

        <label>
          Sort By
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            <option value="score">Score</option>
            <option value="margin">Margin (€)</option>
            <option value="margin_percent">Margin (%)</option>
            <option value="date">Date</option>
            <option value="price">Ask Price</option>
          </select>
        </label>

        <div className="grow" />

        <button onClick={refetch} disabled={loading}>
          {loading ? '↻ Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 16 }}>
          <span className="text-red mono">ERROR: {error}</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          No deals match the current filters.
          <br />
          Run the scraper: <code>npx tsx packages/scraper/src/index.ts</code>
        </div>
      )}

      <div className="col">
        {filtered.map((deal) => (
          <DealCard key={deal.id} deal={deal} onStatusChange={handleStatusChange} />
        ))}
      </div>

      {data && (
        <div className="muted mono" style={{ marginTop: 16, fontSize: 11 }}>
          Showing {filtered.length} of {data.pagination.total}
        </div>
      )}
    </div>
  );
}
