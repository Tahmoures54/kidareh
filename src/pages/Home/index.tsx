import React, { memo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ChevronLeft, Loader2, MapPin, Search, Store, Tag, X } from "lucide-react";
import { Link } from "react-router-dom";
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
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../../components/ui/PullToRefreshIndicator";

const ActiveFiltersBanner = memo(({ filterCount, onClear }: { filterCount: number; onClear: () => void }) => (
  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
    <button onClick={onClear} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-rose-600">
      {filterCount} فیلتر فعال <X className="h-3.5 w-3.5" />
    </button>
  </motion.div>
));

const ErrorBanner = memo(({ onRetry }: { onRetry: () => void }) => (
  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs font-extrabold text-rose-600"><AlertCircle className="h-4 w-4" />ارتباط با بازار لحظه‌ای قطع شد.</span>
      <button onClick={onRetry} className="rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm">تلاش مجدد</button>
    </div>
  </motion.div>
));

const QuickBenefit = ({ icon: Icon, title, text }: { icon: typeof Search; title: string; text: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 shadow-[0_10px_30px_-28px_rgba(7,63,86,.5)]">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="h-4.5 w-4.5" /></div>
    <div className="min-w-0"><div className="text-xs font-black text-slate-800">{title}</div><div className="mt-0.5 truncate text-[11px] font-bold text-slate-600">{text}</div></div>
  </div>
);

export default function Home() {
  const logic = useHomeLogic();
  const { user, effectiveCity, effectiveDisplay, effectiveProvince, gpsEnabled, manualLocation, search, setSearch, activeCategory, setActiveCategory, scope, setScope, sort, setSort, isLocationModalOpen, setIsLocationModalOpen, handleClearFilters, hasActiveFilters, filterCount, error, refetch, isLoading, allProducts, favoritesSet, toggleFavorite, isFetchingNextPage, hasNextPage, loadMoreRef, selectCity, useGps, gpsLoading, gpsError } = logic;
  const openLocation = useCallback(() => setIsLocationModalOpen(true), [setIsLocationModalOpen]);
  const refreshProducts = useCallback(async () => { await refetch(); }, [refetch]);
  const pullToRefresh = usePullToRefresh(refreshProducts);

  return (
    <HomeErrorBoundary>
      <div dir="rtl" className="min-h-screen bg-[#f6f9fb] font-sans text-slate-900" onTouchStart={pullToRefresh.onTouchStart} onTouchMove={pullToRefresh.onTouchMove} onTouchEnd={pullToRefresh.onTouchEnd}>
        <PullToRefreshIndicator distance={pullToRefresh.pullDistance} refreshing={pullToRefresh.isRefreshing} threshold={pullToRefresh.threshold} />
        <Header user={user} effectiveCity={effectiveCity} effectiveDisplay={effectiveDisplay} gpsEnabled={gpsEnabled} manualLocation={manualLocation} onOpenLocationModal={openLocation} />
        <CityPicker open={isLocationModalOpen} selectedCity={effectiveCity} selectedProvince={effectiveProvince} gpsLoading={gpsLoading} gpsError={gpsError} onClose={() => setIsLocationModalOpen(false)} onSelect={selectCity} onGps={useGps} />

        <main className="pb-28">
          <section className="relative overflow-hidden bg-[#063b52] text-white">
            <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 bottom-[-120px] h-80 w-80 rounded-full bg-teal-400/15 blur-3xl" />
            <div className="relative mx-auto max-w-[1320px] px-4 pb-9 pt-8 sm:px-6 sm:pb-12 sm:pt-11 lg:px-8">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  خرید حضوری، همین اطراف
                </div>
                <h1 className="text-[30px] font-black leading-[1.35] tracking-tight sm:text-4xl lg:text-5xl">قبل از راه افتادن،<br className="sm:hidden" /> ببین <span className="text-cyan-300">کی داره.</span></h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-cyan-50/85 sm:text-base">کالا را پیدا کن، فروشگاه نزدیکت را ببین و برای خرید حضوری مستقیم راه بیفت.</p>
              </div>

              <div className="mt-7 max-w-3xl rounded-[24px] bg-white p-2 shadow-[0_24px_70px_-28px_rgba(0,0,0,.65)]">
                <SearchBar value={search} onChange={setSearch} placeholder="چه چیزی می‌خواهی پیدا کنی؟ مثلاً روغن موتور، کفش، شارژر..." />
                <div className="flex flex-wrap items-center gap-2 px-3 pb-2 pt-1 text-[11px] font-bold text-slate-600">
                  <span className="text-slate-500">جستجوهای سریع:</span>
                  {["روغن موتور", "کفش ورزشی", "شارژر آیفون", "لوازم خودرو"].map((q) => (
                    <button key={q} onClick={() => setSearch(q)} className="rounded-full bg-slate-100 px-2.5 py-1.5 transition hover:bg-cyan-50 hover:text-cyan-700">{q}</button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid max-w-4xl gap-2.5 sm:grid-cols-3">
                <QuickBenefit icon={MapPin} title="نزدیکت را پیدا کن" text={effectiveCity ? `در ${effectiveCity}` : "شهر خودت را انتخاب کن"} />
                <QuickBenefit icon={Tag} title="قیمت را ببین" text="قبل از حرکت بررسی کن" />
                <QuickBenefit icon={Store} title="مستقیم از فروشگاه" text="خرید حضوری و ساده" />
              </div>
            </div>
          </section>

          <div className="mx-auto w-full max-w-[1320px] px-3 sm:px-5 lg:px-8">
            <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_45px_-38px_rgba(7,63,86,.5)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 pt-4">
                <div><h2 className="text-base font-black text-[#073f56]">دسته‌بندی‌ها</h2><p className="mt-1 text-[11px] font-bold text-slate-500">از اینجا سریع‌تر شروع کن</p></div>
                <Link to="/search" className="flex items-center gap-1 text-[11px] font-black text-cyan-700">همه دسته‌ها <ArrowLeft className="h-3.5 w-3.5" /></Link>
              </div>
              <CategorySlider activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
            </section>

            <section className="mt-7" aria-labelledby="products-title">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-cyan-700"><span className="h-2 w-2 rounded-full bg-cyan-500" /><span className="text-[10px] font-black uppercase tracking-wide">Marketplace</span></div>
                  <h2 id="products-title" className="text-2xl font-black tracking-tight text-[#073f56]">کالاهای موجود</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">{effectiveCity ? `انتخاب‌های قابل بررسی در ${effectiveCity}` : "محصولات تازه فروشگاه‌ها"}</p>
                </div>
                <div className="w-full sm:w-72"><SegmentedScope scope={scope} onScopeChange={setScope} city={effectiveCity} /></div>
              </div>

              <AnimatePresence>{hasActiveFilters && <ActiveFiltersBanner filterCount={filterCount} onClear={handleClearFilters} />}</AnimatePresence>
              <AnimatePresence>{error && <ErrorBanner onRetry={refetch} />}</AnimatePresence>

              {!isLoading && allProducts.length > 0 && <div className="mb-4"><ResultHeader count={allProducts.length} sort={sort} onSortChange={setSort} isLoading={isLoading} /></div>}

              {isLoading && allProducts.length === 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
              ) : !isLoading && allProducts.length === 0 ? (
                <div className="rounded-[26px] border border-slate-200 bg-white py-14"><EmptyState title="هنوز کالایی پیدا نشد" description={hasActiveFilters ? "فیلترها را کمی بازتر کن؛ شاید نتیجه پیدا شود." : "به‌زودی کالاهای تازه‌ای از فروشگاه‌ها اضافه می‌شود."}>{hasActiveFilters && <button onClick={handleClearFilters} className="mt-2 rounded-xl bg-cyan-700 px-6 py-2.5 text-sm font-bold text-white">پاک کردن فیلترها</button>}</EmptyState></div>
              ) : (
                <>
                  <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" initial="hidden" animate="show">
                    {allProducts.map((p) => <PremiumProductCard key={p.id} product={p} isFavorite={favoritesSet.has(p.id)} onToggleFavorite={toggleFavorite} />)}
                  </motion.div>
                  <div ref={loadMoreRef} className="mt-7 flex h-16 items-center justify-center">{isFetchingNextPage && <div className="flex items-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />در حال بارگذاری…</div>}</div>
                  {!hasNextPage && <div className="flex items-center gap-3 py-7"><div className="h-px flex-1 bg-slate-200" /><span className="text-xs font-bold text-slate-400">همین‌ها بود 🌿</span><div className="h-px flex-1 bg-slate-200" /></div>}
                </>
              )}
            </section>

            <section className="mb-8 mt-8 overflow-hidden rounded-[28px] bg-gradient-to-l from-[#073f56] to-[#086d78] p-6 text-white shadow-[0_25px_60px_-35px_rgba(7,63,86,.8)] sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="mb-2 text-xs font-black text-cyan-200">فروشنده‌ای؟</div><h2 className="text-xl font-black sm:text-2xl">فروشگاهت را رایگان معرفی کن.</h2><p className="mt-2 max-w-xl text-xs font-bold leading-6 text-cyan-50/80">کالاهایت را ثبت کن تا خریدارهای اطراف راحت‌تر پیدایت کنند.</p></div>
                <Link to={user ? "/become-seller" : "/onboarding?role=seller"} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-[#073f56] transition hover:-translate-y-0.5"><Store className="h-4 w-4" />ثبت فروشگاه <ChevronLeft className="h-4 w-4" /></Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </HomeErrorBoundary>
  );
}
