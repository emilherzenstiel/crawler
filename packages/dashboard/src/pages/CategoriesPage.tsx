import { useEffect, useState } from 'react';
import { categoriesApi, Category, formatCents } from '../api/client';

interface FormState {
  name: string;
  platform: 'kleinanzeigen' | 'ebay';
  keywords: string; // comma-separated in the form
  max_buy_price: string; // in euros in the form
}

const EMPTY_FORM: FormState = {
  name: '',
  platform: 'kleinanzeigen',
  keywords: '',
  max_buy_price: '',
};

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    categoriesApi.list().then(setCategories).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      platform: cat.platform,
      keywords: cat.keywords.join(', '),
      max_buy_price: cat.max_buy_price != null ? String(cat.max_buy_price / 100) : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const keywords = form.keywords.split(',').map((s) => s.trim()).filter(Boolean);
    const max_buy_price = form.max_buy_price ? Math.round(Number(form.max_buy_price) * 100) : null;

    try {
      if (editing) {
        await categoriesApi.update(editing.id, {
          name: form.name,
          platform: form.platform,
          keywords,
          max_buy_price,
        });
      } else {
        await categoriesApi.create({
          name: form.name,
          platform: form.platform,
          keywords,
          max_buy_price,
        });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Kategorie wirklich löschen?')) return;
    try {
      await categoriesApi.delete(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const toggleActive = async (cat: Category) => {
    await categoriesApi.update(cat.id, { active: cat.active ? 0 : 1 });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <div className="subtitle">Scraping targets · keywords</div>
        </div>
        <button className="primary" onClick={openCreate}>
          + New Category
        </button>
      </div>

      {error && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent-red)' }}>
          <span className="text-red mono">{error}</span>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Platform</th>
            <th>Keywords</th>
            <th>Max Buy</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td>{cat.name}</td>
              <td className="muted">{cat.platform}</td>
              <td className="muted" style={{ maxWidth: 320 }}>
                {cat.keywords.join(', ')}
              </td>
              <td>{formatCents(cat.max_buy_price)}</td>
              <td>
                <button onClick={() => toggleActive(cat)}>
                  {cat.active ? 'ON' : 'OFF'}
                </button>
              </td>
              <td>
                <div className="row">
                  <button onClick={() => openEdit(cat)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(cat.id)}>
                    Del
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-state">
                No categories yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={form.platform}
                  onChange={(e) =>
                    setForm({ ...form, platform: e.target.value as FormState['platform'] })
                  }
                >
                  <option value="kleinanzeigen">kleinanzeigen</option>
                  <option value="ebay">ebay</option>
                </select>
              </div>
              <div className="form-group">
                <label>Keywords (comma-separated)</label>
                <input
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="sockel 775, lga 1366, am2+"
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Buy Price (€)</label>
                <input
                  type="number"
                  value={form.max_buy_price}
                  onChange={(e) => setForm({ ...form, max_buy_price: e.target.value })}
                  placeholder="400"
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
