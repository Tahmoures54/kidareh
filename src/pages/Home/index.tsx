import React, { useState, useMemo, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { HOME_CONFIG, AppUser } from "./constants";
import { HomeErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/HeaderWidgets";
import { PremiumProductCard, ProductCardSkeleton, SegmentedScope } from "./components/ProductSections";
import { CategorySlider } from "./components/CategorySlider";
import EmptyState from "../../components/ui/EmptyState";
import { LocationModal } from "./components/LocationModal";
import CategoryComboBox from '../../components/ui/CategoryComboBox';
import CitySearchComboBox from '../../components/ui/CitySearchComboBox';

export default function Home() {
  const { user } = useAuth() as { user: AppUser | null };

  const [scope, setScope] = useState<"city" | "all">("city");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useLocalStorage<any>("manual-location", null);
  const [favorites, setFavorites] = useLocalStorage<string[]>("favorites", []);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

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

  const { city: realCity, province: realProvince, displayLocation, gpsEnabled } = useGeolocation("تهران");
  const effectiveCity = manualLocation?.city || realCity || "تهران";
  const effectiveDisplay = manualLocation?.display || displayLocation || "انتخاب شهر";
  const effectiveProvince = manualLocation?.province || realProvince || ""; // ← اضافه شد

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteProducts({
      scope,
      city: scope === "city" ? effectiveCity : undefined,
      // province-based scope removed — only city or all
      category: activeCategory || undefined,
      limit: HOME_CONFIG.PRODUCTS_PER_PAGE,
      sort: "newest",
    });

  const allProducts = useMemo(() => data?.pages.flatMap(p => p.products) ?? [], [data]);
  
  // استفاده از هوک سفارشی برای Infinite Scroll
  const loadMoreRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  });

  // تنظیمات انیمیشن Stagger برای لیست محصولات
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <HomeErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] font-sans" dir="rtl">
        
        <Header 
          user={user}
          effectiveCity={effectiveCity}
          effectiveDisplay={effectiveDisplay}
          gpsEnabled={gpsEnabled}
          manualLocation={manualLocation}
          onCityChange={handleCityChange}
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
        />

        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          selectedCity={effectiveCity}
          selectedProvince={effectiveProvince}  // اکنون تعریف شده است
          onSelect={handleCityChange}
        />

        <main className="flex-1 pb-24">
          <CategorySlider activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

          <div className="px-4 pb-3 space-y-3">
            <div className="flex gap-3">
              <CategoryComboBox className="flex-1" onChange={(val) => setActiveCategory(val)} />
              <div style={{ width: 12 }} />
              <CitySearchComboBox onChange={(city, display, province) => handleCityChange(city, display, province)} />
            </div>
            <div>
              <SegmentedScope scope={scope as any} onScopeChange={(s: any) => setScope(s)} city={effectiveCity} province={''} />
            </div>
          </div>

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
                    <AlertCircle className="w-4 h-4" /> خطا در برقراری ارتباط
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

          <div className="px-4">
            {isLoading && allProducts.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : !isLoading && allProducts.length === 0 ? (
              <EmptyState title="آگهی‌ای یافت نشد!" description="در این محدوده آگهی جدیدی ثبت نشده است." />
            ) : (
              <motion.div 
                className="grid grid-cols-2 gap-3"
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
            )}
            
            <div ref={loadMoreRef} className="h-16 flex items-center justify-center mt-4">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال بارگذاری...
                </div>
              )}
            </div>
            
            {!hasNextPage && allProducts.length > 0 && !isFetchingNextPage && (
              <p className="py-10 text-center text-xs text-gray-400">پایان آگهی‌ها</p>
            )}
          </div>
        </main>
      </div>
    </HomeErrorBoundary>
  );
}
