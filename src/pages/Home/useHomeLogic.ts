import { useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppLocation } from "../../hooks/useAppLocation";
import { findIranCity } from "../../data/processed/iranCities";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import useDebounce from "./hooks/useDebounce";
import { HOME_CONFIG, AppUser, SortType } from "./constants";

export const useHomeLogic = () => {
  const { user } = useAuth() as { user: AppUser | null };

  // -------------------- States --------------------
  const [scope, setScope] = useState<"city" | "all">("city");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const {
    location,
    pickerOpen,
    setPickerOpen,
    selectCity,
    useGps,
    gpsError,
    gpsLoading,
  } = useAppLocation();
  const [favorites, setFavorites] = useLocalStorage<string[]>("favorites", []);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("newest");

  const debouncedSearch = useDebounce(search, HOME_CONFIG.SEARCH_DEBOUNCE_MS);

  // -------------------- Location Logic --------------------
  const effectiveCity = location.city || "تهران";
  const effectiveDisplay = location.display || "انتخاب شهر";
  const effectiveProvince = location.province || "";
  const gpsEnabled = location.source === "gps";

  // -------------------- Data Fetching --------------------
  const {
    flatProducts: allProducts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteProducts({
    scope: scope === "city" ? "city" : "all",
    city: scope === "city" ? effectiveCity : undefined,
    category: activeCategory || undefined,
    q: debouncedSearch || undefined,
    limit: HOME_CONFIG.PRODUCTS_PER_PAGE,
    sort: sort === "expensive" ? "newest" : sort,
  });

  // تبدیل آرایه به Set برای جستجوی فوق‌سریع در زمان رندر علاقه‌مندی‌ها (O(1))
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  // -------------------- Infinite Scroll --------------------
  const loadMoreRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin: "300px 0px",
  });

  // -------------------- Handlers --------------------
  const toggleFavorite = useCallback(
    (productId: string) => {
      setFavorites((prev: string[]) =>
        prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId]
      );
    },
    [setFavorites]
  );

  const handleCityChange = useCallback(
    (city: string, _display: string, province: string) => {
      const matched = findIranCity(city, province) ?? findIranCity(city);
      if (matched) selectCity(matched);
    },
    [selectCity]
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setActiveCategory(null);
    setSort("newest");
    setScope("city"); // بازنشانی محدوده به حالت پیش‌فرض
  }, []);

  // -------------------- Computed Values (با useMemo برای بهینه‌سازی) --------------------
  const hasActiveFilters = useMemo(
    () =>
      !!(
        activeCategory ||
        debouncedSearch ||
        sort !== "newest" ||
        scope !== "city"
      ),
    [activeCategory, debouncedSearch, sort, scope]
  );

  const filterCount = useMemo(
    () =>
      [activeCategory, debouncedSearch, sort !== "newest", scope !== "city"].filter(
        Boolean
      ).length,
    [activeCategory, debouncedSearch, sort, scope]
  );

  return {
    // Data
    user,
    allProducts,
    favoritesSet,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,

    // States
    scope,
    search,
    sort,
    activeCategory,
    isLocationModalOpen: pickerOpen,
    hasActiveFilters,
    filterCount,

    // Location
    effectiveCity,
    effectiveDisplay,
    effectiveProvince,
    gpsEnabled,
    manualLocation: location.source === "manual"
      ? { city: location.city, display: location.display, province: location.province }
      : null,
    pickerOpen,
    gpsError,
    gpsLoading,

    // Handlers & Refs
    setScope,
    setSearch,
    setSort,
    setActiveCategory,
    setIsLocationModalOpen: setPickerOpen,
    toggleFavorite,
    handleCityChange,
    handleClearFilters,
    selectCity,
    useGps,
    refetch,
    loadMoreRef,
  };
};
