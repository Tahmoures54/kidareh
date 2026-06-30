import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Virtuoso } from "react-virtuoso";
import { Search as SearchIcon, ArrowRight, SlidersHorizontal, Map as MapIcon, List, X, Loader2, AlertCircle, MapPin, Expand } from "lucide-react";

import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import Map from "../../components/Map";
import EmptyState from "../../components/ui/EmptyState";

import { SearchFilters, ViewMode, SortType, ProductResult, LocationScope } from "./types";
import { toNumber, formatDistance, calculateDistanceMeters, getActiveFilterCount } from "./utils";
import { Toast, SearchSkeleton, ProductCard, FilterSheet, IdleSection, SPRING_TRANSITION, FALLBACK } from "./components";

const DEBOUNCE = 320;

// این مقادیر باید بر اساس انتخاب کاربر در صفحه اصلی تنظیم شوند (از Context یا Redux یا URL می‌آیند)
const INITIAL_SCOPE: LocationScope = { type: "city", id: "ahvaz", name: "اهواز" }; 

const DEFAULT_FILTERS: SearchFilters = { 
  minPrice: "", 
  maxPrice: "", 
  selectedRadius: "all", 
  onlyAvailable: false, 
  sortBy: "newest",
  scope: INITIAL_SCOPE
};

export default function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get("q") || "";

  // State
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [toastMsg, setToastMsg] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [userLoc, setUserLoc] = useState({ lat: 35.6892, lng: 51.389 });
  const [filters, setFilters] = useState<SearchFilters>(() => {
    // در پروژه واقعی این مقادیر از URL Params یا Auth Context خوانده می‌شوند
    const scopeType = (params.get('scope') as LocationScope['type']) || INITIAL_SCOPE.type;
    const scopeId = params.get('scopeId') || INITIAL_SCOPE.id;
    const scopeName = params.get('scopeName') || INITIAL_SCOPE.name;
    return { ...DEFAULT_FILTERS, scope: { type: scopeType, id: scopeId, name: scopeName } };
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const hasQuery = !!debouncedQuery.trim();
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2200);
  }, []);

  useEffect(() => { return () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); }; }, []);

  // Sync Params
  useEffect(() => {
    const qFromUrl = params.get("q") || "";
    setQuery(prev => (prev === qFromUrl ? prev : qFromUrl));
    setDebouncedQuery(prev => (prev === qFromUrl ? prev : qFromUrl));
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query.trim()); }, DEBOUNCE);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const current = params.get("q") || "";
    if (debouncedQuery === current && params.get("scope") === filters.scope.type) return;
    const next = new URLSearchParams(params);
    if (debouncedQuery) next.set("q", debouncedQuery); else next.delete("q");
    // ذخیره اسکوپ در URL برای بازگشت و اشتراک گذاری
    next.set("scope", filters.scope.type);
    if(filters.scope.id) next.set("scopeId", filters.scope.id);
    if(filters.scope.name) next.set("scopeName", filters.scope.name);
    setParams(next);
  }, [debouncedQuery, filters.scope, params, setParams]);

  // Init Data
  useEffect(() => {
    try { const saved = localStorage.getItem("recentSearches"); if (saved) setRecents(JSON.parse(saved).slice(0, 10)); } catch {}
    navigator.geolocation?.getCurrentPosition((pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {});
  }, []);

  // Handlers
  const saveRecent = useCallback((q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recents.filter((s) => s !== q)].slice(0, 10);
    setRecents(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  }, [recents]);

  const commitSearch = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setQuery(normalized); setDebouncedQuery(normalized); saveRecent(normalized); setViewMode("list");
  }, [saveRecent]);

  const clearSearch = useCallback(() => { setQuery(""); setDebouncedQuery(""); inputRef.current?.focus(); }, []);
  const clearRecents = useCallback(() => { setRecents([]); localStorage.removeItem("recentSearches"); }, []);

  const expandSearchScope = useCallback(() => {
    setFilters(prev => {
      let newScope: LocationScope;
      if (prev.scope.type === 'city') newScope = { type: 'province', id: undefined, name: 'کل استان' };
      else if (prev.scope.type === 'province') newScope = { type: 'country', id: undefined, name: 'سراسری' };
      else return prev;
      return { ...prev, scope: newScope };
    });
  }, []);

  // Fetch Data - ارسال اسکوپ به بک‌اند
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useInfiniteProducts({
    q: debouncedQuery || undefined, 
    limit: 20, 
    sort: filters.sortBy, 
    onlyAvailable: filters.onlyAvailable,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined, 
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    lat: userLoc.lat, 
    lng: userLoc.lng,
    scopeType: filters.scope.type, // پارامتر جدید برای API
    scopeId: filters.scope.id,     // پارامتر جدید برای API
  });

  const processedProducts = useMemo(() => {
    const allProducts = data?.pages.flatMap((page: any) => page.products || []) || [];
    let results: ProductResult[] = allProducts.map((p: any) => {
      const lat = toNumber(p.lat); const lng = toNumber(p.lng);
      const distanceMeters = toNumber(p.distanceMeters) ?? toNumber(p.distance_meters) ?? calculateDistanceMeters(userLoc.lat, userLoc.lng, lat, lng);
      return {
        id: p.id, name: p.name || "بدون نام", store_name: p.store_name || "نامشخص",
        distance: p.distance || formatDistance(distanceMeters), distanceMeters,
        price: p.price ?? "", status: p.status || "نامشخص", updated: p.updated || p.updated_at || "به‌تازگی",
        image_url: p.image_url || FALLBACK, rating: Number(p.rating || 4.5), badge: p.badge || null, lat, lng,
      };
    });

    // فیلتر محدوده شعاع فقط برای جستجوهای مبتنی بر موقعیت کاربر معنا دارد نه اسکوپ‌های ادمینی
    if (filters.selectedRadius !== "all") results = results.filter(p => p.distanceMeters !== undefined && p.distanceMeters <= Number(filters.selectedRadius) * 1000);
    
    return results;
  }, [data, filters.selectedRadius, userLoc]);

  // مرتب‌سازی در سمت کلاینت (در صورت عدم پشتیبانی بک‌اند)
  const sortedProducts = useMemo(() => {
    let res = [...processedProducts];
    if (filters.onlyAvailable) res = res.filter(p => p.status === "موجود");
    if (filters.minPrice) res = res.filter(p => Number(p.price || 0) >= Number(filters.minPrice));
    if (filters.maxPrice) res = res.filter(p => Number(p.price || 0) <= Number(filters.maxPrice));

    if (filters.sortBy === "cheapest") res.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (filters.sortBy === "nearest") res.sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
    return res;
  }, [processedProducts, filters]);

  const handleShare = useCallback(async (product: ProductResult) => {
    const url = `${window.location.origin}/product/${product.id}`;
    try {
      if (navigator.share) await navigator.share({ title: product.name, text: product.name, url });
      else { await navigator.clipboard.writeText(url); showToast("لینک کپی شد"); }
    } catch {}
  }, [showToast]);

  const handleNavigate = useCallback((product: ProductResult) => {
    if (!product.lat || !product.lng) { showToast("موقعیت ثبت نشده"); return; }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${product.lat},${product.lng}`, "_blank");
  }, [showToast]);

  // داینامیک کردن متن placeholder بر اساس اسکوپ
  const searchPlaceholder = useMemo(() => {
    switch(filters.scope.type) {
      case 'city': return `جستجو در شهر ${filters.scope.name || 'شهر شما'}`;
      case 'province': return `جستجو در کل استان ${filters.scope.name || ''}`;
      case 'country': return 'جستجوی سراسری در کشور';
      default: return 'نام کالا یا برند...';
    }
  }, [filters.scope]);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F19] font-sans" dir="rtl">
      <AnimatePresence>{toastMsg && <Toast msg={toastMsg} />}</AnimatePresence>
      <FilterSheet open={showFilter} filters={filters} onChange={(f: any) => setFilters(p => ({...p, ...f}))} onClose={() => setShowFilter(false)} onReset={() => setFilters({...DEFAULT_FILTERS, scope: filters.scope})} />

      <header className="sticky top-0 z-[60] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          <motion.button onClick={() => navigate(-1)} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex justify-center items-center shrink-0"><ArrowRight className="w-5 h-5" /></motion.button>
          <form className="flex-1 relative group" onSubmit={(e) => { e.preventDefault(); commitSearch(query); }}>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[22px] blur opacity-0 group-focus-within:opacity-30 transition duration-300" />
            <div className="relative bg-slate-100 dark:bg-slate-800 rounded-[20px] flex items-center px-4 py-3 group-focus-within:bg-white dark:group-focus-within:bg-slate-900 border border-transparent group-focus-within:border-indigo-500/50 transition-all">
              <SearchIcon className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 shrink-0" />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={searchPlaceholder} className="flex-1 bg-transparent outline-none px-3 text-[15px] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              {query ? <button type="button" onClick={clearSearch} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex justify-center items-center shrink-0"><X className="w-4 h-4 text-slate-500" /></button> : <button type="submit" className="h-7 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black shrink-0 shadow-md shadow-indigo-500/20">جستجو</button>}
            </div>
          </form>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowFilter(true)} className={`relative w-12 h-12 rounded-2xl flex justify-center items-center shrink-0 transition-colors ${showFilter ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-100 dark:bg-slate-800"}`}>
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && <span className="absolute -top-1.5 -left-1.5 min-w-[22px] h-[22px] rounded-full bg-rose-500 text-white text-[10px] font-black flex justify-center items-center border-[2.5px] border-white dark:border-slate-900">{activeFilterCount}</span>}
          </motion.button>
        </div>

        {/* چیپ نمایش محدوده جستجو */}
        <AnimatePresence>
          {hasQuery && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-between gap-3 mt-4 overflow-hidden">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar shrink items-center">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  {filters.scope.type === 'city' ? `شهر ${filters.scope.name}` : filters.scope.type === 'province' ? `استان ${filters.scope.name}` : 'سراسری'}
                </div>
                {[{ key: "newest", label: "جدیدترین" }, { key: "nearest", label: "نزدیک‌ترین" }, { key: "cheapest", label: "ارزان‌ترین" }].map((sort) => (
                  <button key={sort.key} onClick={() => setFilters(p => ({...p, sortBy: sort.key as SortType}))} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filters.sortBy === sort.key ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>{sort.label}</button>
                ))}
              </div>
              <div className="bg-slate-200/50 dark:bg-slate-800 p-1 rounded-2xl flex shrink-0 relative">
                {(["list", "map"] as const).map((mode) => (
                  <button key={mode} onClick={() => setViewMode(mode)} className={`relative z-10 px-4 py-1.5 rounded-[12px] flex justify-center items-center ${viewMode === mode ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}>
                    {viewMode === mode && <motion.div layoutId="viewToggle" transition={SPRING_TRANSITION} className="absolute inset-0 bg-white dark:bg-slate-700 rounded-[12px] shadow-sm -z-10" />}
                    {mode === "list" ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="px-4 py-5 pb-24">
        {!hasQuery && <IdleSection recents={recents} onRecentClick={commitSearch} onClearRecents={clearRecents} onSuggestionClick={commitSearch} />}
        {hasQuery && error && (
          <div className="mb-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-[24px] p-4 flex justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-sm font-bold"><AlertCircle className="w-4 h-4" /> خطا در دریافت اطلاعات</div>
            <button onClick={() => refetch()} className="text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20 px-3 py-1.5 rounded-full">تلاش مجدد</button>
          </div>
        )}
        {hasQuery && isLoading && sortedProducts.length === 0 && <SearchSkeleton />}
        
        {/* حالت خالی هوشمند - پیشنهاد گسترش محدوده جستجو */}
        {hasQuery && !isLoading && !error && sortedProducts.length === 0 && (
          <div className="pt-12 flex flex-col items-center text-center">
            <EmptyState title="نتیجه‌ای پیدا نشد" description={`متاسفانه کالایی برای "${debouncedQuery}" در ${filters.scope.type === 'city' ? `شهر ${filters.scope.name}` : filters.scope.type === 'province' ? `استان ${filters.scope.name}` : 'کشور'} یافت نشد.`} />
            {filters.scope.type !== 'country' && (
              <motion.button 
                onClick={expandSearchScope}
                whileTap={{ scale: 0.95 }}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30"
              >
                <Expand className="w-4 h-4" />
                جستجو در {filters.scope.type === 'city' ? 'کل استان' : 'سراسر کشور'}
              </motion.button>
            )}
          </div>
        )}
        
        {hasQuery && !error && sortedProducts.length > 0 && viewMode === "list" && (
          <>
            <p className="text-xs font-bold text-slate-400 mb-4 px-1">{sortedProducts.length.toLocaleString("fa-IR")} نتیجه یافت شد</p>
            <Virtuoso
              data={sortedProducts} useWindowScroll overscan={700}
              endReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
              itemContent={(index, product) => <ProductCard product={product} index={index} onShare={handleShare} onNavigate={handleNavigate} />}
              components={{
                Footer: () => isFetchingNextPage ? <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div> : null
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