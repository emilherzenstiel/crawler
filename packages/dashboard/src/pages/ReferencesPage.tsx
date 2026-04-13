import { useEffect, useState } from 'react';
import {
  referencesApi,
  categoriesApi,
  ReferencePrice,
  Category,
  formatCentsPrecise,
} from '../api/client';

interface FormState {
  category_id: number | '';
  item_pattern: string;
  display_name: string;
  avg_sell_price_euros: string;
  source: string;
  notes: string;
}

const EMPTY: FormState = {
  category_id: '',
  item_pattern: '',
  display_name: '',
  avg_sell_price_euros: '',
  source: 'manual',
  notes: '',
};

export function ReferencesPage() {
  const [refs, setRefs] = useState<ReferencePrice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCat, setFilterCat] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ReferencePrice | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    referencesApi
      .list(filterCat === '' ? undefined : filterCat)
      .then(setRefs)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [filterCat]);

  const catName = (id: number) => categories.find((c) => c.id === id)?.name ?? `#${id}`;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, category_id: filterCat === '' ? '' : filterCat });
    setShowForm(true);
  };

  const openEdit = (r: ReferencePrice) => {
    setEditing(r);
    setForm({
      category_id: r.category_id,
      item_pattern: r.item_pattern,
      display_name: r.display_name,
      avg_sell_price_euros: String(r.avg_sell_price / 100),
      source: r.source ?? '',
      notes: r.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.category_id === '') {
      setError('Please select a category');
      return;
    }

    const payload = {
      category_id: Number(form.category_id),
      item_pattern: form.item_pattern,
      display_name: form.display_name,
      avg_sell_price: Math.round(Number(form.avg_sell_price_euros) * 100),
      source: form.source || null,
      notes: form.notes || null,
    };

    try {
      if (editing) {
        await referencesApi.update(editing.id, payload);
      } else {
        await referencesApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Referenzpreis löschen?')) return;
    await referencesApi.delete(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reference Prices</h1>
          <div className="subtitle">Benchmark · avg sell price per item</div>
        </div>
        <button className="primary" onClick={openCreate}>
          + New Reference
        </button>
      </div>

      {error && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent-red)' }}>
          <span className="text-red mono">{error}</span>
        </div>
      )}

      <div className="filter-bar">
        <label>
          Category
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Display Name</th>
            <th>Pattern</th>
            <th>Category</th>
            <th>Avg Sell</th>
            <th>Source</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {refs.map((r) => (
            <tr key={r.id}>
              <td>{r.display_name}</td>
              <td className="muted">{r.item_pattern}</td>
              <td className="muted">{catName(r.category_id)}</td>
              <td className="text-green">{formatCentsPrecise(r.avg_sell_price)}</td>
              <td className="muted">{r.source ?? '—'}</td>
              <td className="muted" style={{ fontSize: 11 }}>
                {r.last_updated?.slice(0, 10) ?? '—'}
              </td>
              <td>
                <div className="row">
                  <button onClick={() => openEdit(r)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(r.id)}>
                    Del
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {refs.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-state">
                No references for this category.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Reference' : 'New Reference'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category_id: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  required
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Display Name</label>
                <input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="ASUS P5Q Deluxe"
                  required
                />
              </div>
              <div className="form-group">
                <label>Match Pattern (lowercase substring)</label>
                <input
                  value={form.item_pattern}
                  onChange={(e) => setForm({ ...form, item_pattern: e.target.value })}
                  placeholder="asus p5q"
                  required
                />
              </div>
              <div className="form-group">
                <label>Avg Sell Price (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.avg_sell_price_euros}
                  onChange={(e) => setForm({ ...form, avg_sell_price_euros: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Source</label>
                <input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="ebay_sold"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  {editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
