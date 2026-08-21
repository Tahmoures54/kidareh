import React from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useHomeLogic } from "./useHomeLogic";
import { HOME_CONFIG } from "./constants";
import { HomeErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/HeaderWidgets";
import { SearchBar } from "./components/SearchBar";
import { ResultHeader } from "./components/ResultHeader";
import { PremiumProductCard, ProductCardSkeleton, SegmentedScope } from "./components/ProductSections";
import { CategorySlider } from "./components/CategorySlider";
import EmptyState from "../../components/ui/EmptyState";
import { LocationModal } from "./components/LocationModal";
import { SponsoredBanner } from "./components/SponsoredBanner";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: HOME_CONFIG.ANIMATION_STAGGER } }
};

export default function Home() {
  const logic = useHomeLogic();

  return (
    <HomeErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] font-sans" dir="rtl">
        <Header 
          user={logic.user}
          effectiveCity={logic.effectiveCity}
          effectiveDisplay={logic.effectiveDisplay}
          gpsEnabled={logic.gpsEnabled}
          manualLocation={logic.manualLocation}
          onOpenLocationModal={() => logic.setIsLocationModalOpen(true)}
        />

        <LocationModal
          isOpen={logic.isLocationModalOpen}
          onClose={() => logic.setIsLocationModalOpen(false)}
          selectedCity={logic.effectiveCity}
          selectedProvince={logic.effectiveProvince}
          onSelect={logic.handleCityChange}
        />

        <div className="sticky top-14 z-30 bg-[var(--bg-primary)] shadow-sm">
          <SearchBar 
            value={logic.search} 
            onChange={logic.setSearch} 
            placeholder="دنبال چی می‌گردی؟"
          />
          <CategorySlider 
            activeCategory={logic.activeCategory} 
            onSelectCategory={logic.setActiveCategory} 
          />
        </div>

        <main className="flex-1 pb-24 pt-4">
          {/* بنر اسپانسر محلی — برچسب آگهی (تحلیل روان‌شناسی فروشنده) */}
          <SponsoredBanner city={logic.effectiveCity} />

          <div className="px-4 mb-4">
            <SegmentedScope scope={logic.scope} onScopeChange={logic.setScope} city={logic.effectiveCity} />
          </div>

          <AnimatePresence>
            {logic.hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="px-4 mb-3 overflow-hidden"
              >
                <button
                  onClick={logic.handleClearFilters}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors active:scale-95"
                >
                  <span>{logic.filterCount} فیلتر فعال</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {logic.error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="px-4 mb-4 overflow-hidden"
              >
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="flex items-center gap-2 text-xs font-bold text-rose-600"><AlertCircle className="w-4 h-4" /> خطا در بارگذاری</span>
                  <button onClick={() => logic.refetch()} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-100 text-rose-700">تلاش مجدد</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4">
            {!logic.isLoading && logic.allProducts.length > 0 && (
              <ResultHeader count={logic.allProducts.length} sort={logic.sort} onSortChange={logic.setSort} isLoading={logic.isLoading} />
            )}

            {logic.isLoading && logic.allProducts.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : !logic.isLoading && logic.allProducts.length === 0 ? (
              <div className="py-12">
                <EmptyState title="آگهی‌ای یافت نشد" description={logic.hasActiveFilters ? "با فیلترهای فعلی چیزی پیدا نشد." : "آگهی جدیدی ثبت نشده است."}>
                  {logic.hasActiveFilters && (
                    <button onClick={logic.handleClearFilters} className="mt-4 px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm">پاک کردن فیلترها</button>
                  )}
                </EmptyState>
              </div>
            ) : (
              <>
                <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" variants={containerVariants} initial="hidden" animate="show">
                  {logic.allProducts.map((p) => (
                    <PremiumProductCard key={p.id} product={p} isFavorite={logic.favoritesSet.has(p.id)} onToggleFavorite={logic.toggleFavorite} />
                  ))}
                </motion.div>

                <div ref={logic.loadMoreRef} className="h-20 flex items-center justify-center mt-6">
                  {logic.isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /><span>در حال بارگذاری...</span></div>
                  )}
                </div>

                {!logic.hasNextPage && logic.allProducts.length > 0 && !logic.isFetchingNextPage && (
                  <div className="py-12 flex items-center justify-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300"></div>
                    <p className="text-xs text-gray-400 font-medium">همه آگهی‌ها نمایش داده شد</p>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300"></div>
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
