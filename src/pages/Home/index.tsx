import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, X, MapPin, Store, ShieldCheck, ArrowLeft, Sparkles } from "lucide-react";
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

const ActiveFiltersBanner = memo(
  ({ filterCount, onClear }: { filterCount: number; onClear: () => void }) => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 overflow-hidden"
    >
      <button
        onClick={onClear}
        aria-label="پاک کردن فیلترها"
        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
      >
        <span>{filterCount} فیلتر فعال</span>
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
);

ActiveFiltersBanner.displayName = "ActiveFiltersBanner";

const ErrorBanner = memo(({ onRetry }: { onRetry: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    className="mb-5"
    role="alert"
    aria-live="assertive"
  >
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
      <span className="flex items-center gap-2 text-xs font-bold text-rose-600">
        <AlertCircle className="h-4 w-4" />
        ارتباط با بازار لحظه‌ای قطع شد.
      </span>
      <button
        onClick={onRetry}
        className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-200"
      >
        تلاش مجدد
      </button>
    </div>
  </motion.div>
));

ErrorBanner.displayName = "ErrorBanner";

const EndOfListMessage = memo(() => (
  <div className="flex items-center justify-center gap-3 py-10">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
    <p className="text-xs font-medium text-slate-400">فعلاً همین‌ها بود 🌿</p>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
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
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <FeedStories items={stories} />
    </section>
  );
}

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

  const [nearbyStores, setNearbyStores] = useState<any[]>([]);

  const handleOpenLocationModal = useCallback(
    () => setIsLocationModalOpen(true),
    [setIsLocationModalOpen]
  );

  const handleCloseLocationModal = useCallback(
    () => setIsLocationModalOpen(false),
    [setIsLocationModalOpen]
  );

  const distanceKm = useCallback(
    (lat: number, lng: number) => {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const dLat = toRad(lat - userLat);
      const dLng = toRad(lng - userLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(userLat)) *
          Math.cos(toRad(lat)) *
          Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    [userLat, userLng]
  );

  useEffect(() => {
    let active = true;

    const loadStores = async () => {
      if (!effectiveCity) return;

      try {
        const data = await apiRequest<{ stores?: any[] }>(
          "/api/stores?city=" + encodeURIComponent(effectiveCity) + "&limit=50"
        );

        if (!active) return;

        const stores = Array.isArray(data?.stores) ? data.stores : [];
        const ranked = stores
          .map((store: any) => ({
            ...store,
            distance_km:
              store.lat != null && store.lng != null
                ? distanceKm(Number(store.lat), Number(store.lng))
                : Number.POSITIVE_INFINITY,
          }))
          .sort((a: any, b: any) => a.distance_km - b.distance_km);

        setNearbyStores(ranked);
      } catch {
        if (active) setNearbyStores([]);
      }
    };

    loadStores();
    return () => {
      active = false;
    };
  }, [effectiveCity, distanceKm]);

  const productsCount = allProducts.length;

  return (
    <HomeErrorBoundary>
      <div dir="rtl" className="min-h-screen bg-[var(--bg-primary)] font-sans text-slate-900">
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

        <main className="pb-24">
          <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
            <section className="relative mt-4 overflow-hidden rounded-[30px] border border-cyan-100 bg-gradient-to-br from-[#e9fbff] via-white to-[#e6faf7] shadow-[0_24px_70px_-42px_rgba(8,76,103,.45)] lg:mt-6">
              <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />

              <div className="relative grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_360px] lg:p-10">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3.5 py-2 text-xs font-black text-teal-700 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                    بازار محلی {effectiveCity ? "· " + effectiveCity : ""}
                  </div>

                  <h1 className="max-w-3xl text-3xl font-black leading-[1.35] tracking-tight text-[#073f56] sm:text-4xl lg:text-5xl">
                    چیزی که می‌خوای را
                    <span className="text-teal-600"> نزدیک خودت </span>
                    پیدا کن
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-slate-600 sm:text-base">
                    قیمت‌ها و فروشگاه‌های اطراف را یک‌جا ببین؛ سریع‌تر مقایسه کن و برای خرید حضوری تصمیم بگیر.
                  </p>

                  <div className="mt-6 max-w-2xl rounded-[20px] border border-white bg-white p-1.5 shadow-[0_16px_45px_-25px_rgba(8,76,103,.4)]">
                    <SearchBar
                      value={search}
                      onChange={setSearch}
                      placeholder="دنبال چه چیزی می‌گردی؟ مثلاً لاستیک، موبایل، لوازم خودرو…"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-teal-600" />
                      جست‌وجوی محلی
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-cyan-600" />
                      فروشگاه‌های واقعی
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                      اطلاعات شفاف
                    </span>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="rounded-[26px] border border-white/90 bg-white/75 p-5 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-teal-50 px-3 py-1.5 text-[11px] font-black text-teal-700">
                        ساده و سریع
                      </span>
                    </div>
                    <h2 className="mt-5 text-xl font-black text-[#073f56]">از اطراف خودت شروع کن</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                      شهر را انتخاب کن، دسته‌بندی را ببین و مستقیم سراغ کالاهای موجود برو.
                    </p>
                    <button
                      onClick={handleOpenLocationModal}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#073f56] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#07526d]"
                    >
                      <MapPin className="h-4 w-4" />
                      انتخاب محدوده
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5">
              <CategorySlider
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
              />
            </section>

            <MarketStoryRail city={effectiveCity} />

            <div className="space-y-5">
              <SponsoredBanner city={effectiveCity} />
              <ValuePropsBanner />
            </div>

            {nearbyStores.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-black text-cyan-700">
                      <Store className="h-4 w-4" />
                      بازار محلی
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-[#073f56]">
                      فروشگاه‌های نزدیک شما
                    </h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      فروشگاه را ببین و برای خرید حضوری راحت‌تر تصمیم بگیر.
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700 sm:block">
                    {nearbyStores.length} فروشگاه
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {nearbyStores.slice(0, 4).map((store) => (
                      <a
                        key={store.id}
                        href={"/stores/" + store.id}
                        className="group rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 text-cyan-700">
                            {store.image_url ? (
                              <img
                                src={store.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Store className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-black text-[#073f56] group-hover:text-cyan-700">
                              {store.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-bold text-slate-500">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {store.address || store.city}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-500">
                          <span>{store.product_count || 0} کالا</span>
                          {Number.isFinite(store.distance_km) && (
                            <span>
                              {store.distance_km < 1
                                ? Math.round(store.distance_km * 1000) + " متر"
                                : store.distance_km.toFixed(1) + " کیلومتر"}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-teal-700">
                            {store.is_verified || store.has_business_license ? (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            ) : null}
                            مشاهده
                            <ArrowLeft className="h-3 w-3" />
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>

                  <div className="min-h-[300px] overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-sm">
                    {(() => {
                      const located = nearbyStores.filter(
                        (s) => s.lat != null && s.lng != null
                      );

                      if (!located.length) {
                        return (
                          <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-center text-sm font-bold text-slate-500">
                            <div>
                              <MapPin className="mx-auto mb-3 h-8 w-8 text-teal-500" />
                              <p>موقعیت دقیق همه فروشگاه‌ها هنوز ثبت نشده است.</p>
                            </div>
                          </div>
                        );
                      }

                      const center = {
                        lat: Number(located[0].lat),
                        lng: Number(located[0].lng),
                      };

                      const results = located.map((s) => ({
                        id: s.id,
                        name: s.name,
                        price: 0,
                        store: s.name,
                        latitude: Number(s.lat),
                        longitude: Number(s.lng),
                        badge:
                          s.is_verified || s.has_business_license
                            ? "تأییدشده"
                            : undefined,
                      }));

                      return <Map center={center} results={results} height="300px" />;
                    })()}
                  </div>
                </div>
              </section>
            )}

            <section className="mt-10">
              <div className="mb-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-black text-teal-700">
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                      کشف کالا
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-[#073f56]">
                      کالاهای موجود در بازار
                    </h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      محدوده موردنظرت را انتخاب کن و بین کالاهای موجود بگرد.
                    </p>
                  </div>
                  <div className="w-full lg:w-80">
                    <SegmentedScope
                      scope={scope}
                      onScopeChange={setScope}
                      city={effectiveCity}
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {hasActiveFilters && (
                  <ActiveFiltersBanner
                    filterCount={filterCount}
                    onClear={handleClearFilters}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && <ErrorBanner onRetry={refetch} />}
              </AnimatePresence>

              {!isLoading && productsCount > 0 && (
                <div className="mb-4">
                  <ResultHeader
                    count={productsCount}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {isLoading && productsCount === 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : !isLoading && productsCount === 0 ? (
                <div className="rounded-[24px] border border-slate-200 bg-white py-12">
                  <EmptyState
                    title="هنوز چیزی این اطراف پیدا نشد"
                    description={
                      hasActiveFilters
                        ? "فیلترها را کمی بازتر کن؛ شاید همان چیزی که می‌خواهی پیدا شود."
                        : "به‌زودی کالاهای تازه‌ای از فروشگاه‌ها اضافه می‌شود."
                    }
                  >
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700"
                      >
                        پاک کردن فیلترها
                      </button>
                    )}
                  </EmptyState>
                </div>
              ) : (
                <>
                  <motion.div
                    className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
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
                    className="mt-6 flex h-20 items-center justify-center"
                  >
                    {isFetchingNextPage && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>در حال بارگذاری…</span>
                      </div>
                    )}
                  </div>

                  {!hasNextPage && productsCount > 0 && !isFetchingNextPage && (
                    <EndOfListMessage />
                  )}
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </HomeErrorBoundary>
  );
}