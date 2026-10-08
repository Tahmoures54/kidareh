import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, RefreshCw, Search, Loader2, X, SlidersHorizontal } from "lucide-react";
import { FilterKey, SORT_OPTIONS } from "../types";

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-black transition-all active:scale-95 ${
        active
          ? "bg-gradient-to-l from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/25"
          : "border border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count.toLocaleString("fa-IR")}
        </span>
      )}
    </button>
  );
}

export const StoresHeader = memo(
  ({
    isScrolled,
    refreshing,
    onRefresh,
    search,
    setSearch,
    isSearching,
    filter,
    setFilter,
    counts,
    sort,
    onSortClick,
    cityName,
    nationwide,
    onToggleNationwide,
  }: any) => {
    const navigate = useNavigate();
    const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label || "مرتب‌سازی";

    return (
      <header
        className={`sticky top-0 z-40 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] transition-all duration-300 ${
          isScrolled
            ? "border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl"
            : "border-b border-transparent bg-slate-50/80"
        }`}
      >
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition active:scale-90"
          >
            <ArrowRight className="h-5 w-5 text-slate-700" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/25">
                <Sparkles className="h-4 w-4" />
              </span>
              فروشگاه‌ها
            </h1>
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">
              {nationwide ? "سراسر ایران" : `فروشگاه‌های ${cityName || "شهر شما"}`}
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition active:scale-90"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? "animate-spin text-cyan-600" : ""}`} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی فروشگاه، دسته یا شهر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pr-12 pl-12 text-sm font-bold text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/15"
          />
          <div className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
            ) : search ? (
              <button
                onClick={() => setSearch("")}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition active:scale-90"
              >
                <X className="h-3.5 w-3.5 text-slate-600" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          <FilterChip active={filter === "all"} label="همه" count={counts.all} onClick={() => setFilter("all")} />
          <FilterChip
            active={filter === "verified"}
            label="تأییدشده"
            count={counts.verified}
            onClick={() => setFilter("verified")}
          />
          <FilterChip active={filter === "top"} label="برتر" count={counts.top} onClick={() => setFilter("top")} />
          <FilterChip
            active={filter === "active"}
            label="فعال"
            count={counts.active}
            onClick={() => setFilter("active")}
          />
          <button
            onClick={onToggleNationwide}
            className={`mr-auto flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black transition active:scale-95 ${
              nationwide
                ? "bg-gradient-to-l from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/25"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {nationwide ? "سراسر کشور" : cityName || "این شهر"}
          </button>
          <button
            onClick={onSortClick}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-800 transition active:scale-95"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> {activeSortLabel}
          </button>
        </div>
      </header>
    );
  }
);
