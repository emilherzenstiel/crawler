import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  referencesApi,
  categoriesApi,
  ReferencePrice,
  Category,
  formatCentsPrecise,
} from '../api/client';
import { InlineEdit } from '../components/InlineEdit';

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
  const [showImport, setShowImport] = useState(false);
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

  const grouped = useMemo(() => {
    const map = new Map<number, ReferencePrice[]>();
    for (const r of refs) {
      const list = map.get(r.category_id) ?? [];
      list.push(r);
      map.set(r.category_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.display_name.localeCompare(b.display_name));
    }
    return Array.from(map.entries()).sort((a, b) =>
      catName(a[0]).localeCompare(catName(b[0])),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs, categories]);

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
    try {
      await referencesApi.delete(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const patchInline = async (id: number, data: Partial<ReferencePrice>) => {
    setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    try {
      const updated = await referencesApi.update(id, data);
      setRefs((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      load();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reference Prices</h1>
          <div className="subtitle">Benchmark · avg sell price per item</div>
        </div>
        <div className="row">
          <button onClick={() => setShowImport(true)}>⇪ Import CSV</button>
          <button className="primary" onClick={openCreate}>
            + New Reference
          </button>
        </div>
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
            onChange={(e) =>
              setFilterCat(e.target.value === '' ? '' : Number(e.target.value))
            }
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
            <th style={{ width: 260 }}>Display Name</th>
            <th style={{ width: 180 }}>Pattern</th>
            <th style={{ width: 140 }}>Avg Sell</th>
            <th style={{ width: 120 }}>Source</th>
            <th style={{ width: 120 }}>Updated</th>
            <th style={{ width: 140 }} />
          </tr>
        </thead>
        <tbody>
          {grouped.map(([catId, items]) => (
            <Fragment key={catId}>
              <tr className="group-row">
                <td colSpan={6}>
                  {catName(catId)}
                  <span className="group-count">{items.length} items</span>
                </td>
              </tr>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <InlineEdit
                      value={r.display_name}
                      width={220}
                      onSave={(next) => patchInline(r.id, { display_name: next })}
                    />
                  </td>
                  <td className="muted">
                    <InlineEdit
                      value={r.item_pattern}
                      width={160}
                      onSave={(next) => patchInline(r.id, { item_pattern: next })}
                    />
                  </td>
                  <td className="text-green">
                    <InlineEdit
                      type="number"
                      step="0.01"
                      width={110}
                      value={r.avg_sell_price / 100}
                      format={() => formatCentsPrecise(r.avg_sell_price)}
                      onSave={(next) => {
                        const cents = Math.round(Number(next) * 100);
                        if (!Number.isFinite(cents) || cents < 0) {
                          throw new Error('Invalid price');
                        }
                        return patchInline(r.id, { avg_sell_price: cents });
                      }}
                    />
                  </td>
                  <td className="muted">
                    <InlineEdit
                      value={r.source ?? ''}
                      width={110}
                      placeholder="source"
                      format={(v) => (v ? String(v) : <span className="dim">—</span>)}
                      onSave={(next) =>
                        patchInline(r.id, { source: next.trim() === '' ? null : next })
                      }
                    />
                  </td>
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
            </Fragment>
          ))}
          {grouped.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-state">
                No references.
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
                  onChange={(e) =>
                    setForm({ ...form, avg_sell_price_euros: e.target.value })
                  }
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
              <div
                className="row"
                style={{ justifyContent: 'flex-end', marginTop: 16 }}
              >
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

      {showImport && (
        <CsvImportModal
          categories={categories}
          defaultCategoryId={filterCat === '' ? undefined : filterCat}
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
    </div>
  );
}

interface CsvRow {
  display_name: string;
  item_pattern: string;
  avg_sell_price: number;
  source: string | null;
  notes: string | null;
  error: string | null;
  raw: string;
}

interface CsvImportModalProps {
  categories: Category[];
  defaultCategoryId?: number;
  onClose: () => void;
  onImported: () => void;
}

function CsvImportModal({
  categories,
  defaultCategoryId,
  onClose,
  onImported,
}: CsvImportModalProps) {
  const [categoryId, setCategoryId] = useState<number | ''>(defaultCategoryId ?? '');
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const rows: CsvRow[] = useMemo(() => {
    const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '');
    return lines.map((line) => {
      // Accept tab OR semicolon as separator; fall back to 2+ spaces
      const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : /\s{2,}/;
      const parts = line.split(sep).map((p) => p.trim());
      const [display_name, item_pattern, priceStr, source, notes] = parts;

      if (!display_name || !item_pattern || !priceStr) {
        return {
          display_name: display_name ?? '',
          item_pattern: item_pattern ?? '',
          avg_sell_price: 0,
          source: null,
          notes: null,
          error:
            'Missing field (expected: name ⇥ pattern ⇥ price ⇥ [source] ⇥ [notes])',
          raw: line,
        };
      }

      const normalized = priceStr.replace(/[€\s]/g, '').replace(',', '.');
      const price = Number(normalized);
      if (!Number.isFinite(price) || price < 0) {
        return {
          display_name,
          item_pattern,
          avg_sell_price: 0,
          source: null,
          notes: null,
          error: `Invalid price: "${priceStr}"`,
          raw: line,
        };
      }

      return {
        display_name,
        item_pattern,
        avg_sell_price: Math.round(price * 100),
        source: source ? source : null,
        notes: notes ? notes : null,
        error: null,
        raw: line,
      };
    });
  }, [text]);

  const okRows = rows.filter((r) => !r.error);
  const errCount = rows.length - okRows.length;

  const handleImport = async () => {
    if (categoryId === '') {
      setReport('Please select a target category.');
      return;
    }
    setImporting(true);
    setReport(null);
    let created = 0;
    let failed = 0;
    for (const row of okRows) {
      try {
        await referencesApi.create({
          category_id: Number(categoryId),
          display_name: row.display_name,
          item_pattern: row.item_pattern,
          avg_sell_price: row.avg_sell_price,
          source: row.source,
          notes: row.notes,
        });
        created++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setReport(
      `Imported ${created} row${created === 1 ? '' : 's'}` +
        (failed > 0 ? `, ${failed} failed` : '') +
        (errCount > 0 ? ` · ${errCount} invalid skipped` : '') +
        '.',
    );
    if (created > 0) {
      onImported();
      setText('');
    }
  };

  const placeholder =
    'ASUS P5Q Deluxe\tasus p5q\t280\tebay_sold\ttop-of-line board\n' +
    'Gigabyte GA-EP45-DS3L\tep45-ds3l\t150\tebay_sold\t\n' +
    'MSI P45 Neo-F\tp45 neo-f\t175\t\t';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>Bulk Import References</h2>
        <p className="muted mono" style={{ fontSize: 11, marginBottom: 12 }}>
          Tab-separated: display_name ⇥ pattern ⇥ price(€) ⇥ [source] ⇥ [notes]
        </p>

        <div className="form-group">
          <label>Target Category</label>
          <select
            value={categoryId}
            onChange={(e) =>
              setCategoryId(e.target.value === '' ? '' : Number(e.target.value))
            }
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
          <label>Paste TSV</label>
          <textarea
            className="csv-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
          />
        </div>

        {rows.length > 0 && (
          <div className="csv-preview">
            <div className="preview-header">
              <span className="text-green">{okRows.length} valid</span>
              {errCount > 0 && (
                <>
                  {' · '}
                  <span className="text-red">{errCount} errors</span>
                </>
              )}
              {' · '}
              {rows.length} total
            </div>
            {rows.slice(0, 80).map((row, i) => (
              <div key={i} className={row.error ? 'row-err' : 'row-ok'}>
                {row.error
                  ? `[ERR] ${row.error} — ${row.raw}`
                  : `${row.display_name}  →  ${formatCentsPrecise(
                      row.avg_sell_price,
                    )}  (pattern: ${row.item_pattern}${
                      row.source ? `, source: ${row.source}` : ''
                    })`}
              </div>
            ))}
            {rows.length > 80 && (
              <div className="muted" style={{ marginTop: 6 }}>
                … and {rows.length - 80} more
              </div>
            )}
          </div>
        )}

        {report && (
          <div className="mt-4 mono" style={{ fontSize: 12 }}>
            {report}
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={onClose} disabled={importing}>
            Close
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleImport}
            disabled={importing || okRows.length === 0 || categoryId === ''}
          >
            {importing ? 'Importing…' : `Import ${okRows.length} rows`}
          </button>
        </div>
      </div>
    </div>
  );
}
