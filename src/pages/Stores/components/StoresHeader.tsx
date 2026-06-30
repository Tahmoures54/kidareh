import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, RefreshCw, Search, Loader2, X, SlidersHorizontal } from "lucide-react";
import { FilterKey, SORT_OPTIONS } from "../types";

function FilterChip({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void; }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${active ? "bg-gray-900 text-white shadow-md" : "bg-white border border-gray-200 text-gray-600"}`}>
      {label} {typeof count === "number" && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{count.toLocaleString("fa-IR")}</span>}
    </button>
  );
}

export const StoresHeader = memo(({ 
  isScrolled, refreshing, onRefresh, search, setSearch, isSearching, 
  filter, setFilter, counts, sort, onSortClick 
}: any) => {
  const navigate = useNavigate();
  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label || "مرتب‌سازی";

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl shadow-sm border-b border-gray-200/60" : "bg-transparent border-b border-transparent"} px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3`}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm"><ArrowRight className="w-5 h-5 text-gray-700" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-500" /> فروشگاه‌ها</h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">فروشندگان فعال و معتبر کی‌داره</p>
        </div>
        <button onClick={onRefresh} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm"><RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? "animate-spin" : ""}`} /></button>
      </div>

      <div className="relative group mb-4">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 transition-colors" />
        <input type="text" placeholder="جستجوی فروشگاه، دسته یا شهر..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl pr-12 pl-12 py-3.5 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
          {isSearching ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /> : search ? <button onClick={() => setSearch("")} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"><X className="w-3.5 h-3.5 text-gray-600" /></button> : null}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        <FilterChip active={filter === "all"} label="همه" count={counts.all} onClick={() => setFilter("all")} />
        <FilterChip active={filter === "verified"} label="تأییدشده" count={counts.verified} onClick={() => setFilter("verified")} />
        <FilterChip active={filter === "top"} label="برتر" count={counts.top} onClick={() => setFilter("top")} />
        <FilterChip active={filter === "active"} label="فعال" count={counts.active} onClick={() => setFilter("active")} />
        <button onClick={onSortClick} className="mr-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs font-black text-indigo-700 whitespace-nowrap active:scale-95 transition-transform"><SlidersHorizontal className="w-3.5 h-3.5" /> {activeSortLabel}</button>
      </div>
    </header>
  );
});