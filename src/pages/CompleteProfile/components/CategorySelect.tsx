import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { categoriesData } from "@data/processed/categories";

interface CategorySelectProps {
  value: string;
  onChange: (v: string) => void;
  storeName: string;
}

export default function CategorySelect({ value, onChange, storeName }: CategorySelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const flatCategories = useMemo(
    () => categoriesData.flatMap((g) => g.types.map((t) => ({ ...t, group: g.group }))),
    []
  );
  
  const filtered = useMemo(() => {
    if (!search.trim()) return flatCategories;
    const s = search.trim().toLowerCase();
    return flatCategories.filter(c => c.text.toLowerCase().includes(s) || c.group.toLowerCase().includes(s));
  }, [search, flatCategories]);

  const suggestions = useMemo(() => {
    if (!storeName.trim() || value) return [];
    const words = storeName.trim().toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    return flatCategories.filter(c => words.some(w => c.text.toLowerCase().includes(w))).slice(0, 3);
  }, [storeName, flatCategories, value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      } 
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (val: string) => { 
    onChange(val); 
    setSearch(""); 
    setIsOpen(false); 
  };

  const displayValue = value ? flatCategories.find(c => c.value === value)?.text || "" : search;

  return (
    <div>
      <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1">
        صنف فعالیت <span className="text-rose-500">*</span>
      </label>
      
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 self-center">پیشنهادی:</span>
          {suggestions.map(sc => (
            <button type="button" key={sc.value} onClick={() => handleSelect(sc.value)} className="px-3 py-1.5 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs font-bold hover:bg-[var(--brand-primary)]/20 transition-colors">
              {sc.text}
            </button>
          ))}
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <div 
          className={`input-base flex items-center px-4 h-14 transition-all cursor-text ${isOpen ? '!border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20' : ""}`}
          onClick={() => !value && setIsOpen(true)}
        >
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            value={displayValue}
            onChange={(e) => {
              if (value) { onChange(""); setSearch(e.target.value); } 
              else { setSearch(e.target.value); }
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="جستجوی صنف فروشگاه..."
            className="flex-1 w-full bg-transparent border-none outline-none px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          {value || search ? (
            <button type="button" onClick={() => { onChange(""); setSearch(""); setIsOpen(false); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          ) : (
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-50 py-2"
              style={{ scrollbarWidth: "thin" }}
            >
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">صنفی با این نام یافت نشد</div>
              ) : (
                filtered.map(cat => (
                  <button key={cat.value} type="button" onClick={() => handleSelect(cat.value)} className={`w-full text-right px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${value === cat.value ? 'bg-[var(--brand-primary)]/5' : ''}`}>
                    <div>
                      <span className="text-sm font-bold block text-slate-800 dark:text-slate-200">{cat.text}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">{cat.group}</span>
                    </div>
                    {value === cat.value && <Check className="w-5 h-5 text-[var(--brand-primary)] shrink-0" />}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}