import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  timeout: 10000,
});

export type DealStatus = 'new' | 'contacted' | 'bought' | 'sold' | 'skipped';

export interface Deal {
  id: number;
  external_id: string;
  platform: string;
  category_id: number;
  title: string;
  description: string | null;
  ask_price: number | null;
  url: string;
  image_url: string | null;
  location: string | null;
  seller: string | null;
  matched_reference_id: number | null;
  estimated_sell_price: number | null;
  estimated_margin: number | null;
  margin_percent: number | null;
  score: number | null;
  status: DealStatus;
  bought_price: number | null;
  sold_price: number | null;
  found_at: string;
  listing_date: string | null;
  updated_at: string;
  category_name?: string;
  reference_display_name?: string;
  reference_avg_sell_price?: number;
}

export interface DealsResponse {
  deals: Deal[];
  pagination: { total: number; limit: number; offset: number };
}

export interface Category {
  id: number;
  name: string;
  platform: 'kleinanzeigen' | 'ebay';
  keywords: string[];
  max_buy_price: number | null;
  active: number;
  created_at: string;
}

export interface ReferencePrice {
  id: number;
  category_id: number;
  item_pattern: string;
  display_name: string;
  avg_sell_price: number;
  source: string | null;
  last_updated: string | null;
  notes: string | null;
}

export interface Stats {
  deals: {
    total: number;
    by_status: Record<DealStatus, number>;
    today: number;
    this_week: number;
  };
  margins: {
    top_10pct_avg_percent: number;
    overall_avg_percent: number;
  };
  flips: {
    total_count: number;
    total_profit_cents: number;
    profit_this_month_cents: number;
    profit_this_week_cents: number;
  };
}

export interface Flip {
  id: number;
  deal_id: number;
  bought_price: number;
  sold_price: number;
  platform_fees: number;
  net_profit: number;
  sold_at: string | null;
  notes: string | null;
  deal_title?: string;
  deal_url?: string;
  deal_platform?: string;
}

export interface DealsQuery {
  category_id?: number;
  status?: DealStatus;
  min_score?: number;
  sort_by?: 'score' | 'margin' | 'margin_percent' | 'date' | 'price';
  limit?: number;
  offset?: number;
}

// --- Deals ---
export const dealsApi = {
  list: (query: DealsQuery = {}) =>
    api.get<DealsResponse>('/deals', { params: query }).then((r) => r.data),
  get: (id: number) => api.get<Deal>(`/deals/${id}`).then((r) => r.data),
  update: (id: number, data: Partial<Pick<Deal, 'status' | 'bought_price' | 'sold_price'>>) =>
    api.patch<Deal>(`/deals/${id}`, data).then((r) => r.data),
};

// --- Categories ---
export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
  create: (data: Omit<Category, 'id' | 'created_at' | 'active'> & { active?: boolean }) =>
    api.post<Category>('/categories', data).then((r) => r.data),
  update: (id: number, data: Partial<Omit<Category, 'id' | 'created_at'>>) =>
    api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`).then(() => undefined),
};

// --- References ---
export const referencesApi = {
  list: (categoryId?: number) =>
    api
      .get<ReferencePrice[]>('/references', {
        params: categoryId != null ? { category_id: categoryId } : {},
      })
      .then((r) => r.data),
  create: (data: Omit<ReferencePrice, 'id' | 'last_updated'>) =>
    api.post<ReferencePrice>('/references', data).then((r) => r.data),
  update: (id: number, data: Partial<Omit<ReferencePrice, 'id' | 'last_updated'>>) =>
    api.patch<ReferencePrice>(`/references/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/references/${id}`).then(() => undefined),
};

// --- Stats ---
export const statsApi = {
  get: () => api.get<Stats>('/stats').then((r) => r.data),
};

// --- Flips ---
export interface FlipCreateInput {
  deal_id: number;
  bought_price: number;
  sold_price: number;
  platform_fees?: number;
  sold_at?: string;
  notes?: string;
}

export const flipsApi = {
  list: () => api.get<Flip[]>('/flips').then((r) => r.data),
  create: (data: FlipCreateInput) => api.post<Flip>('/flips', data).then((r) => r.data),
  delete: (id: number) => api.delete(`/flips/${id}`).then(() => undefined),
};

// --- Formatting helpers ---
export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '–';
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export function formatCentsPrecise(cents: number | null | undefined): string {
  if (cents == null) return '–';
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
