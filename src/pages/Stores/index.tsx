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
import { useAppLocation } from "../../hooks/useAppLocation";

import { StoreItem, FilterKey, SortKey } from "./types";
import { StoresHeader } from "./components/StoresHeader";
import { StoreCard } from "./components/StoreCard";
import { StoresSkeleton } from "./components/StoresSkeleton";
import { SortSheet } from "./components/SortSheet";

function isVerified(store: StoreItem): boolean {
  return store.blue_tick_expires_at ? new Date(store.blue_tick_expires_at) > new Date() : false;
}

export default function Stores() {
  const { location: cityLocation } = useAppLocation();
  const [nationwide, setNationwide] = useState(false);
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

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = "فروشگاه‌ها | کی‌داره";
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
      city = "",
    }: { pageNum?: number; query?: string; append?: boolean; city?: string } = {}) => {
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
        if (city.trim()) qs.set("city", city.trim());
        const data = await apiRequest<{
          stores: StoreItem[];
          pagination?: { hasMore?: boolean };
        }>(`/api/stores?${qs.toString()}`, { auth: false });
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
        if (pageNum === 1) setError("نت یه لحظه قطع شد. دوباره امتحان کن.");
        else setMoreError(true);
      } finally {
        setLoading(false);
        setMoreLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    setNationwide(false);
  }, [cityLocation.city]);

  useEffect(() => {
    void fetchStores({
      pageNum: 1,
      query: debouncedSearch,
      append: false,
      city: nationwide ? "" : cityLocation.city,
    });
  }, [debouncedSearch, fetchStores, cityLocation.city, nationwide]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchStores({
      pageNum: 1,
      query: debouncedSearch,
      append: false,
      city: nationwide ? "" : cityLocation.city,
    });
  }, [debouncedSearch, fetchStores, cityLocation.city, nationwide]);

  const handleMore = useCallback(() => {
    if (loading || moreLoading || !hasMore) return;
    void fetchStores({
      pageNum: page + 1,
      query: debouncedSearch,
      append: true,
      city: nationwide ? "" : cityLocation.city,
    });
  }, [loading, moreLoading, hasMore, page, debouncedSearch, fetchStores, cityLocation.city, nationwide]);

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
    <div className="min-h-screen bg-slate-50/50 pb-28 text-slate-900 transition-colors" dir="rtl">
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
        cityName={cityLocation.city}
        nationwide={nationwide}
        onToggleNationwide={() => setNationwide((v) => !v)}
      />

      <main className="mx-auto max-w-2xl px-4 py-6">
        <AnimatePresence>
          {!search && !loading && !error && stores.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="grid grid-cols-3 gap-3 overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                <StoreIcon className="mx-auto mb-2 h-5 w-5 text-cyan-500" />
                <div className="text-lg font-black text-slate-900">{counts.all.toLocaleString("fa-IR")}</div>
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">فروشگاه</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                <BadgeCheck className="mx-auto mb-2 h-5 w-5 text-cyan-500" />
                <div className="text-lg font-black text-slate-900">{counts.verified.toLocaleString("fa-IR")}</div>
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">تأییدشده</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                <Star className="mx-auto mb-2 h-5 w-5 fill-amber-400 text-amber-400" />
                <div className="text-lg font-black text-slate-900">{avgRating}</div>
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">میانگین</div>
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
            className="rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm"
          >
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500 opacity-80" />
            <h3 className="mb-2 text-base font-black text-slate-800">نت وصل نشد</h3>
            <p className="mb-6 text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/25 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" /> دوباره تلاش کن
            </button>
          </motion.div>
        ) : processedStores.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-16 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 rotate-3 items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-xl">
              {search ? (
                <Search className="h-10 w-10 text-slate-300" />
              ) : (
                <Sparkles className="h-10 w-10 text-cyan-300" />
              )}
            </div>
            <h3 className="mb-2 text-lg font-black text-slate-800">
              {search
                ? "فروشگاهی پیدا نشد"
                : nationwide
                  ? "با این فیلتر چیزی نیست"
                  : `هنوز فروشگاهی در ${cityLocation.city} نیست`}
            </h3>
            <p className="mb-8 text-sm text-slate-500">
              {search
                ? "یه اسم دیگه امتحان کن"
                : nationwide
                  ? "فیلتر رو عوض کن یا بعداً سر بزن"
                  : "شهر را از هدر عوض کن یا فروشگاه‌های سراسر کشور را ببین"}
            </p>
            <div className="flex justify-center gap-3">
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-cyan-500/25 active:scale-95"
                >
                  پاک کردن جستجو
                </button>
              )}
              {!nationwide && !search && (
                <button
                  type="button"
                  onClick={() => setNationwide(true)}
                  className="rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-cyan-500/25 active:scale-95"
                >
                  سراسر کشور
                </button>
              )}
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 active:scale-95"
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
            <div ref={sentinelRef} className="mt-4 h-4" />
            <AnimatePresence>
              {moreLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center py-4"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-500" /> داره می‌آد…
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {moreError && (
              <div className="py-4 text-center">
                <button type="button" onClick={handleMore} className="text-sm font-bold text-cyan-600">
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
