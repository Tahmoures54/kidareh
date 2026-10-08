import React, { memo, useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, X, Search, UserPlus, Heart, Navigation, Sparkles, Store, Tag, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % featureCards.length),
      4500
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="pt-3 sm:pt-5" aria-label="امکانات کی‌داره">
      <div className="relative overflow-hidden rounded-[28px] border border-cyan-100 bg-gradient-to-br from-[#063b52] via-[#07566c] to-[#08a6a6] px-5 py-5 text-white shadow-[0_24px_60px_-34px_rgba(6,73,94,.7)] sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black ring-1 ring-white/15">
                کی‌داره؟
              </span>
              <span className="text-[10px] font-bold text-cyan-50">ببین کی داره، حضوری بگیر</span>
            </div>
            <h1 className="max-w-2xl text-2xl font-black leading-[1.45] sm:text-3xl lg:text-[36px]">
              خرید حضوری را ساده و سریع پیدا کن
            </h1>
            <p className="mt-2 max-w-2xl text-xs font-bold leading-6 text-cyan-50/90 sm:text-sm">
              کالا را جستجو کن، فروشگاه نزدیکت را پیدا کن و قبل از راه افتادن ببین چه چیزی کجاست.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/search"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#07506a] shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50"
              >
                <Search className="h-4 w-4" />
                جستجوی کالا
              </Link>
              {!user && (
                <Link
                  to="/register"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-black text-white backdrop-blur transition hover:bg-white/15"
                >
                  <UserPlus className="h-4 w-4" />
                  ثبت‌نام
                </Link>
              )}
            </div>
          </div>

          <div className="hidden h-36 w-36 items-center justify-center rounded-[32px] bg-white/10 ring-1 ring-white/15 lg:flex">
            <Icon className="h-16 w-16 text-cyan-50" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {featureCards.map((item, i) => {
          const ItemIcon = item.icon;
          const active = i === index;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => setIndex(i)}
              className={`group min-h-[92px] rounded-2xl border p-3 text-right transition-all duration-200 ${active
                ? "border-cyan-300 bg-cyan-50 shadow-sm"
                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-sm"}`}
              aria-label={item.title}
              aria-pressed={active}
            >
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                <ItemIcon className="h-4 w-4" />
              </div>
              <div className="line-clamp-2 text-[11px] font-black leading-5 text-slate-800">{item.title}</div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
        >
          <span className="truncate text-[11px] font-bold text-slate-500">{card.text}</span>
          <Link to={card.to} className="mr-3 shrink-0 text-[11px] font-black text-cyan-700 hover:text-cyan-900">
            {card.action} ←
          </Link>
        </motion.div>
      </AnimatePresence>
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
      <section className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white"><CategorySlider activeCategory={activeCategory} onSelectCategory={setActiveCategory} /></section>
      <section className="mt-4" aria-labelledby="products-title">
        <div className="mb-3 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Tag className="h-4 w-4" /></div><div><h2 id="products-title" className="text-xl font-black tracking-tight text-[#073f56]">کالاهای موجود</h2><p className="mt-0.5 text-xs font-bold text-slate-500">{effectiveCity ? "گزینه‌های قابل بررسی در " + effectiveCity : "محصولات تازه فروشگاه‌ها"}</p></div></div><div className="w-full sm:w-72"><SegmentedScope scope={scope} onScopeChange={setScope} city={effectiveCity} /></div></div>
        <AnimatePresence>{hasActiveFilters && <ActiveFiltersBanner filterCount={filterCount} onClear={handleClearFilters} />}</AnimatePresence><AnimatePresence>{error && <ErrorBanner onRetry={refetch} />}</AnimatePresence>
        {!isLoading && productsCount > 0 && <div className="mb-4"><ResultHeader count={productsCount} sort={sort} onSortChange={setSort} isLoading={isLoading} /></div>}
        {isLoading && productsCount === 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => <ProductCardSkeleton key={i} />)}</div> : !isLoading && productsCount === 0 ? <div className="rounded-[24px] border border-slate-200 bg-white py-12"><EmptyState title="هنوز کالایی پیدا نشد" description={hasActiveFilters ? "فیلترها را کمی بازتر کن؛ شاید نتیجه پیدا شود." : "به‌زودی کالاهای تازه‌ای از فروشگاه‌ها اضافه می‌شود."}>{hasActiveFilters && <button onClick={handleClearFilters} className="mt-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white">پاک کردن فیلترها</button>}</EmptyState></div> : <><motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" variants={containerVariants} initial="hidden" animate="show">{allProducts.map((p) => <PremiumProductCard key={p.id} product={p} isFavorite={favoritesSet.has(p.id)} onToggleFavorite={toggleFavorite} />)}</motion.div><div ref={loadMoreRef} className="mt-6 flex h-20 items-center justify-center">{isFetchingNextPage && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />در حال بارگذاری…</div>}</div>{!hasNextPage && productsCount > 0 && !isFetchingNextPage && <EndOfListMessage />}</>}
      </section>
    </div></main>
  </div></HomeErrorBoundary>;
}