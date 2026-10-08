import React, { memo, useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, X, Search, UserPlus, Heart, Navigation, Sparkles, Store, Tag, ArrowLeft } from "lucide-react";
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

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: HOME_CONFIG.ANIMATION_STAGGER } } };

const featureCards = [
  { title: "کالای موردنظرت را پیدا کن", text: "نام کالا را جستجو کن و گزینه‌های موجود در فروشگاه‌ها را ببین.", icon: Search, action: "جستجوی کالا", to: "/search" },
  { title: "فروشگاه‌های اطراف را پیدا کن", text: "فروشگاه‌های نزدیک و کالاهای موجود را برای خرید حضوری بررسی کن.", icon: Navigation, action: "اطراف من", to: "/explore" },
  { title: "کالاها را ذخیره کن", text: "محصولات موردپسندت را نشان کن تا بعداً سریع به آن‌ها برگردی.", icon: Heart, action: "نشان‌ها", to: "/saved" },
  { title: "فروشگاهت را ثبت کن", text: "فروشگاه و کالاهایت را معرفی کن تا مشتری‌های اطراف پیدایت کنند.", icon: Store, action: "ثبت فروشگاه", to: "/become-seller" },
  { title: "اگر پیدا نکردی، درخواست بده", text: "اگر کالای موردنظر را در نتایج ندیدی، درخواستت را از مسیر جستجو پیگیری کن.", icon: Tag, action: "جستجوی دوباره", to: "/search" },
  { title: "دستیار خرید", text: "برای پیدا کردن کالا یا انتخاب بهتر، از دستیار کی‌داره کمک بگیر.", icon: Sparkles, action: "دستیار", to: "/ai" },
];

function FeatureBanner({ user }: { user: unknown }) {
  const [index, setIndex] = useState(0);
  const card = featureCards[index];
  const Icon = card.icon;
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % featureCards.length), 5000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="mt-3 sm:mt-5" aria-label="امکانات کی‌داره">
      <div className="relative min-h-[205px] overflow-hidden rounded-[26px] bg-[#073f56] text-white shadow-[0_20px_55px_-32px_rgba(7,63,86,.7)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex min-h-[205px] items-center justify-between gap-6 px-5 py-7 sm:px-8 lg:px-10">
          <AnimatePresence mode="wait">
            <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black ring-1 ring-white/10">کی‌داره</span><span className="text-[10px] font-bold text-cyan-100">خرید حضوری، ساده‌تر</span></div>
              <div className="flex items-start gap-4">
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/10 sm:flex"><Icon className="h-6 w-6" /></div>
                <div><h1 className="text-xl font-black leading-[1.4] sm:text-2xl lg:text-3xl">{card.title}</h1><p className="mt-1.5 max-w-2xl text-xs font-bold leading-6 text-slate-200 sm:text-sm">{card.text}</p>
                  <div className="mt-4 flex flex-wrap gap-2"><a href={card.to} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#073f56] transition hover:-translate-y-0.5 hover:bg-cyan-50">{card.action}<ArrowLeft className="h-4 w-4" /></a>{!user && index === 3 && <a href="/register" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-black text-white hover:bg-white/10"><UserPlus className="h-4 w-4" />ثبت‌نام</a>}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="hidden shrink-0 flex-col items-center gap-4 lg:flex"><div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/10 ring-1 ring-white/10"><Icon className="h-10 w-10 text-cyan-200" /></div><div className="flex gap-1.5" role="tablist" aria-label="امکانات"><button type="button" onClick={() => setIndex((index + featureCards.length - 1) % featureCards.length)} className="h-2 w-2 rounded-full bg-white/30" aria-label="قبلی" />{featureCards.map((item, i) => <button key={item.title} type="button" onClick={() => setIndex(i)} aria-label={item.title} aria-selected={i === index} className={"h-2 rounded-full transition-all " + (i === index ? "w-7 bg-white" : "w-2 bg-white/30")} />)}</div></div>
        </div>
      </div>
    </section>
  );
}

const ActiveFiltersBanner = memo(({ filterCount, onClear }: { filterCount: number; onClear: () => void }) => <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden"><button onClick={onClear} aria-label="پاک کردن فیلترها" className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600"><span>{filterCount} فیلتر فعال</span><X className="h-3.5 w-3.5" /></button></motion.div>);
const ErrorBanner = memo(({ onRetry }: { onRetry: () => void }) => <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5" role="alert"><div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5"><span className="flex items-center gap-2 text-xs font-bold text-rose-600"><AlertCircle className="h-4 w-4" />ارتباط با بازار لحظه‌ای قطع شد.</span><button onClick={onRetry} className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700">تلاش مجدد</button></div></motion.div>);
const EndOfListMessage = memo(() => <div className="flex items-center justify-center gap-3 py-10"><div className="h-px flex-1 bg-slate-200" /><p className="text-xs font-medium text-slate-400">فعلاً همین‌ها بود 🌿</p><div className="h-px flex-1 bg-slate-200" /></div>);

export default function Home() {
  const logic = useHomeLogic();
  const { user, effectiveCity, effectiveDisplay, effectiveProvince, gpsEnabled, manualLocation, search, setSearch, activeCategory, setActiveCategory, scope, setScope, sort, setSort, isLocationModalOpen, setIsLocationModalOpen, handleClearFilters, hasActiveFilters, filterCount, error, refetch, isLoading, allProducts, favoritesSet, toggleFavorite, isFetchingNextPage, hasNextPage, loadMoreRef, selectCity, useGps, gpsLoading, gpsError } = logic;
  const handleOpenLocationModal = useCallback(() => setIsLocationModalOpen(true), [setIsLocationModalOpen]);
  const productsCount = allProducts.length;
  return <HomeErrorBoundary><div dir="rtl" className="min-h-screen bg-[var(--bg-primary)] font-sans text-slate-900">
    <Header user={user} effectiveCity={effectiveCity} effectiveDisplay={effectiveDisplay} gpsEnabled={gpsEnabled} manualLocation={manualLocation} onOpenLocationModal={handleOpenLocationModal} />
    <CityPicker open={isLocationModalOpen} selectedCity={effectiveCity} selectedProvince={effectiveProvince} gpsLoading={gpsLoading} gpsError={gpsError} onClose={() => setIsLocationModalOpen(false)} onSelect={selectCity} onGps={useGps} />
    <main className="pb-24"><div className="mx-auto w-full max-w-[1320px] px-3 sm:px-5 lg:px-6">
      <FeatureBanner user={user} />
      <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:mt-4 sm:p-2.5"><div className="rounded-xl bg-slate-50 p-1"><SearchBar value={search} onChange={setSearch} placeholder="چه کالایی می‌خواهی؟ مثلاً موبایل، لوازم خودرو، پوشاک…" /></div></section>
      <section className="mt-3"><CategorySlider activeCategory={activeCategory} onSelectCategory={setActiveCategory} /></section>
      <section className="mt-5" aria-labelledby="products-title">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Tag className="h-5 w-5" /></div><div><h2 id="products-title" className="text-lg font-black tracking-tight text-[#073f56]">کالاهای موجود</h2><p className="mt-0.5 text-xs font-bold text-slate-500">{effectiveCity ? "گزینه‌های قابل بررسی در " + effectiveCity : "محصولات تازه فروشگاه‌ها"}</p></div></div><div className="w-full sm:w-72"><SegmentedScope scope={scope} onScopeChange={setScope} city={effectiveCity} /></div></div>
        <AnimatePresence>{hasActiveFilters && <ActiveFiltersBanner filterCount={filterCount} onClear={handleClearFilters} />}</AnimatePresence><AnimatePresence>{error && <ErrorBanner onRetry={refetch} />}</AnimatePresence>
        {!isLoading && productsCount > 0 && <div className="mb-4"><ResultHeader count={productsCount} sort={sort} onSortChange={setSort} isLoading={isLoading} /></div>}
        {isLoading && productsCount === 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => <ProductCardSkeleton key={i} />)}</div> : !isLoading && productsCount === 0 ? <div className="rounded-[24px] border border-slate-200 bg-white py-12"><EmptyState title="هنوز کالایی پیدا نشد" description={hasActiveFilters ? "فیلترها را کمی بازتر کن؛ شاید نتیجه پیدا شود." : "به‌زودی کالاهای تازه‌ای از فروشگاه‌ها اضافه می‌شود."}>{hasActiveFilters && <button onClick={handleClearFilters} className="mt-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white">پاک کردن فیلترها</button>}</EmptyState></div> : <><motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" variants={containerVariants} initial="hidden" animate="show">{allProducts.map((p) => <PremiumProductCard key={p.id} product={p} isFavorite={favoritesSet.has(p.id)} onToggleFavorite={toggleFavorite} />)}</motion.div><div ref={loadMoreRef} className="mt-6 flex h-20 items-center justify-center">{isFetchingNextPage && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />در حال بارگذاری…</div>}</div>{!hasNextPage && productsCount > 0 && !isFetchingNextPage && <EndOfListMessage />}</>}
      </section>
    </div></main>
  </div></HomeErrorBoundary>;
}