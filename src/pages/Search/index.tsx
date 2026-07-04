import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
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
import { SPRING_TRANSITION } from "./components/constants";
import { SortType } from "./types";

export default function Search() {
  const navigate = useNavigate();
  const {
    query, setQuery, showFilter, setShowFilter, viewMode, setViewMode, toastMsg,
    recents, filters, setFilters, inputRef, hasQuery, activeFilterCount,
    isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch,
    sortedProducts, userLoc, commitSearch, clearSearch, clearRecents,
    expandSearchScope, cycleScope, handleShare, handleNavigate, searchPlaceholder,
  } = useSearch();

  const scopeLabel = useMemo(() => {
    if (filters.scope.type === "city") return `شهر ${filters.scope.name}`;
    if (filters.scope.type === "province") return "کل استان";
    return "سراسری";
  }, [filters.scope]);

  const ScopeIcon = useMemo(() => {
    if (filters.scope.type === "city") return Building;
    if (filters.scope.type === "province") return MapIcon;
    return Globe;
  }, [filters.scope]);

  const sortOptions: { key: SortType; label: string }[] = useMemo(
    () => [
      { key: "newest", label: "جدیدترین" },
      { key: "nearest", label: "نزدیک‌ترین" },
      { key: "cheapest", label: "ارزان‌ترین" },
    ],
    []
  );

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F19] font-sans" dir="rtl">
      <AnimatePresence>
        {toastMsg && <Toast msg={toastMsg} />}
      </AnimatePresence>

      <FilterSheet
        open={showFilter}
        filters={filters}
        onChange={(f: Parameters<typeof setFilters>[0]) => setFilters((p) => ({ ...p, ...f }))}
        onClose={() => setShowFilter(false)}
        onReset={() =>
          setFilters((prev) => ({
            ...prev,
            scope: getInitialScope(),
            minPrice: "",
            maxPrice: "",
            selectedRadius: "all",
            onlyAvailable: false,
            sortBy: "newest",
          }))
        }
      />

      <header className="sticky top-0 z-[60] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.9 }}
            aria-label="بازگشت"
            className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex justify-center items-center shrink-0"
          >
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <form
            className="flex-1 relative group"
            onSubmit={(e) => { e.preventDefault(); commitSearch(query); }}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[22px] blur opacity-0 group-focus-within:opacity-30 transition duration-300" />
            <div className="relative bg-slate-100 dark:bg-slate-800 rounded-[20px] flex items-center pl-2 pr-4 py-3 group-focus-within:bg-white dark:group-focus-within:bg-slate-900 border border-transparent group-focus-within:border-indigo-500/50 transition-all">
              <SearchIcon className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent outline-none px-3 text-[15px] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="پاک کردن جستجو"
                  className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex justify-center items-center shrink-0 active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="h-7 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black shrink-0 shadow-md shadow-indigo-500/20 active:scale-95 transition-transform"
                >
                  جستجو
                </button>
              )}
            </div>
          </form>

          <motion.button
            onClick={cycleScope}
            whileTap={{ scale: 0.9 }}
            aria-label="تغییر محدوده جستجو"
            className="h-12 px-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex justify-center items-center shrink-0 gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-100 dark:border-indigo-500/20"
          >
            <ScopeIcon className="w-4 h-4" />
            <span className="hidden md:inline">{scopeLabel}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilter(true)}
            aria-label="فیلترها"
            className={`relative w-12 h-12 rounded-2xl flex justify-center items-center shrink-0 transition-colors ${
              showFilter ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[22px] h-[22px] rounded-full bg-rose-500 text-white text-[10px] font-black flex justify-center items-center border-[2.5px] border-white dark:border-slate-900">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {hasQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-between gap-3 mt-4 overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto hide-scrollbar shrink items-center">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-bold whitespace-nowrap">
                  <MapPin className="w-3.5 h-3.5" />
                  {scopeLabel}
                </div>
                
                {sortOptions.map((sort) => (
                  <button
                    key={sort.key}
                    onClick={() => setFilters((p) => ({ ...p, sortBy: sort.key }))}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors active:scale-95 ${
                      filters.sortBy === sort.key
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>

              <div className="bg-slate-200/50 dark:bg-slate-800 p-1 rounded-2xl flex shrink-0 relative">
                {(["list", "map"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-label={mode === "list" ? "نمای لیست" : "نمای نقشه"}
                    className={`relative z-10 px-4 py-1.5 rounded-[12px] flex justify-center items-center transition-colors ${
                      viewMode === mode ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"
                    }`}
                  >
                    {viewMode === mode && (
                      <motion.div
                        layoutId="viewToggle"
                        transition={SPRING_TRANSITION}
                        className="absolute inset-0 bg-white dark:bg-slate-700 rounded-[12px] shadow-sm -z-10"
                      />
                    )}
                    {mode === "list" ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="px-4 py-5 pb-24">
        {!hasQuery && (
          <IdleSection
            recents={recents}
            onRecentClick={commitSearch}
            onClearRecents={clearRecents}
            onSuggestionClick={commitSearch}
          />
        )}

        {hasQuery && error && (
          <div className="mb-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-[24px] p-4 flex justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-sm font-bold">
              <AlertCircle className="w-4 h-4" /> خطا در دریافت اطلاعات
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {hasQuery && isLoading && sortedProducts.length === 0 && <SearchSkeleton />}

        {hasQuery && !isLoading && !error && sortedProducts.length === 0 && (
          <div className="pt-12 flex flex-col items-center text-center">
            <EmptyState
              title="نتیجه‌ای پیدا نشد"
              description={`متأسفانه کالایی برای «${query}» در ${scopeLabel} یافت نشد.`}
            />
            {filters.scope.type !== "country" && (
              <motion.button
                onClick={expandSearchScope}
                whileTap={{ scale: 0.95 }}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30"
              >
                <Expand className="w-4 h-4" />
                جستجو در {filters.scope.type === "city" ? "کل استان" : "سراسر کشور"}
              </motion.button>
            )}
          </div>
        )}

        {hasQuery && !error && sortedProducts.length > 0 && viewMode === "list" && (
          <>
            <p className="text-xs font-bold text-slate-400 mb-4 px-1">
              {sortedProducts.length.toLocaleString("fa-IR")} نتیجه یافت شد
            </p>
            <Virtuoso
              data={sortedProducts}
              useWindowScroll
              overscan={700}
              endReached={() => {
                if (hasNextPage && !isFetchingNextPage) fetchNextPage();
              }}
              itemContent={(index, product) => (
                <ProductCard
                  product={product}
                  index={index}
                  onShare={handleShare}
                  onNavigate={handleNavigate}
                />
              )}
              components={{
                Footer: () =>
                  isFetchingNextPage ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                  ) : null,
              }}
            />
          </>
        )}

        {hasQuery && !error && sortedProducts.length > 0 && viewMode === "map" && (
          <div className="h-[75vh] overflow-hidden rounded-[28px] border shadow-sm relative z-0">
            <Map center={userLoc} results={sortedProducts} />
          </div>
        )}
      </main>
    </div>
  );
}