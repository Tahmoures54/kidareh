import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { iranCities, IranCity } from '../../../data/processed/iranCities'; // اصلاح شد
import { Search } from 'lucide-react';

interface Props {
  value?: string | null;
  onChange: (city: string, display: string, province: string) => void;
  placeholder?: string;
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function CitySearchComboBox({ value, onChange, placeholder = 'شهر...' }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const deb = useDebounced(q, 250);
  const [items, setItems] = useState<IranCity[]>(iranCities.slice(0, 200));
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = (deb || '').trim().toLowerCase();
    if (!term) {
      setItems(iranCities.slice(0, 200));
      setHighlight(0);
      return;
    }
    const filtered = iranCities.filter(
      c => c.name.toLowerCase().includes(term) || c.province.toLowerCase().includes(term)
    );
    setItems(filtered.slice(0, 200));
    setHighlight(0);
  }, [deb]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[highlight];
      if (it) {
        onChange(it.name, it.display, it.province);
        setOpen(false);
        setQ('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="search-container">
        <Search className="w-4 h-4 text-[var(--text-muted)] ml-2" />
        <input
          aria-label="شهر"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="input-base"
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-2 w-full rounded-xl shadow-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-auto max-h-64">
          {items.length === 0 ? (
            <div className="p-3 text-sm text-[var(--text-muted)]">نتیجه‌ای یافت نشد</div>
          ) : (
            items.map((it, idx) => (
              <button
                key={`${it.name}-${it.province}`}
                onClick={() => {
                  onChange(it.name, it.display, it.province);
                  setOpen(false);
                  setQ('');
                }}
                onMouseEnter={() => setHighlight(idx)}
                role="option"
                aria-selected={highlight === idx}
                className={`w-full text-right px-4 py-3 text-sm transition-colors ${
                  highlight === idx
                    ? 'bg-[var(--brand-light)]'
                    : 'hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold">{it.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{it.province}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
