import { useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import useDebounce from "./hooks/useDebounce";
import { HOME_CONFIG, AppUser, SortType, ManualLocation } from "./constants";

export const useHomeLogic = () => {
  const { user } = useAuth() as { user: AppUser | null };

  // -------------------- States --------------------
  const [scope, setScope] = useState<"city" | "all">("city");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useLocalStorage<ManualLocation | null>(
    "manual-location",
    null
  );
  const [favorites, setFavorites] = useLocalStorage<string[]>("favorites", []);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("newest");

  const debouncedSearch = useDebounce(search, HOME_CONFIG.SEARCH_DEBOUNCE_MS);

  // -------------------- Location Logic --------------------
  const { city: realCity, province: realProvince, displayLocation, gpsEnabled } = useGeolocation("تهران");
  const effectiveCity = manualLocation?.city || realCity || "تهران";
  const effectiveDisplay = manualLocation?.display || displayLocation || "انتخاب شهر";
  const effectiveProvince = manualLocation?.province || realProvince || "";

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
    scope,
    city: scope === "city" ? effectiveCity : undefined,
    category: activeCategory || undefined,
    search: debouncedSearch || undefined,
    limit: HOME_CONFIG.PRODUCTS_PER_PAGE,
    sort,
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
    (city: string, display: string, province: string) => {
      setManualLocation({ city, display, province });
    },
    [setManualLocation]
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setActiveCategory(null);
    setSort("newest");
    setScope("city"); // بازنشانی محدوده به حالت پیش‌فرض
  }, []);

  // -------------------- Computed Values --------------------
  const hasActiveFilters = !!(
    activeCategory ||
    debouncedSearch ||
    sort !== "newest" ||
    scope !== "city"
  );
  const filterCount = [
    activeCategory,
    debouncedSearch,
    sort !== "newest",
    scope !== "city",
  ].filter(Boolean).length;

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
    isLocationModalOpen,
    hasActiveFilters,
    filterCount,

    // Location
    effectiveCity,
    effectiveDisplay,
    effectiveProvince,
    gpsEnabled,
    manualLocation,

    // Handlers & Refs
    setScope,
    setSearch,
    setSort,
    setActiveCategory,
    setIsLocationModalOpen,
    toggleFavorite,
    handleCityChange,
    handleClearFilters,
    refetch,
    loadMoreRef,
  };
};
