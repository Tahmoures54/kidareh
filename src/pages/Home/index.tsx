import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, X, MapPin, Store, ShieldCheck, ArrowLeft } from "lucide-react";
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
import CityPicker from "../../components/location/CityPicker";
import { SponsoredBanner } from "./components/SponsoredBanner";
import { ValuePropsBanner } from "./components/ValuePropsBanner";
import { FeedStories } from "../../components/feed/FeedStories";
import { useMarketStories } from "../../hooks/useMarketStories";
import { mergeMarketStories } from "../../lib/marketStories";
import { presenceMarketStories } from "../../presence/stories";
import { isTehranCity } from "../../data/processed/iranCities";
import Map from "../../components/Map";
import { apiRequest } from "../../utils/api";

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

function MarketStoryRail({ city }: { city: string }) {
  const { items } = useMarketStories(city);
  const stories = useMemo(
    () => mergeMarketStories(items, isTehranCity(city) ? presenceMarketStories() : [], 24),
    [city, items]
  );
  if (!stories.length) return null;
  return (
    <div className="mb-3 overflow-hidden bg-white">
      <FeedStories items={stories} />
    </div>
  );
}

// -------------------- Main Component --------------------
export default function Home() {
  const logic = useHomeLogic();
  const {
    user,
    effectiveCity,
    effectiveDisplay,
    effectiveProvince,
    gpsEnabled,
    userLat,
    userLng,
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
    selectCity,
    useGps,
    gpsLoading,
    gpsError,
  } = logic;

  // توابع پایدار برای جلوگیری از رندر مجدد کامپوننت‌های memo شده
  const handleOpenLocationModal = useCallback(() => {
    setIsLocationModalOpen(true);
  }, [setIsLocationModalOpen]);

  const handleCloseLocationModal = useCallback(() => {
    setIsLocationModalOpen(false);
  }, [setIsLocationModalOpen]);

  const productsCount = allProducts.length;

  const [nearbyStores, setNearbyStores] = useState<any[]>([]);

  const distanceKm = useCallback((lat: number, lng: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat - userLat);
    const dLng = toRad(lng - userLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [userLat, userLng]);
  const [storesLoading, setStoresLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadStores = async () => {
      if (!effectiveCity) return;
      setStoresLoading(true);
      try {
        const data = await apiRequest<{ stores?: any[] }>(
          "/api/stores?city=" + encodeURIComponent(effectiveCity) + "&limit=50"
        );
        if (active) {
          const stores = Array.isArray(data?.stores) ? data.stores : [];
          const ranked = stores.map((store: any) => ({
            ...store,
            distance_km: store.lat != null && store.lng != null ? distanceKm(Number(store.lat), Number(store.lng)) : Number.POSITIVE_INFINITY,
          })).sort((a: any, b: any) => a.distance_km - b.distance_km);
          setNearbyStores(ranked);
        }
      } catch {
        if (active) setNearbyStores([]);
      } finally {
        if (active) setStoresLoading(false);
      }
    };
    loadStores();
    return () => { active = false; };
  }, [effectiveCity, distanceKm]);

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

        <CityPicker
          open={isLocationModalOpen}
          selectedCity={effectiveCity}
          selectedProvince={effectiveProvince}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
          onClose={handleCloseLocationModal}
          onSelect={selectCity}
          onGps={useGps}
        />

        <div className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 shadow-sm backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1180px] px-4 pt-3 lg:pt-5">
            <section className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-gradient-to-br from-[#e9fbff] via-white to-[#dff7f4] p-5 shadow-[0_20px_55px_-35px_rgba(8,76,103,.35)] lg:p-8">
              <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#42a9d8]/15 blur-3xl" />
              <div className="absolute -right-20 -bottom-24 h-56 w-56 rounded-full bg-[#08a6a6]/15 blur-3xl" />
              <div className="relative grid items-center gap-6 lg:grid-cols-[1.25fr_.75fr]">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#08a6a6]/15 bg-white/75 px-3 py-1.5 text-xs font-black text-[#087b8b]">
                    <span className="h-2 w-2 rounded-full bg-[#08a6a6]" />
                    بازار محلی · {effectiveCity}
                  </div>
                  <h1 className="max-w-2xl text-2xl font-black leading-tight text-[#073f56] lg:text-4xl">
                    هر چیزی که لازم داری، نزدیک خودت پیدا کن
                  </h1>
                  <p className="mt-2 max-w-xl text-sm font-bold leading-7 text-[#55798a] lg:text-base">
                    قیمت را ببین، فروشگاه را پیدا کن و اگر خواستی حضوری تحویل بگیر.
                  </p>
                  <div className="mt-5 max-w-2xl rounded-2xl bg-white/90 p-1.5 shadow-[0_12px_35px_-22px_rgba(8,76,103,.35)]">
                    <SearchBar value={search} onChange={setSearch} placeholder="مثلاً لاستیک، موبایل، لوازم خودرو…" />
                  </div>
                </div>
                <div className="hidden lg:grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/80 bg-white/75 p-4">
                    <div className="text-xs font-black text-[#55798a]">خرید محلی</div>
                    <div className="mt-1 text-lg font-black text-[#073f56]">نزدیک و سریع</div>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/75 p-4">
                    <div className="text-xs font-black text-[#55798a]">فروشگاه‌ها</div>
                    <div className="mt-1 text-lg font-black text-[#073f56]">مستقیم ببین</div>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-white/80 bg-white/75 p-4">
                    <div className="text-xs font-black text-[#55798a]">کی‌داره چه کمکی می‌کند؟</div>
                    <div className="mt-1 text-sm font-black leading-6 text-[#087b8b]">کالای موردنیازت را در بازار اطراف تو پیدا می‌کند.</div>
                  </div>
                </div>
              </div>
            </section>
            <div className="mt-3">
              <CategorySlider activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
            </div>
          </div>
        </div>

        <main className="flex-1 pb-24 pt-4">
          <div className="mx-auto w-full max-w-[1180px]">
            <MarketStoryRail city={effectiveCity} />
          <SponsoredBanner city={effectiveCity} />
          <ValuePropsBanner />

          <section className="mb-5 px-4 lg:px-0">
            <div className="rounded-[24px] border border-[#08a6a6]/15 bg-gradient-to-l from-[#e5faf8] via-white to-[#e7f7ff] p-5 shadow-[0_18px_45px_-34px_rgba(8,76,103,.45)] lg:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-[#087b8b]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#08a6a6]" />
                    اطراف شما چه خبر؟
                  </div>
                  <h2 className="mt-1 text-xl font-black text-[#073f56] lg:text-2xl">کالاها را بر اساس محدوده ببین</h2>
                  <p className="mt-1 text-xs font-bold text-[#55798a]">اول بازار نزدیک خودت، بعد اگر خواستی کل ایران.</p>
                </div>
                <div className="w-full sm:w-72">
                  <SegmentedScope scope={scope} onScopeChange={setScope} city={effectiveCity} />
                </div>
              </div>
            </div>
          </section>

          {nearbyStores.length > 0 && (
            <section className="mb-7 px-4 lg:px-0">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-black text-[#0788ad]">
                    <Store className="h-4 w-4" /> بازار محلی
                  </div>
                  <h2 className="text-2xl font-black text-[#073f56]">فروشگاه‌های نزدیک شما</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">مستقیم با فروشگاه آشنا شو و برای خرید حضوری تصمیم بگیر.</p>
                </div>
                <span className="hidden rounded-full bg-[#e8f9f7] px-3 py-1.5 text-xs font-black text-[#087b8b] sm:block">{nearbyStores.length} فروشگاه</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
                <div className="grid grid-cols-2 gap-3">
                  {nearbyStores.slice(0, 4).map((store) => (
                    <a key={store.id} href={"/stores/" + store.id} className="group rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_12px_35px_-28px_rgba(8,76,103,.5)] transition-all hover:-translate-y-1 hover:border-[#08a6a6]/30 hover:shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e3faf7] to-[#e5f6ff] text-[#0788ad]">
                          {store.image_url ? <img src={store.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Store className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black text-[#073f56] group-hover:text-[#0788ad]">{store.name}</h3>
                          <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-bold text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{store.address || store.city}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-500">
                        <span>{store.product_count || 0} کالا</span>
                        {Number.isFinite(store.distance_km) && <span>{store.distance_km < 1 ? `${Math.round(store.distance_km * 1000)} متر` : `${store.distance_km.toFixed(1)} کیلومتر`}</span>}
                        <span className="flex items-center gap-1 text-[#087b8b]">{store.is_verified || store.has_business_license ? <ShieldCheck className="h-3.5 w-3.5" /> : null} مشاهده <ArrowLeft className="h-3 w-3" /></span>
                      </div>
                    </a>
                  ))}
                </div>
                <div className="min-h-[330px] overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-[0_18px_45px_-34px_rgba(8,76,103,.5)]">
                  {(() => {
                    const located = nearbyStores.filter((s) => s.lat != null && s.lng != null);
                    if (!located.length) return <div className="flex h-full min-h-[330px] items-center justify-center p-8 text-center text-sm font-bold text-slate-500"><div><MapPin className="mx-auto mb-3 h-8 w-8 text-[#08a6a6]" /><p>هنوز موقعیت دقیق همه فروشگاه‌ها ثبت نشده است.</p></div></div>;
                    const center = { lat: Number(located[0].lat), lng: Number(located[0].lng) };
                    const results = located.map((s) => ({ id: s.id, name: s.name, price: 0, store: s.name, latitude: Number(s.lat), longitude: Number(s.lng), badge: s.is_verified || s.has_business_license ? "تأییدشده" : undefined }));
                    return <Map center={center} results={results} height="330px" />;
                  })()}
                </div>
              </div>
            </section>
          )}

          <div className="px-4 mb-4 lg:px-0">
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

          <div className="px-4 lg:px-0">
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
          </div>
        </main>
      </div>
    </HomeErrorBoundary>
  );
}
