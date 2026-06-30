import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { categoriesData } from "@data/processed/categories";

export default function CategorySelect({ value, onChange, storeName }: { value: string, onChange: (v: string) => void, storeName: string }) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const flatCategories = useMemo(() => categoriesData.flatMap(g => g.types.map(t => ({ ...t, group: g.group }))), []);
  
  const filtered = useMemo(() => {
    if (!search.trim()) return flatCategories;
    const s = search.trim().toLowerCase();
    return flatCategories.filter(c => c.text.toLowerCase().includes(s) || c.group.toLowerCase().includes(s));
  }, [search, flatCategories]);

  const suggestions = useMemo(() => {
    if (!storeName.trim()) return [];
    const words = storeName.trim().toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    return flatCategories.filter(c => words.some(w => c.text.toLowerCase().includes(w))).slice(0, 3);
  }, [storeName, flatCategories]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (val: string) => { onChange(val); setSearch(""); setShow(false); };

  return (
    <div>
      <label className="block text-[12px] font-black text-slate-700 dark:text-slate-300 mb-2 px-1">صنف فعالیت <span className="text-rose-500">*</span></label>
      {suggestions.length > 0 && !value && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] font-bold text-slate-500 self-center">پیشنهادها:</span>
          {suggestions.map(sc => (
            <button type="button" key={sc.value} onClick={() => handleSelect(sc.value)} className="px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[12px] font-bold hover:bg-cyan-100 transition-colors">
              {sc.text}
            </button>
          ))}
        </div>
      )}
      <div className="relative" ref={dropdownRef}>
        <div className={`bg-white dark:bg-slate-800/80 border rounded-[20px] flex items-center px-4 h-14 transition-all ${show ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={value ? flatCategories.find(c => c.value === value)?.text || "" : search}
            onChange={(e) => { if (value) onChange(""); setSearch(e.target.value); setShow(true); }}
            onFocus={() => setShow(true)}
            placeholder="جستجوی صنف..."
            className="flex-1 w-full bg-transparent border-none outline-none px-3 text-[14px] font-bold text-slate-900 dark:text-white"
          />
          {value || search ? <button type="button" onClick={() => { onChange(""); setSearch(""); setShow(false); }} className="p-1"><X className="w-4 h-4 text-slate-400" /></button> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
        {show && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-800 border rounded-[20px] shadow-xl max-h-60 overflow-y-auto z-50">
            {filtered.length === 0 ? <div className="p-4 text-center text-slate-500">موردی یافت نشد</div> : filtered.map(cat => (
              <button key={cat.value} type="button" onClick={() => handleSelect(cat.value)} className="w-full text-right px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 border-b border-slate-100 last:border-0">
                <div><span className="text-[14px] font-bold block">{cat.text}</span><span className="text-[11px] text-slate-500">{cat.group}</span></div>
                {value === cat.value && <Check className="w-4 h-4 text-cyan-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}