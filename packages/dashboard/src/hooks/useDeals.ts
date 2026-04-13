import { useCallback, useEffect, useState } from 'react';
import { dealsApi, Deal, DealsQuery, DealsResponse } from '../api/client';

export function useDeals(query: DealsQuery) {
  const [data, setData] = useState<DealsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize the query so it's a stable dependency
  const key = JSON.stringify(query);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    dealsApi
      .list(query)
      .then((resp) => setData(resp))
      .catch((err) => setError(err.message ?? 'Unknown error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateLocalDeal = useCallback((id: number, patch: Partial<Deal>) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            deals: prev.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
          }
        : prev
    );
  }, []);

  return { data, loading, error, refetch, updateLocalDeal };
}
