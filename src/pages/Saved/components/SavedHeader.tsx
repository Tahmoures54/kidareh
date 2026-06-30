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
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800/60 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-sm">
      <div className="flex items-center justify-between mb-3 h-10">
        {selectionMode ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button onClick={onCancelSelection} className="text-gray-600 dark:text-gray-300 font-black text-xs bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl active:scale-95 transition">
                لغو
              </button>
              <span className="font-black text-sm text-gray-900 dark:text-white">{selectedCount} مورد</span>
            </div>
            <button onClick={onBatchRemove} className="text-white bg-rose-600 dark:bg-rose-500 px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-500/20 active:scale-95 transition">
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl">
                <Heart className="w-5 h-5 fill-indigo-600 text-indigo-600 dark:fill-indigo-400 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white leading-none">نشان‌ها</h1>
                {productCount > 0 && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{productCount} کالا ذخیره شده</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onToggleSort} className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition">
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button onClick={onRefresh} disabled={loading} className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 active:scale-90 transition">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
              </button>
            </div>
          </>
        )}
      </div>

      {!selectionMode && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-3 relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="جستجو در نشان‌ها..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-gray-100 dark:bg-gray-800/80 border border-transparent focus:border-indigo-500/50 dark:focus:border-indigo-500/30 rounded-2xl py-2.5 pr-10 pl-4 text-sm font-bold placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-colors" 
          />
        </motion.div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          {[
            { id: "all", label: "همه", count: counts.all },
            { id: "price_drop", label: "کاهش قیمت", count: counts.price_drop },
            { id: "available", label: "موجود", count: counts.available },
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setFilter(t.id as Filter)} 
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all active:scale-95 ${
                filter === t.id 
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {t.label} 
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  filter === t.id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex items-center shrink-0">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
});