import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store as StoreIcon,
  Search,
  Star,
  BadgeCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "../../utils/api";

import { StoreItem, FilterKey, SortKey } from "./types";
import { StoresHeader } from "./components/StoresHeader";
import { StoreCard } from "./components/StoreCard";
import { StoresSkeleton } from "./components/StoresSkeleton";
import { SortSheet } from "./components/SortSheet";

function isVerified(store: StoreItem): boolean {
  return store.blue_tick_expires_at ? new Date(store.blue_tick_expires_at) > new Date() : false;
}

export default function Stores() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moreError, setMoreError] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const mounted = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mounted.current = true;
    document.title = "فروشگاه‌ها | کی‌داره";
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => {
      mounted.current = false;
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchStores = useCallback(
    async ({
      pageNum = 1,
      query = "",
      append = false,
    }: { pageNum?: number; query?: string; append?: boolean } = {}) => {
      if (pageNum === 1) {
        setLoading(true);
        setError("");
      } else {
        setMoreLoading(true);
        setMoreError(false);
      }
      try {
        const qs = new URLSearchParams({ limit: "20", page: String(pageNum) });
        if (query.trim()) qs.set("q", query.trim());
        const data = await apiRequest<{
          stores: StoreItem[];
          pagination?: { hasMore?: boolean };
        }>(`/api/stores?${qs.toString()}`, { auth: false });
        if (!mounted.current) return;

        const incoming = Array.isArray(data?.stores) ? data.stores : [];
        setStores((prev) => {
          const merged = pageNum === 1 || !append ? incoming : [...prev, ...incoming];
          const map = new Map<number, StoreItem>();
          merged.forEach((item) => map.set(item.id, item));
          return Array.from(map.values());
        });
        setHasMore(Boolean(data?.pagination?.hasMore));
        setPage(pageNum);
      } catch {
        if (!mounted.current) return;
        if (pageNum === 1) setError("نت یه لحظه قطع شد. دوباره امتحان کن.");
        else setMoreError(true);
      } finally {
        if (!mounted.current) return;
        setLoading(false);
        setMoreLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchStores({ pageNum: 1, query: debouncedSearch, append: false });
  }, [debouncedSearch, fetchStores]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchStores({ pageNum: 1, query: debouncedSearch, append: false });
  }, [debouncedSearch, fetchStores]);

  const handleMore = useCallback(() => {
    if (loading || moreLoading || !hasMore) return;
    void fetchStores({ pageNum: page + 1, query: debouncedSearch, append: true });
  }, [loading, moreLoading, hasMore, page, debouncedSearch, fetchStores]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !moreLoading) handleMore();
      },
      { rootMargin: "280px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [handleMore, hasMore, loading, moreLoading]);

  const counts = useMemo(
    () => ({
      all: stores.length,
      verified: stores.filter(isVerified).length,
      top: stores.filter((s) => Number(s.avg_rating ?? 0) >= 4.5).length,
      active: stores.filter((s) => Number(s.product_count ?? 0) > 0).length,
    }),
    [stores]
  );

  const avgRating = useMemo(() => {
    const rated = stores.filter((s) => s.avg_rating != null && Number.isFinite(Number(s.avg_rating)));
    if (!rated.length) return "—";
    return (rated.reduce((sum, s) => sum + Number(s.avg_rating || 0), 0) / rated.length).toFixed(1);
  }, [stores]);

  const processedStores = useMemo(() => {
    let list = [...stores];
    if (filter === "verified") list = list.filter(isVerified);
    else if (filter === "top") list = list.filter((s) => Number(s.avg_rating ?? 0) >= 4.5);
    else if (filter === "active") list = list.filter((s) => Number(s.product_count ?? 0) > 0);

    switch (sort) {
      case "rating":
        list.sort((a, b) => Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0));
        break;
      case "products":
        list.sort((a, b) => Number(b.product_count ?? 0) - Number(a.product_count ?? 0));
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
        break;
      default:
        list.sort((a, b) => {
          const verifiedDiff = Number(isVerified(b)) - Number(isVerified(a));
          if (verifiedDiff !== 0) return verifiedDiff;
          return (
            Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0) ||
            Number(b.product_count ?? 0) - Number(a.product_count ?? 0)
          );
        });
    }
    return list;
  }, [stores, filter, sort]);

  return (
    <div
      className="min-h-screen bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-white pb-28 transition-colors"
      dir="rtl"
    >
      <SortSheet open={sortOpen} value={sort} onClose={() => setSortOpen(false)} onChange={setSort} />

      <StoresHeader
        isScrolled={isScrolled}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        search={search}
        setSearch={setSearch}
        isSearching={search.trim() !== debouncedSearch}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
        sort={sort}
        onSortClick={() => setSortOpen(true)}
      />

      <main className="px-4 py-6 max-w-2xl mx-auto">
        <AnimatePresence>
          {!search && !loading && !error && stores.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="grid grid-cols-3 gap-3 overflow-hidden"
            >
              <div className="rounded-[1.25rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
                <StoreIcon className="w-5 h-5 text-teal-500 mx-auto mb-2" />
                <div className="text-lg font-black">{counts.all.toLocaleString("fa-IR")}</div>
                <div className="text-[10px] font-bold text-gray-500 mt-0.5">فروشگاه</div>
              </div>
              <div className="rounded-[1.25rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
                <BadgeCheck className="w-5 h-5 text-sky-500 mx-auto mb-2" />
                <div className="text-lg font-black">{counts.verified.toLocaleString("fa-IR")}</div>
                <div className="text-[10px] font-bold text-gray-500 mt-0.5">تأییدشده</div>
              </div>
              <div className="rounded-[1.25rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400 mx-auto mb-2" />
                <div className="text-lg font-black">{avgRating}</div>
                <div className="text-[10px] font-bold text-gray-500 mt-0.5">میانگین</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <StoresSkeleton />
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-[2rem] border border-rose-100 dark:border-rose-500/20 p-8 text-center shadow-sm"
          >
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 opacity-80" />
            <h3 className="text-base font-black mb-2">نت وصل نشد</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-2xl font-black text-sm active:scale-95 shadow-lg shadow-teal-500/20"
            >
              <RefreshCw className="w-4 h-4" /> دوباره تلاش کن
            </button>
          </motion.div>
        ) : processedStores.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 px-4">
            <div className="w-24 h-24 mx-auto mb-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
              {search ? (
                <Search className="w-10 h-10 text-gray-300" />
              ) : (
                <Sparkles className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <h3 className="text-lg font-black mb-2">
              {search ? "فروشگاهی پیدا نشد" : "با این فیلتر چیزی نیست"}
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              {search ? "یه اسم دیگه امتحان کن" : "فیلتر رو عوض کن یا بعداً سر بزن"}
            </p>
            <div className="flex justify-center gap-3">
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="bg-teal-600 text-white px-6 py-3 rounded-2xl text-sm font-black active:scale-95 shadow-md"
                >
                  پاک کردن جستجو
                </button>
              )}
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-2xl text-sm font-black active:scale-95"
                >
                  همه فروشگاه‌ها
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div layout className="space-y-3">
              <AnimatePresence mode="popLayout">
                {processedStores.map((store, i) => (
                  <StoreCard key={store.id} store={store} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>
            <div ref={sentinelRef} className="h-4 mt-4" />
            <AnimatePresence>
              {moreLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center py-4"
                >
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-bold text-gray-600 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-500" /> داره می‌آد…
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {moreError && (
              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={handleMore}
                  className="text-sm font-bold text-teal-600"
                >
                  بارگذاری بیشتر نشد — دوباره بزن
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
