import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { searchCategories } from '../../../data/processed/categories';
import { ChevronDown, Search } from 'lucide-react';

interface Props {
  value?: string | null;
  onChange: (value: string, text: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CategoryComboBox({ value, onChange, placeholder = 'دسته‌بندی...', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(() => searchCategories(''));
  const [highlight, setHighlight] = useState(0);
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const filtered = query.trim() ? searchCategories(query) : searchCategories('');
    setItems(filtered.slice(0, 20));
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = items[highlight];
      if (sel) {
        onChange(sel.value, sel.text);
        setOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={container} className={`relative ${className}`}>
      <div className="search-container">
        <Search className="w-4 h-4 text-[var(--text-muted)] ml-2" />
        <input
          aria-label="دسته‌بندی"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="input-base"
        />
        <button onClick={() => setOpen((s) => !s)} aria-label="باز/بسته" className="btn btn-ghost btn-sm ml-2">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div role="listbox" className="absolute z-40 mt-2 w-full rounded-xl shadow-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden">
          {items.length === 0 ? (
            <div className="p-3 text-sm text-[var(--text-muted)]">نتیجه‌ای یافت نشد</div>
          ) : (
            items.map((it, idx) => (
              <button
                key={it.value}
                role="option"
                aria-selected={highlight === idx}
                onClick={() => { onChange(it.value, it.text); setOpen(false); setQuery(''); }}
                onMouseEnter={() => setHighlight(idx)}
                className={`w-full text-right px-4 py-3 text-sm transition-colors ${highlight === idx ? 'bg-[var(--brand-light)]' : 'hover:bg-[var(--bg-tertiary)]'}`}
              >
                {it.text}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
