import { useState, useEffect } from 'react';
import axios from 'axios';

export interface Deal {
  id: number;
  external_id: string;
  platform: string;
  title: string;
  description?: string;
  ask_price: number;
  url: string;
  image_url?: string;
  location?: string;
  seller?: string;
  estimated_sell_price?: number;
  estimated_margin?: number;
  margin_percent?: number;
  score?: number;
  status: string;
  found_at: string;
}

export function useDeals(status?: string) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    axios.get(`/api/deals?${params}`)
      .then(res => setDeals(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  return { deals, loading, error };
}
