import React, { memo, useCallback } from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useHomeLogic } from "./useHomeLogic";
import { HOME_CONFIG } from "./constants";
import { HomeErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/HeaderWidgets";
import { SearchBar } from "./components/SearchBar";
import { ResultHeader } from "./components/ResultHeader";
import {
  PremiumProductCard,
  ProductCardSkeleton,
  SegmentedScope,
} from "./components/ProductSections";
import { CategorySlider } from "./components/CategorySlider";
import EmptyState from "../../components/ui/EmptyState";
import { LocationModal } from "./components/LocationModal";
import { SponsoredBanner } from "./components/SponsoredBanner";
import { ValuePropsBanner } from "./components/ValuePropsBanner";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: HOME_CONFIG.ANIMATION_STAGGER },
  },
};

// -------------------- Sub-components (extracted) --------------------
const ActiveFiltersBanner = memo(
  ({
    filterCount,
    onClear,
  }: {
    filterCount: number;
    onClear: () => void;
  }) => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 mb-3 overflow-hidden"
    >
      <button
        onClick={onClear}
        aria-label="پاک کردن فیلترها"
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 active:scale-95"
      >
        <span>{filterCount} فیلتر فعال</span>
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
);

ActiveFiltersBanner.displayName = "ActiveFiltersBanner";

const ErrorBanner = memo(
  ({ onRetry }: { onRetry: () => void }) => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 mb-4 overflow-hidden"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
        <span className="flex items-center gap-2 text-xs font-bold text-rose-600">
          <AlertCircle className="w-4 h-4" /> نت یه لحظه قطع شد
        </span>
        <button
          onClick={onRetry}
          aria-label="تلاش مجدد"
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-100 text-rose-700"
        >
          دوباره تلاش کن
        </button>
      </div>
    </motion.div>
  )
);

ErrorBanner.displayName = "ErrorBanner";

const EndOfListMessage = memo(() => (
  <div className="py-12 flex items-center justify-center gap-3">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300" />
    <p className="text-xs text-gray-400 font-medium">فعلاً همین‌ها بود 🌿</p>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300" />
  </div>
));

EndOfListMessage.displayName = "EndOfListMessage";

// -------------------- Main Component --------------------
export default function Home() {
  const logic = useHomeLogic();
  const {
    user,
    effectiveCity,
    effectiveDisplay,
    effectiveProvince,
    gpsEnabled,
    manualLocation,
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    scope,
    setScope,
    sort,
    setSort,
    isLocationModalOpen,
    setIsLocationModalOpen,
    handleCityChange,
    handleClearFilters,
    hasActiveFilters,
    filterCount,
    error,
    refetch,
    isLoading,
    allProducts,
    favoritesSet,
    toggleFavorite,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
  } = logic;

  // توابع پایدار برای جلوگیری از رندر مجدد کامپوننت‌های memo شده
  const handleOpenLocationModal = useCallback(() => {
    setIsLocationModalOpen(true);
  }, [setIsLocationModalOpen]);

  const handleCloseLocationModal = useCallback(() => {
    setIsLocationModalOpen(false);
  }, [setIsLocationModalOpen]);

  const productsCount = allProducts.length;

  return (
    <HomeErrorBoundary>
      <div
        className="flex flex-col min-h-screen bg-[var(--bg-primary)] font-sans"
        dir="rtl"
      >
        <Header
          user={user}
          effectiveCity={effectiveCity}
          effectiveDisplay={effectiveDisplay}
          gpsEnabled={gpsEnabled}
          manualLocation={manualLocation}
          onOpenLocationModal={handleOpenLocationModal}
        />

        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={handleCloseLocationModal}
          selectedCity={effectiveCity}
          selectedProvince={effectiveProvince}
          onSelect={handleCityChange}
        />

        <div className="sticky top-14 z-30 bg-[var(--bg-primary)] shadow-sm">
          <SearchBar value={search} onChange={setSearch} placeholder="چی لازم داری؟ همین دور و بر…" />
          <CategorySlider activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
        </div>

        <main className="flex-1 pb-24 pt-4">
          <SponsoredBanner city={effectiveCity} />
          <ValuePropsBanner />

          <div className="px-4 mb-4">
            <SegmentedScope scope={scope} onScopeChange={setScope} city={effectiveCity} />
          </div>

          <AnimatePresence>
            {hasActiveFilters && (
              <ActiveFiltersBanner filterCount={filterCount} onClear={handleClearFilters} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && <ErrorBanner onRetry={refetch} />}
          </AnimatePresence>

          <div className="px-4">
            {!isLoading && productsCount > 0 && (
              <ResultHeader
                count={productsCount}
                sort={sort}
                onSortChange={setSort}
                isLoading={isLoading}
              />
            )}

            {isLoading && productsCount === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : !isLoading && productsCount === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="هنوز چیزی این اطراف پیدا نشد"
                  description={
                    hasActiveFilters
                      ? "فیلترها رو کمی بازتر کن؛ شاید همون چیزی که می‌خوای ظاهر بشه."
                      : "به‌زودی کالاهای تازه‌ای از مغازه‌های محله می‌آد. شهر رو چک کن یا بعداً سر بزن."
                  }
                >
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm active:scale-95"
                    >
                      پاک کردن فیلترها
                    </button>
                  )}
                </EmptyState>
              </div>
            ) : (
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

                <div
                  ref={loadMoreRef}
                  className="h-20 flex items-center justify-center mt-6"
                >
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>داره می‌آد…</span>
                    </div>
                  )}
                </div>

                {!hasNextPage && productsCount > 0 && !isFetchingNextPage && (
                  <EndOfListMessage />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </HomeErrorBoundary>
  );
}
