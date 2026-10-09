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
import { FeedColumn } from "../../components/feed/FeedColumn";
import { FeedPost } from "../../components/feed/FeedPost";
import { productToFeedPost } from "../../lib/feedMappers";

import { getCategoryDisplayName } from "../../data/processed/categories";
import { useSearch } from "./hooks/useSearch";
import { useAnalytics } from "../../hooks/useAnalytics";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { SearchSkeleton } from "./components/SearchSkeleton";
import { FilterSheet } from "./components/FilterSheet";
import { IdleSection } from "./components/IdleSection";
import { SPRING_TRANSITION, SORT_OPTIONS } from "./components/constants";

export default function Search() {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const resultTrackedRef = React.useRef("");
  const {
    query, setQuery,
    showFilter, setShowFilter,
    viewMode, setViewMode,
    toastMsg,
    recents,
    filters, setFilters,
    inputRef, showingResults, activeFilterCount,
    isLoading, isFetchingNextPage, hasNextPage, fetchNextPage,
    error, refetch,
    sortedProducts, userLoc,
    commitSearch, clearSearch, clearRecents, removeRecent,
    expandSearchScope, cycleScope, resetFilters,
    searchPlaceholder, scopeLabel,
  } = useSearch();

  const { pullDistance, refreshing, handlers: pullHandlers } = usePullToRefresh({ onRefresh: refetch });

  const handleExpandSearch = () => {
    trackEvent("search_scope_expand_click", {
      category: "discovery",
      label: filters.scope.type,
      search_term: query.trim() || filters.category,
    });
    expandSearchScope();
  };

  const handleClearSearchFilters = () => {
    trackEvent("search_zero_result_reset", {
      category: "discovery",
      label: filters.scope.type,
      search_term: query.trim() || filters.category,
    });
    resetFilters();
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const trackSearch = (term: string, source: string) => {
    const normalized = term.trim();
    if (!normalized && !filters.category) return;
    trackEvent("search_started", {
      category: "discovery",
      label: source,
      search_term: normalized || filters.category,
      scope: filters.scope.type,
    });
  };

  React.useEffect(() => {
    if (!showingResults || isLoading || error || sortedProducts.length === 0) return;
    const key = `${query.trim()}|${filters.category}|${filters.scope.type}|${filters.scope.id || ""}`;
    if (resultTrackedRef.current === key) return;
    resultTrackedRef.current = key;
    trackEvent("search_result_view", {
      category: "discovery",
      label: filters.category || query.trim(),
      value: sortedProducts.length,
      scope: filters.scope.type,
    });
  }, [showingResults, isLoading, error, sortedProducts.length, query, filters.category, filters.scope.type, filters.scope.id, trackEvent]);

  const ScopeIcon = useMemo(() => {
    if (filters.scope.type === "city") return Building;
    if (filters.scope.type === "province") return MapIcon;
    return Globe;
  }, [filters.scope.type]);

  return (
    <div className="min-h-[100dvh] bg-slate-50/50 font-sans" dir="rtl" {...pullHandlers}>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center transition-opacity" style={{ transform: `translateY(${Math.max(0, Math.min(pullDistance, 54))}px)`, opacity: pullDistance > 0 || refreshing ? 1 : 0 }}>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/95 px-4 py-2 text-xs font-black text-teal-700 shadow-lg backdrop-blur">
          <Loader2 className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "در حال تازه‌سازی" : pullDistance >= 76 ? "رها کن تا تازه شود" : "برای تازه‌سازی پایین بکش"}
        </div>
      </div>
      <AnimatePresence>
        {toastMsg && <Toast msg={toastMsg} />}
      </AnimatePresence>

      <FilterSheet
        open={showFilter}
        filters={filters}
        onChange={(f) => setFilters((p) => ({ ...p, ...f }))}
        onClose={() => setShowFilter(false)}
        onReset={resetFilters}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.9 }}
            aria-label="بازگشت"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition active:scale-90"
          >
            <ArrowRight className="h-5 w-5 text-slate-700" />
          </motion.button>

          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              trackSearch(query, "submit");
              commitSearch(query);
            }}
          >
            <div className="relative flex items-center rounded-xl border border-transparent bg-slate-100 px-3 py-2.5 transition-all focus-within:border-cyan-400/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-500/20">
              <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="flex-1 bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="پاک کردن"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 transition active:scale-90"
                >
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="h-7 shrink-0 rounded-lg bg-gradient-to-l from-cyan-600 to-teal-500 px-3 text-[11px] font-black text-white shadow-md shadow-cyan-500/25 transition active:scale-95"
                >
                  جستجو
                </button>
              )}
            </div>
          </form>

          <motion.button
            onClick={cycleScope}
            whileTap={{ scale: 0.9 }}
            aria-label={`محدوده: ${scopeLabel}`}
            title={scopeLabel}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-100 bg-cyan-50 px-3 text-xs font-bold text-cyan-700 transition active:scale-95"
          >
            <ScopeIcon className="h-4 w-4" />
            <span className="hidden max-w-[80px] truncate sm:inline">{scopeLabel}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilter(true)}
            aria-label="فیلترها"
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
              activeFilterCount > 0
                ? "bg-gradient-to-l from-cyan-600 to-teal-500 text-white shadow-lg shadow-cyan-500/30"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-cyan-500 bg-white text-[10px] font-black text-cyan-600 shadow">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {showingResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex justify-between gap-3 overflow-hidden"
            >
              <div className="no-scrollbar flex shrink items-center gap-2 overflow-x-auto">
                <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700">
                  <MapPin className="h-3.5 w-3.5" />
                  {scopeLabel}
                </div>

                {SORT_OPTIONS.map((sort) => (
                  <button
                    key={sort.key}
                    onClick={() => setFilters((p) => ({ ...p, sortBy: sort.key }))}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                      filters.sortBy === sort.key
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>

              <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1">
                {(["list", "map"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-label={mode === "list" ? "نمای لیست" : "نمای نقشه"}
                    className={`relative flex items-center justify-center rounded-lg px-3 py-1.5 transition-colors ${
                      viewMode === mode ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {viewMode === mode && (
                      <motion.div
                        layoutId="viewToggle"
                        transition={SPRING_TRANSITION}
                        className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm"
                      />
                    )}
                    {mode === "list" ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="px-4 py-4 pb-28">
        {!showingResults && (
          <IdleSection
            recents={recents}
            onRecentClick={(term) => {
              trackSearch(term, "recent");
              commitSearch(term);
            }}
            onClearRecents={clearRecents}
            onSuggestionClick={(term) => {
              trackSearch(term, "suggestion");
              commitSearch(term);
            }}
            onCategoryClick={(category) => {
              trackSearch(category, "category");
              setFilters((prev) => ({ ...prev, category }));
            }}
            onRemoveRecent={removeRecent}
          />
        )}

        {filters.category && showingResults && (
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700">
              {getCategoryDisplayName(filters.category)}
            </span>
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, category: "" }))}
              className="text-xs font-bold text-slate-500"
            >
              حذف دسته
            </button>
          </div>
        )}

        {showingResults && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-rose-700">
              <AlertCircle className="h-4 w-4" />
              خطا در دریافت اطلاعات
            </div>
            <button
              onClick={() => refetch()}
              className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700 transition active:scale-95"
            >
              تلاش مجدد
            </button>
          </motion.div>
        )}

        {showingResults && isLoading && sortedProducts.length === 0 && <SearchSkeleton />}

        {showingResults && !isLoading && !error && sortedProducts.length === 0 && (
          <div className="flex flex-col items-center pt-10 text-center">
            <EmptyState
              title="نتیجه‌ای پیدا نشد"
              description={`کالایی برای «${query || getCategoryDisplayName(filters.category)}» در ${scopeLabel} یافت نشد.`}
            />
            <div className="mt-6 flex flex-col items-center gap-2">
              {filters.scope.type !== "country" && (
                <motion.button
                  onClick={handleExpandSearch}
                  whileTap={{ scale: 0.95 }}
                  className="flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-500 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/25 transition active:scale-95"
                >
                  <Expand className="h-4 w-4" />
                  جستجو در {filters.scope.type === "city" ? "کل استان" : "سراسر کشور"}
                </motion.button>
              )}
              {(query.trim() || filters.category || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={handleClearSearchFilters}
                  className="min-h-11 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700 active:scale-95"
                >
                  حذف فیلترها و شروع دوباره
                </button>
              )}
            </div>
          </div>
        )}

        {showingResults && !error && sortedProducts.length > 0 && viewMode === "list" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-500">
                <span className="font-black text-slate-900">
                  {sortedProducts.length.toLocaleString("fa-IR")}
                  {hasNextPage ? "+" : ""}
                </span>{" "}
                نتیجه
              </p>
            </div>

            <FeedColumn className="-mx-4">
              <Virtuoso
                data={sortedProducts}
                useWindowScroll
                overscan={800}
                endReached={() => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                itemContent={(_index, product) => <FeedPost post={productToFeedPost(product)} />}
                components={{
                  Footer: () =>
                    isFetchingNextPage ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                      </div>
                    ) : !hasNextPage && sortedProducts.length > 0 ? (
                      <div className="flex items-center justify-center gap-3 py-10">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                        <p className="text-xs font-medium text-slate-400">همه نتایج نمایش داده شد</p>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                      </div>
                    ) : null,
                }}
              />
            </FeedColumn>
          </>
        )}

        {showingResults && !error && sortedProducts.length > 0 && viewMode === "map" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-0 h-[75vh] overflow-hidden rounded-3xl border border-slate-200 shadow-lg"
          >
            <Map center={userLoc} results={sortedProducts} />
          </motion.div>
        )}
      </main>
    </div>
  );
}
