import React, { useState, useMemo, useCallback } from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useDebounce } from "./hooks/useDebounce";
import { HOME_CONFIG, AppUser, SortType } from "./constants";
import { HomeErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/HeaderWidgets";
import { SearchBar } from "./components/SearchBar";
import { ResultHeader } from "./components/ResultHeader";
import { PremiumProductCard, ProductCardSkeleton, SegmentedScope } from "./components/ProductSections";
import { CategorySlider } from "./components/CategorySlider";
import EmptyState from "../../components/ui/EmptyState";
import { LocationModal } from "./components/LocationModal";

export default function Home() {
  const { user } = useAuth() as { user: AppUser | null };

  // -------------------- States --------------------
  const [scope, setScope] = useState<"city" | "all">("city");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useLocalStorage<any>("manual-location", null);
  const [favorites, setFavorites] = useLocalStorage<string[]>("favorites", []);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("newest");

  // Debounce search برای جلوگیری از درخواست‌های مکرر
  const debouncedSearch = useDebounce(search, HOME_CONFIG.SEARCH_DEBOUNCE_MS);

  // -------------------- Handlers --------------------
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = useCallback(
    (productId: string) => {
      setFavorites((prev: string[]) =>
        prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
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
  }, []);

  // -------------------- Location --------------------
  const { city: realCity, province: realProvince, displayLocation, gpsEnabled } = useGeolocation("تهران");
  const effectiveCity = manualLocation?.city || realCity || "تهران";
  const effectiveDisplay = manualLocation?.display || displayLocation || "انتخاب شهر";
  const effectiveProvince = manualLocation?.province || realProvince || "";

  // -------------------- Data Fetching --------------------
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteProducts({
      scope,
      city: scope === "city" ? effectiveCity : undefined,
      category: activeCategory || undefined,
      search: debouncedSearch || undefined,
      limit: HOME_CONFIG.PRODUCTS_PER_PAGE,
      sort,
    });

  const allProducts = useMemo(() => data?.pages.flatMap(p => p.products) ?? [], [data]);
  
  // استفاده از هوک سفارشی برای Infinite Scroll
  const loadMoreRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin: "300px 0px"
  });

  // -------------------- Animation --------------------
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: HOME_CONFIG.ANIMATION_STAGGER }
    }
  };

  // -------------------- Active Filters --------------------
  const hasActiveFilters = !!(activeCategory || debouncedSearch || sort !== "newest");
  const filterCount = [activeCategory, debouncedSearch, sort !== "newest"].filter(Boolean).length;

  return (
    <HomeErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] font-sans" dir="rtl">
        
        {/* Header */}
        <Header 
          user={user}
          effectiveCity={effectiveCity}
          effectiveDisplay={effectiveDisplay}
          gpsEnabled={gpsEnabled}
          manualLocation={manualLocation}
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
        />

        {/* Location Modal */}
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          selectedCity={effectiveCity}
          selectedProvince={effectiveProvince}
          onSelect={handleCityChange}
        />

        {/* Sticky Search & Categories */}
        <div className="sticky top-14 z-30 bg-[var(--bg-primary)] shadow-sm">
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder="دنبال چی می‌گردی؟"
          />
          
          <CategorySlider 
            activeCategory={activeCategory} 
            onSelectCategory={setActiveCategory} 
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 pb-24 pt-4">
          
          {/* Scope Selector */}
          <div className="px-4 mb-4">
            <SegmentedScope 
              scope={scope} 
              onScopeChange={setScope} 
              city={effectiveCity} 
            />
          </div>

          {/* Active Filters Chip */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 mb-3 overflow-hidden"
              >
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors active:scale-95"
                >
                  <span>{filterCount} فیلتر فعال</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }}
                className="px-4 mb-4 overflow-hidden"
              >
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <span className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4" /> خطا در بارگذاری آگهی‌ها
                  </span>
                  <button 
                    onClick={() => refetch()} 
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 active:scale-95 transition-transform"
                  >
                    تلاش مجدد
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products Section */}
          <div className="px-4">
            
            {/* Result Header */}
            {!isLoading && allProducts.length > 0 && (
              <ResultHeader
                count={allProducts.length}
                sort={sort}
                onSortChange={setSort}
                isLoading={isLoading}
              />
            )}

            {/* Loading State */}
            {isLoading && allProducts.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : !isLoading && allProducts.length === 0 ? (
              /* Empty State */
              <div className="py-12">
                <EmptyState 
                  title="آگهی‌ای یافت نشد" 
                  description={
                    hasActiveFilters
                      ? "با فیلترهای فعلی آگهی‌ای پیدا نشد. فیلترها را تغییر دهید."
                      : "در این محدوده آگهی جدیدی ثبت نشده است."
                  }
                >
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-500/30"
                    >
                      پاک کردن فیلترها
                    </button>
                  )}
                </EmptyState>
              </div>
            ) : (
              /* Products Grid */
              <>
                <motion.div 
                  className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {allProducts.map((p) => (
                    <PremiumProductCard 
                      key={p.id} 
                      product={p} 
                      isFavorite={favoritesSet.has(p.id)} 
                      onToggleFavorite={toggleFavorite} 
                    />
                  ))}
                </motion.div>

                {/* Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-6">
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال بارگذاری...</span>
                    </div>
                  )}
                </div>

                {/* End of List */}
                {!hasNextPage && allProducts.length > 0 && !isFetchingNextPage && (
                  <div className="py-12 flex items-center justify-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-700"></div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                      همه آگهی‌ها نمایش داده شد
                    </p>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-700"></div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </HomeErrorBoundary>
  );
}
