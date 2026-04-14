import { ReactNode, useEffect, useRef, useState } from 'react';

interface InlineEditProps {
  value: string | number;
  onSave: (next: string) => Promise<void> | void;
  type?: 'text' | 'number';
  step?: string;
  format?: (value: string | number) => ReactNode;
  className?: string;
  width?: number;
  placeholder?: string;
}

export function InlineEdit({
  value,
  onSave,
  type = 'text',
  step,
  format,
  className,
  width = 140,
  placeholder,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(String(value ?? ''));
  }, [value, editing]);

  const commit = async () => {
    if (busy) return;
    if (draft === String(value ?? '')) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setDraft(String(value ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setDraft(String(value ?? ''));
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className={`inline-edit ${className ?? ''}`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {format ? format(value) : value !== '' && value != null ? value : <span className="dim">—</span>}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className="inline-edit-input"
      type={type}
      step={step}
      placeholder={placeholder}
      value={draft}
      disabled={busy}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
      style={{ width }}
    />
  );
}
