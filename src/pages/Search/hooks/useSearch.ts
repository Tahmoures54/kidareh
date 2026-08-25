import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteProducts } from "../../../hooks/useInfiniteProducts";
import {
  SearchFilters,
  ViewMode,
  SortType,
  ProductResult,
  LocationScope,
  LocationScopeType,
} from "../types";
import {
  toNumber,
  formatDistance,
  calculateDistanceMeters,
  getActiveFilterCount,
} from "../utils";
import { FALLBACK } from "../components/constants";

const DEBOUNCE = 350;

export const getInitialScope = (): LocationScope => {
  try {
    const savedLoc = localStorage.getItem("manual-location");
    if (savedLoc) {
      const loc = JSON.parse(savedLoc);
      if (loc?.city) {
        return { 
          type: "city", 
          id: loc.city, 
          name: loc.display || loc.city 
        };
      }
    }
  } catch (e) {
    console.error("Error parsing location", e);
  }
  return { type: "city", id: "tehran", name: "تهران" };
};

const DEFAULT_FILTERS: Omit<SearchFilters, "scope"> = {
  minPrice: "",
  maxPrice: "",
  selectedRadius: "all",
  onlyAvailable: false,
  sortBy: "newest",
};

export function useSearch() {
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get("q") || "";

  // -------------------- States --------------------
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [toastMsg, setToastMsg] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [userLoc, setUserLoc] = useState({ lat: 35.6892, lng: 51.389 });

  const [filters, setFilters] = useState<SearchFilters>(() => {
    const freshScope = getInitialScope();
    const scopeType = (params.get("scope") as LocationScopeType) || freshScope.type;
    const scopeId = params.get("scopeId") || freshScope.id;
    const scopeName = params.get("scopeName") || freshScope.name;
    return { 
      ...DEFAULT_FILTERS, 
      scope: { type: scopeType, id: scopeId, name: scopeName } 
    };
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  // -------------------- Computed --------------------
  const hasQuery = !!debouncedQuery.trim();
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  // -------------------- Toast --------------------
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500);
  }, []);

  useEffect(() => {
    return () => { 
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); 
    };
  }, []);

  // -------------------- URL Sync --------------------
  useEffect(() => {
    const qFromUrl = params.get("q") || "";
    if (qFromUrl !== query) {
      setQuery(qFromUrl);
      setDebouncedQuery(qFromUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync to URL
  useEffect(() => {
    const currentQ = params.get("q") || "";
    const currentScope = params.get("scope");
    if (debouncedQuery === currentQ && filters.scope.type === currentScope) return;

    const next = new URLSearchParams(params);
    if (debouncedQuery) next.set("q", debouncedQuery);
    else next.delete("q");

    next.set("scope", filters.scope.type);
    if (filters.scope.id) next.set("scopeId", filters.scope.id);
    else next.delete("scopeId");
    if (filters.scope.name) next.set("scopeName", filters.scope.name);
    else next.delete("scopeName");

    setParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters.scope.type, filters.scope.id, filters.scope.name]);

  // -------------------- Init --------------------
  useEffect(() => {
    try {
      const saved = localStorage.getItem("recentSearches");
      if (saved) setRecents(JSON.parse(saved).slice(0, 10));
    } catch {}

    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // -------------------- Handlers --------------------
  const saveRecent = useCallback((q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recents.filter((s) => s !== q)].slice(0, 10);
    setRecents(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  }, [recents]);

  const commitSearch = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setQuery(normalized);
    setDebouncedQuery(normalized);
    saveRecent(normalized);
    setViewMode("list");
  }, [saveRecent]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    localStorage.removeItem("recentSearches");
  }, []);

  const removeRecent = useCallback((term: string) => {
    const updated = recents.filter((r) => r !== term);
    setRecents(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  }, [recents]);

  const expandSearchScope = useCallback(() => {
    setFilters((prev) => {
      if (prev.scope.type === "city") {
        return { ...prev, scope: { type: "province", id: prev.scope.id, name: "کل استان" } };
      }
      if (prev.scope.type === "province") {
        return { ...prev, scope: { type: "country", id: undefined, name: "سراسری" } };
      }
      return prev;
    });
  }, []);

  const cycleScope = useCallback(() => {
    setFilters((prev) => {
      if (prev.scope.type === "city") {
        return { ...prev, scope: { type: "province", id: prev.scope.id, name: "کل استان" } };
      }
      if (prev.scope.type === "province") {
        return { ...prev, scope: { type: "country", id: undefined, name: "سراسری" } };
      }
      return { ...prev, scope: getInitialScope() };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(() => ({
      ...DEFAULT_FILTERS,
      scope: getInitialScope(),
    }));
  }, []);

  // -------------------- Data --------------------
  const { 
    data, 
    isLoading, 
    isFetchingNextPage, 
    hasNextPage, 
    fetchNextPage, 
    error, 
    refetch 
  } = useInfiniteProducts({
    q: debouncedQuery || undefined,
    limit: 20,
    sort: filters.sortBy,
    onlyAvailable: filters.onlyAvailable,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    lat: userLoc.lat,
    lng: userLoc.lng,
    scopeType: filters.scope.type,
    scopeId: filters.scope.id,
  });

  // -------------------- Products Processing --------------------
  const processedProducts = useMemo(() => {
    const allProducts = data?.pages.flatMap((page: any) => page.products || []) || [];
    
    let results: ProductResult[] = allProducts.map((p: any) => {
      const lat = toNumber(p.lat);
      const lng = toNumber(p.lng);
      const distanceMeters =
        toNumber(p.distanceMeters) ??
        toNumber(p.distance_meters) ??
        calculateDistanceMeters(userLoc.lat, userLoc.lng, lat, lng);

      return {
        id: p.id,
        name: p.name || "بدون نام",
        store_name: p.store_name || "نامشخص",
        distance: p.distance || formatDistance(distanceMeters),
        distanceMeters,
        price: p.price ?? "",
        status: p.status || "نامشخص",
        updated: p.updated || p.updated_at || "به‌تازگی",
        image_url: p.image_url || FALLBACK,
        rating: Number(p.rating || 4.5),
        badge: p.badge || null,
        lat,
        lng,
      };
    });

    // فیلتر شعاع
    if (filters.selectedRadius !== "all") {
      results = results.filter(
        (p) => 
          p.distanceMeters !== undefined && 
          p.distanceMeters <= Number(filters.selectedRadius) * 1000
      );
    }

    return results;
  }, [data, filters.selectedRadius, userLoc]);

  const sortedProducts = useMemo(() => {
    let res = [...processedProducts];
    
    if (filters.onlyAvailable) res = res.filter((p) => p.status === "موجود");
    if (filters.minPrice) res = res.filter((p) => Number(p.price || 0) >= Number(filters.minPrice));
    if (filters.maxPrice) res = res.filter((p) => Number(p.price || 0) <= Number(filters.maxPrice));
    
    if (filters.sortBy === "cheapest") {
      res.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (filters.sortBy === "nearest") {
      res.sort(
        (a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER)
      );
    }

    return res;
  }, [processedProducts, filters]);

  // -------------------- Actions --------------------
  const handleShare = useCallback(async (product: ProductResult) => {
    const url = `${window.location.origin}/product/${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("لینک کپی شد ✓");
      }
    } catch {}
  }, [showToast]);

  const handleNavigate = useCallback((product: ProductResult) => {
    if (!product.lat || !product.lng) {
      showToast("موقعیت مکانی ثبت نشده");
      return;
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${product.lat},${product.lng}`,
      "_blank"
    );
  }, [showToast]);

  // -------------------- Computed Labels --------------------
  const searchPlaceholder = useMemo(() => {
    switch (filters.scope.type) {
      case "city": return `جستجو در ${filters.scope.name || "شهر شما"}...`;
      case "province": return "جستجو در کل استان...";
      case "country": return "جستجوی سراسری...";
      default: return "نام کالا یا برند...";
    }
  }, [filters.scope]);

  const scopeLabel = useMemo(() => {
    if (filters.scope.type === "city") return filters.scope.name || "شهر من";
    if (filters.scope.type === "province") return "کل استان";
    return "سراسری";
  }, [filters.scope]);

  return {
    query, setQuery,
    debouncedQuery,
    showFilter, setShowFilter,
    viewMode, setViewMode,
    toastMsg,
    recents,
    userLoc,
    filters, setFilters,
    inputRef,
    hasQuery,
    activeFilterCount,
    isLoading, isFetchingNextPage, hasNextPage, fetchNextPage,
    error, refetch,
    sortedProducts,
    commitSearch, clearSearch,
    clearRecents, removeRecent,
    expandSearchScope, cycleScope,
    resetFilters,
    handleShare, handleNavigate,
    searchPlaceholder, scopeLabel,
    showToast,
  };
}
