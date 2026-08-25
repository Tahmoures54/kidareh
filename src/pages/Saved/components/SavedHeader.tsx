import React, { memo } from "react";
import { motion } from "framer-motion";
import { Heart, Trash2, ArrowUpDown, RefreshCw, Search, LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";
export type Filter = "all" | "price_drop" | "available";

interface Props {
  selectionMode: boolean;
  selectedCount: number;
  onCancelSelection: () => void;
  onBatchRemove: () => void;
  productCount: number;
  onToggleSort: () => void;
  onRefresh: () => void;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  counts: { all: number; price_drop: number; available: number };
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

export const SavedHeader = memo(({
  selectionMode, selectedCount, onCancelSelection, onBatchRemove,
  productCount, onToggleSort, onRefresh, loading,
  searchQuery, setSearchQuery, filter, setFilter, counts, viewMode, setViewMode
}: Props) => {
  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-secondary)]/85 backdrop-blur-2xl border-b border-[var(--border-light)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-sm">
      <div className="flex items-center justify-between mb-3 h-10">
        {selectionMode ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button onClick={onCancelSelection} className="text-[var(--text-secondary)] font-black text-xs bg-[var(--bg-tertiary)] px-4 py-2 rounded-xl active:scale-95 transition">لغو</button>
              <span className="font-black text-sm text-[var(--text-primary)]">{selectedCount} مورد</span>
            </div>
            <button onClick={onBatchRemove} className="text-white bg-rose-600 px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-500/20 active:scale-95 transition">
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="bg-[var(--brand-primary)]/10 p-2 rounded-xl">
                <Heart className="w-5 h-5 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-[var(--text-primary)] leading-none">نشان‌ها</h1>
                {productCount > 0 && <span className="text-[10px] font-bold text-[var(--brand-primary)]">{productCount} کالا ذخیره شده</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onToggleSort} className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg-tertiary)] active:scale-90 transition">
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button onClick={onRefresh} disabled={loading} className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)] rounded-xl hover:bg-[var(--bg-tertiary)] disabled:opacity-40 active:scale-90 transition">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--brand-primary)]" : ""}`} />
              </button>
            </div>
          </>
        )}
      </div>

      {!selectionMode && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-3 relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input 
            type="text" placeholder="جستجو در نشان‌ها..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-[var(--bg-tertiary)] border border-transparent focus:border-[var(--brand-primary)]/50 focus:shadow-[0_0_0_3px_var(--brand-glow)] rounded-2xl py-2.5 pr-10 pl-4 text-sm font-bold placeholder:text-[var(--text-muted)] text-[var(--text-primary)] focus:outline-none transition-all" 
          />
        </motion.div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: "all", label: "همه", count: counts.all },
            { id: "price_drop", label: "کاهش قیمت", count: counts.price_drop },
            { id: "available", label: "موجود", count: counts.available },
          ].map(t => (
            <button 
              key={t.id} onClick={() => setFilter(t.id as Filter)} 
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all active:scale-95 ${
                filter === t.id 
                  ? "bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-glow)]" 
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]"
              }`}
            >
              {t.label} 
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  filter === t.id ? "bg-white/20 text-white" : "bg-[var(--border-light)] text-[var(--text-muted)]"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="bg-[var(--bg-tertiary)] p-1 rounded-xl flex items-center shrink-0 border border-[var(--border-light)]">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-[var(--bg-secondary)] shadow-sm text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-[var(--bg-secondary)] shadow-sm text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
});