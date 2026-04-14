import { useState, KeyboardEvent, ClipboardEvent } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addMany = (raws: string[]) => {
    const next = [...value];
    for (const raw of raws) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (!next.includes(trimmed)) next.push(trimmed);
    }
    onChange(next);
    setDraft('');
  };

  const add = (raw: string) => addMany([raw.replace(/,$/, '')]);

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',') || text.includes('\n')) {
      e.preventDefault();
      addMany(text.split(/[,\n]/));
    }
  };

  return (
    <div className="tag-input">
      {value.map((v, i) => (
        <span key={`${v}-${i}`} className="chip">
          {v}
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Remove ${v}`}
            tabIndex={-1}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onPaste={handlePaste}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? placeholder : ''}
      />
    </div>
  );
}
