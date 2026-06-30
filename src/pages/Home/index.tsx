import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, Loader2, AlertCircle, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// --- Hooks & Context ---
import { useAuth } from "../../context/AuthContext";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useInfiniteProducts } from "../../hooks/useInfiniteProducts";
import { useLocalStorage } from "../../hooks/useLocalStorage";

// --- Data & Types ---
import { categoriesData } from "@data/processed/categories";
import { HOME_CONFIG, AppUser } from "./constants";

// --- Components ---
import { HomeErrorBoundary } from "./components/ErrorBoundary";
import { Header, BentoShortcuts } from "./components/HeaderWidgets";
import { PremiumProductCard, ProductCardSkeleton, SegmentedScope } from "./components/ProductSections";
import EmptyState from "../../components/ui/EmptyState";

// ==========================================
// Sub-Component: Category Slider (با قابلیت اسکرول لمسی و موس)
// ==========================================
const CategorySlider = ({ activeCategory, onSelectCategory }: { activeCategory: string | null, onSelectCategory: (cat: string | null) => void }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // منطق کشیدن با موس (Mouse Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    setHasDragged(false); // ریست کردن وضعیت کشیده شدن
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2; // ضریب سرعت اسکرول با موس
    if (Math.abs(walk) > 5) setHasDragged(true); // اگر بیشتر از 5 پیکسل حرکت کرد، یعنی کلیک نیست و درگ است
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  // مدیریت کلیک برای جلوگیری از انتخاب اشتباه هنگام اسکرول
  const handleItemClick = (e: React.MouseEvent, slug: string | null) => {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    onSelectCategory(slug);
  };

  return (
    <motion.section 
      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
      className="mb-6"
    >
      <div className="flex justify-between items-center px-1 mb-3">
        <h2 className="font-extrabold text-base text-[var(--text-primary)]">دسته‌بندی‌ها</h2>
      </div>
      
      <div 
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={`flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory no-scrollbar transition-all ${isDragging ? 'cursor-grabbing snap-none select-none' : 'cursor-grab'}`}
      >
        <button 
          onClick={(e) => handleItemClick(e, null)} 
          className={`flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-2xl whitespace-nowrap transition-all duration-300 snap-start border ${
            activeCategory === null 
              ? "bg-[var(--brand-primary)] text-white border-transparent shadow-md shadow-[var(--brand-glow)]" 
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
          }`}
        >
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${activeCategory === null ? "bg-white/20" : "bg-[var(--bg-primary)] dark:bg-gray-800"}`}>
            <LayoutGrid className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold pointer-events-none">همه آگهی‌ها</span>
        </button>

        {categoriesData.slice(0, 10).map((cat) => {
          const isActive = activeCategory === cat.slug;
          return (
            <button 
              key={cat.slug} 
              onClick={(e) => handleItemClick(e, isActive ? null : cat.slug)} 
              className={`flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-2xl whitespace-nowrap transition-all duration-300 snap-start border ${
                isActive 
                  ? "bg-[var(--brand-primary)] text-white border-transparent shadow-md shadow-[var(--brand-glow)]" 
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isActive ? "bg-white/20" : "bg-[var(--bg-primary)] dark:bg-gray-800"}`}>
                <LayoutGrid className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold pointer-events-none">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
};

// ==========================================
// Main Component: Home
// ==========================================
export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth() as { user: AppUser | null };

  // --- State Management ---
  const [scope, setScope] = useState<"city" | "province" | "all">("city");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [manualLocation, setManualLocation] = useLocalStorage<any>("manual-location", null);
  const [favorites, setFavorites] = useLocalStorage<string[]>("favorites", []);

  // --- Derived State & Callbacks ---
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  
  const toggleFavorite = useCallback((productId: string) => {
    setFavorites(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  }, [setFavorites]);

  const handleCityChange = useCallback((city: string, display: string, province: string) => {
    setManualLocation({ city, display, province });
  }, [setManualLocation]);

  // --- Geolocation & Queries ---
  const { city: realCity, province: realProvince, displayLocation, gpsEnabled } = useGeolocation("تهران");
  
  const effectiveCity = manualLocation?.city || realCity || "تهران";
  const effectiveProvince = manualLocation?.province || realProvince || "";
  const effectiveDisplay = manualLocation?.display || displayLocation || "انتخاب شهر";

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useInfiniteProducts({
    scope, 
    city: scope === "city" ? effectiveCity : undefined, 
    province: scope === "province" ? effectiveProvince : undefined,
    category: activeCategory || undefined, 
    limit: HOME_CONFIG.PRODUCTS_PER_PAGE, 
    sort: "newest",
  });

  const allProducts = useMemo(() => data?.pages.flatMap(p => p.products) ?? [], [data]);
  const totalCount = data?.pages[0]?.total ?? 0;

  // --- Infinite Scroll Observer ---
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: "400px 0px" });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Render ---
  return (
    <HomeErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] transition-colors duration-300 font-sans" dir="rtl">
        
        <Header 
          user={user} 
          effectiveCity={effectiveCity} 
          effectiveDisplay={effectiveDisplay} 
          gpsEnabled={gpsEnabled} 
          manualLocation={manualLocation} 
          onCityChange={handleCityChange} 
        />

        <motion.main 
          initial="hidden" 
          animate="visible" 
          variants={{ visible: { transition: { staggerChildren: HOME_CONFIG.ANIMATION_STAGGER } } }} 
          className="flex-1 px-5 pt-4 pb-32 space-y-6 overflow-hidden"
        >
          
          <BentoShortcuts user={user} />

          <CategorySlider activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

          {/* Product Feed Section */}
          <motion.section variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="space-y-4">
            
            {/* Sticky Filters Header */}
            <div className="sticky top-[75px] z-40 bg-[var(--bg-primary)]/85 backdrop-blur-xl py-3 -mx-5 px-5 border-b border-[var(--border-color)]/30 transition-all">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-black text-lg text-[var(--text-primary)]">
                    بازار {scope === "all" ? "سراسر کشور" : scope === "province" ? effectiveProvince : effectiveCity}
                  </h3>
                  {totalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-bold">
                      {totalCount > 1000 ? "+۱۰۰۰" : totalCount} آگهی
                    </span>
                  )}
                </div>
                
                <button 
                  onClick={() => navigate("/search")} 
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors duration-300 shadow-sm"
                  aria-label="جستجو در آگهی‌ها"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              <SegmentedScope 
                scope={scope} 
                onScopeChange={setScope} 
                city={effectiveCity} 
                province={effectiveProvince} 
              />
            </div>

            {/* Error State */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                    <span className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" /> برقراری ارتباط با سرور با مشکل مواجه شد
                    </span>
                    <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 active:scale-95 transition-transform">
                      تلاش مجدد
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content States */}
            {isLoading && allProducts.length === 0 ? (
              <div className="grid grid-cols-2 gap-4 pt-2">
                {Array.from({ length: HOME_CONFIG.SKELETON_COUNT }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : !isLoading && allProducts.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-10">
                <EmptyState 
                  title="فعلاً چیزی اینجا نیست!" 
                  description="در این محدوده یا دسته‌بندی آگهی جدیدی ثبت نشده است." 
                />
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {allProducts.map((p) => (
                    <PremiumProductCard 
                      key={p.id} 
                      product={p} 
                      isFavorite={favoritesSet.has(p.id)} 
                      onToggleFavorite={toggleFavorite} 
                    />
                  ))}
                </div>

                {/* Loading More Indicator */}
                <div ref={loadMoreRef} className="h-16 flex items-center justify-center mt-4">
                  {isFetchingNextPage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-full shadow-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
                      <span className="text-xs font-bold text-[var(--text-secondary)]">در حال بارگذاری...</span>
                    </motion.div>
                  )}
                </div>

                {!hasNextPage && allProducts.length > 0 && (
                  <div className="py-6 text-center text-xs font-bold text-[var(--text-muted)] flex items-center justify-center gap-3 opacity-60">
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--text-muted)]"></div>
                    پایان آگهی‌ها
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--text-muted)]"></div>
                  </div>
                )}
              </>
            )}
          </motion.section>
        </motion.main>
      </div>
    </HomeErrorBoundary>
  );
}