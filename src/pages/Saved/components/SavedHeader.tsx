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

export const SavedHeader = memo(
  ({
    selectionMode,
    selectedCount,
    onCancelSelection,
    onBatchRemove,
    productCount,
    onToggleSort,
    onRefresh,
    loading,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    counts,
    viewMode,
    setViewMode,
  }: Props) => {
    return (
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-xl">
        <div className="mb-3 flex h-10 items-center justify-between">
          {selectionMode ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={onCancelSelection}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 transition active:scale-95"
                >
                  لغو
                </button>
                <span className="text-sm font-black text-slate-800">{selectedCount} مورد</span>
              </div>
              <button
                onClick={onBatchRemove}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-rose-500/20 transition active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </button>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-md shadow-cyan-500/25">
                  <Heart className="h-5 w-5 fill-white text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black leading-none tracking-tight text-slate-900">نشان‌ها</h1>
                  {productCount > 0 && (
                    <span className="text-[10px] font-bold text-cyan-600">
                      {productCount.toLocaleString("fa-IR")} کالا ذخیره شده
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleSort}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-cyan-600 active:scale-90"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 disabled:opacity-40 active:scale-90"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-600" : ""}`} />
                </button>
              </div>
            </>
          )}
        </div>

        {!selectionMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="relative mb-3"
          >
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو در نشان‌ها..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-transparent bg-slate-100 py-2.5 pr-10 pl-4 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-400/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(8,145,178,0.12)]"
            />
          </motion.div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {[
              { id: "all", label: "همه", count: counts.all },
              { id: "price_drop", label: "کاهش قیمت", count: counts.price_drop },
              { id: "available", label: "موجود", count: counts.available },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as Filter)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black transition-all active:scale-95 ${
                  filter === t.id
                    ? "bg-gradient-to-l from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/25"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                      filter === t.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "grid" ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "list" ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
    );
  }
);
