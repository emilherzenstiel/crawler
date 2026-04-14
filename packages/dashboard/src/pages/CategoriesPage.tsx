import { useEffect, useState } from 'react';
import { categoriesApi, Category, formatCents } from '../api/client';
import { TagInput } from '../components/TagInput';
import { InlineEdit } from '../components/InlineEdit';

interface FormState {
  name: string;
  platform: 'kleinanzeigen' | 'ebay';
  keywords: string[];
  max_buy_price_euros: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  platform: 'kleinanzeigen',
  keywords: [],
  max_buy_price_euros: '',
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
      keywords: [...cat.keywords],
      max_buy_price_euros: cat.max_buy_price != null ? String(cat.max_buy_price / 100) : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.keywords.length === 0) {
      setError('At least one keyword is required');
      return;
    }

    const max_buy_price = form.max_buy_price_euros
      ? Math.round(Number(form.max_buy_price_euros) * 100)
      : null;

    try {
      const payload = {
        name: form.name,
        platform: form.platform,
        keywords: form.keywords,
        max_buy_price,
      };
      if (editing) {
        await categoriesApi.update(editing.id, payload);
      } else {
        await categoriesApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Kategorie "${cat.name}" wirklich löschen?`)) return;
    try {
      await categoriesApi.delete(cat.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const toggleActive = async (cat: Category) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, active: cat.active ? 0 : 1 } : c)),
    );
    try {
      await categoriesApi.update(cat.id, { active: cat.active ? 0 : 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      load();
    }
  };

  const patchInline = async (
    id: number,
    data: Partial<Pick<Category, 'name' | 'max_buy_price'>>,
  ) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    try {
      const updated = await categoriesApi.update(id, data);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      load();
    }
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
            <th style={{ width: 220 }}>Name</th>
            <th style={{ width: 120 }}>Platform</th>
            <th>Keywords</th>
            <th style={{ width: 140 }}>Max Buy</th>
            <th style={{ width: 80 }}>Active</th>
            <th style={{ width: 140 }} />
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td>
                <InlineEdit
                  value={cat.name}
                  width={180}
                  onSave={(next) => patchInline(cat.id, { name: next })}
                />
              </td>
              <td className="muted">{cat.platform}</td>
              <td>
                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  <span className="count-badge">{cat.keywords.length}</span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {cat.keywords.slice(0, 4).join(', ')}
                    {cat.keywords.length > 4 ? ` +${cat.keywords.length - 4}` : ''}
                  </span>
                </div>
              </td>
              <td>
                <InlineEdit
                  type="number"
                  step="1"
                  width={100}
                  value={cat.max_buy_price != null ? cat.max_buy_price / 100 : ''}
                  format={() =>
                    cat.max_buy_price != null ? (
                      formatCents(cat.max_buy_price)
                    ) : (
                      <span className="dim">—</span>
                    )
                  }
                  placeholder="€"
                  onSave={(next) => {
                    const cents =
                      next.trim() === '' ? null : Math.round(Number(next) * 100);
                    return patchInline(cat.id, { max_buy_price: cents });
                  }}
                />
              </td>
              <td>
                <button
                  onClick={() => toggleActive(cat)}
                  className={cat.active ? 'primary' : ''}
                >
                  {cat.active ? 'ON' : 'OFF'}
                </button>
              </td>
              <td>
                <div className="row">
                  <button onClick={() => openEdit(cat)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(cat)}>
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
                <label>Keywords (Enter or comma to add)</label>
                <TagInput
                  value={form.keywords}
                  onChange={(keywords) => setForm({ ...form, keywords })}
                  placeholder="sockel 775, lga 1366, am2+"
                />
              </div>
              <div className="form-group">
                <label>Max Buy Price (€)</label>
                <input
                  type="number"
                  value={form.max_buy_price_euros}
                  onChange={(e) => setForm({ ...form, max_buy_price_euros: e.target.value })}
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
