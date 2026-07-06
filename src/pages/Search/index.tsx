import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso } from "react-virtuoso";
import {
  Search as SearchIcon,
  ArrowRight,
  SlidersHorizontal,
  Map as MapIcon,
  List,
  X,
  Loader2,
  AlertCircle,
  MapPin,
  Expand,
  Globe,
  Building,
} from "lucide-react";

import Map from "../../components/Map";
import EmptyState from "../../components/ui/EmptyState";
import { Toast } from "../../components/ui/Toast";
import { ProductCard } from "../../components/cards/ProductCard";

import { useSearch, getInitialScope } from "./hooks/useSearch";
import { SearchSkeleton } from "./components/SearchSkeleton";
import { FilterSheet } from "./components/FilterSheet";
import { IdleSection } from "./components/IdleSection";
import { SPRING_TRANSITION, SORT_OPTIONS } from "./components/constants";
import { SortType } from "./types";

export default function Search() {
  const navigate = useNavigate();
  const {
    query, setQuery,
    showFilter, setShowFilter,
    viewMode, setViewMode,
    toastMsg,
    recents,
    filters, setFilters,
    inputRef, hasQuery, activeFilterCount,
    isLoading, isFetchingNextPage, hasNextPage, fetchNextPage,
    error, refetch,
    sortedProducts, userLoc,
    commitSearch, clearSearch, clearRecents, removeRecent,
    expandSearchScope, cycleScope, resetFilters,
    handleShare, handleNavigate,
    searchPlaceholder, scopeLabel,
  } = useSearch();

  const ScopeIcon = useMemo(() => {
    if (filters.scope.type === "city") return Building;
    if (filters.scope.type === "province") return MapIcon;
    return Globe;
  }, [filters.scope.type]);

  return (
    <div 
      className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 font-sans" 
      dir="rtl"
    >
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && <Toast msg={toastMsg} />}
      </AnimatePresence>

      {/* Filter Sheet */}
      <FilterSheet
        open={showFilter}
        filters={filters}
        onChange={(f) => setFilters((p) => ({ ...p, ...f }))}
        onClose={() => setShowFilter(false)}
        onReset={resetFilters}
      />

      {/* ─────────────── Header ─────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/50 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        
        {/* Row 1: Back + Search + Scope + Filter */}
        <div className="flex items-center gap-2">
          
          {/* Back Button */}
          <motion.button
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.9 }}
            aria-label="بازگشت"
            className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex justify-center items-center shrink-0 active:scale-90 transition-transform"
          >
            <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </motion.button>

          {/* Search Input */}
          <form
            className="flex-1 relative"
            onSubmit={(e) => { e.preventDefault(); commitSearch(query); }}
          >
            <div className="relative bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center px-3 py-2.5 focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:ring-2 focus-within:ring-rose-500/30 focus-within:border focus-within:border-rose-500/50 transition-all border border-transparent">
              <SearchIcon className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="flex-1 bg-transparent outline-none px-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="پاک کردن"
                  className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex justify-center items-center shrink-0 active:scale-90 transition-transform"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="h-7 px-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black shrink-0 shadow-md shadow-rose-500/30 active:scale-95 transition-all"
                >
                  جستجو
                </button>
              )}
            </div>
          </form>

          {/* Scope Cycle Button */}
          <motion.button
            onClick={cycleScope}
            whileTap={{ scale: 0.9 }}
            aria-label={`محدوده: ${scopeLabel}`}
            title={scopeLabel}
            className="h-11 px-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center gap-1.5 shrink-0 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-transform"
          >
            <ScopeIcon className="w-4 h-4" />
            <span className="hidden sm:inline max-w-[80px] truncate">{scopeLabel}</span>
          </motion.button>

          {/* Filter Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilter(true)}
            aria-label="فیلترها"
            className={`relative w-11 h-11 rounded-xl flex justify-center items-center shrink-0 transition-all ${
              activeFilterCount > 0
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 rounded-full bg-white text-rose-500 text-[10px] font-black flex justify-center items-center border-2 border-rose-500 shadow">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Row 2: Sort Chips + View Toggle (فقط وقتی query دارد) */}
        <AnimatePresence>
          {hasQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-between gap-3 mt-3 overflow-hidden"
            >
              {/* Sort + Scope Chips */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar items-center shrink">
                {/* Scope Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-full text-rose-600 dark:text-rose-400 text-xs font-bold whitespace-nowrap shrink-0 border border-rose-100 dark:border-rose-500/20">
                  <MapPin className="w-3.5 h-3.5" />
                  {scopeLabel}
                </div>

                {/* Sort Options */}
                {SORT_OPTIONS.map((sort) => (
                  <button
                    key={sort.key}
                    onClick={() => setFilters((p) => ({ ...p, sortBy: sort.key }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
                      filters.sortBy === sort.key
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>

              {/* View Toggle: List / Map */}
              <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex shrink-0 gap-1">
                {(["list", "map"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-label={mode === "list" ? "نمای لیست" : "نمای نقشه"}
                    className={`relative px-3 py-1.5 rounded-lg flex justify-center items-center transition-colors ${
                      viewMode === mode
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    }`}
                  >
                    {viewMode === mode && (
                      <motion.div
                        layoutId="viewToggle"
                        transition={SPRING_TRANSITION}
                        className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-sm -z-10"
                      />
                    )}
                    {mode === "list" 
                      ? <List className="w-4 h-4" /> 
                      : <MapIcon className="w-4 h-4" />
                    }
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─────────────── Main Content ─────────────── */}
      <main className="px-4 py-4 pb-28">

        {/* Idle State */}
        {!hasQuery && (
          <IdleSection
            recents={recents}
            onRecentClick={commitSearch}
            onClearRecents={clearRecents}
            onSuggestionClick={commitSearch}
            onRemoveRecent={removeRecent}
          />
        )}

        {/* Error */}
        {hasQuery && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 flex justify-between items-center gap-3"
          >
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-sm font-bold">
              <AlertCircle className="w-4 h-4" />
              خطا در دریافت اطلاعات
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              تلاش مجدد
            </button>
          </motion.div>
        )}

        {/* Loading Skeleton */}
        {hasQuery && isLoading && sortedProducts.length === 0 && (
          <SearchSkeleton />
        )}

        {/* Empty Result */}
        {hasQuery && !isLoading && !error && sortedProducts.length === 0 && (
          <div className="pt-10 flex flex-col items-center text-center">
            <EmptyState
              title="نتیجه‌ای پیدا نشد"
              description={`کالایی برای «${query}» در ${scopeLabel} یافت نشد.`}
            />
            {filters.scope.type !== "country" && (
              <motion.button
                onClick={expandSearchScope}
                whileTap={{ scale: 0.95 }}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/30 transition-colors active:scale-95"
              >
                <Expand className="w-4 h-4" />
                جستجو در {filters.scope.type === "city" ? "کل استان" : "سراسر کشور"}
              </motion.button>
            )}
          </div>
        )}

        {/* List View */}
        {hasQuery && !error && sortedProducts.length > 0 && viewMode === "list" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                <span className="text-gray-900 dark:text-white font-black">
                  {sortedProducts.length.toLocaleString("fa-IR")}
                </span>
                {" "}نتیجه
              </p>
            </div>

            <Virtuoso
              data={sortedProducts}
              useWindowScroll
              overscan={600}
              endReached={() => {
                if (hasNextPage && !isFetchingNextPage) fetchNextPage();
              }}
              itemContent={(index, product) => (
                <div className="mb-3">
                  <ProductCard
                    product={product}
                    index={index}
                    onShare={handleShare}
                    onNavigate={handleNavigate}
                  />
                </div>
              )}
              components={{
                Footer: () =>
                  isFetchingNextPage ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                    </div>
                  ) : !hasNextPage && sortedProducts.length > 0 ? (
                    <div className="py-10 flex items-center justify-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700" />
                      <p className="text-xs text-gray-400 font-medium">
                        همه نتایج نمایش داده شد
                      </p>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700" />
                    </div>
                  ) : null,
              }}
            />
          </>
        )}

        {/* Map View */}
        {hasQuery && !error && sortedProducts.length > 0 && viewMode === "map" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[75vh] overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg relative z-0"
          >
            <Map center={userLoc} results={sortedProducts} />
          </motion.div>
        )}
      </main>
    </div>
  );
}
