import {
  Search,
  UserPlus,
  User,
  ChevronLeft,
  Grid3X3,
  MessageCircle,
  HeadphonesIcon,
  Store as StoreIcon,
  TrendingUp,
  MapPin,
  Sparkles,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { categoriesData } from "../data/categories";
import { useGeolocation } from "../hooks/useGeolocation";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";
import CitySelector from "../components/Home/CitySelector";
import MagicMenu from "../components/Home/MagicMenu";
import VirtualProductGrid from "../components/Home/VirtualProductGrid";
import CategoryCarousel from "../components/Home/CategoryCarousel";
import LocationBadge from "../components/Home/LocationBadge";
import HeroSection from "../components/Home/HeroSection";
import EmptyState from "../components/ui/EmptyState";

// آیکون‌ها
const iconMap: Record<string, React.ComponentType<any>> = {
  Smartphone: () => null,
  Building2: () => null,
  Car: () => null,
  Sofa: () => null,
  ShoppingBag: () => null,
  Factory: () => null,
  Hammer: () => null,
  Briefcase: () => null,
  Tractor: () => null,
  Palette: () => null,
  LayoutGrid: () => null,
};

// اکشن‌های منوی شناور (بدون AI)
const magicActions = [
  { icon: Search, label: "جستجوی کالا", path: "/search", color: "bg-teal-500" },
  { icon: Grid3X3, label: "دسته‌بندی‌ها", path: "/categories", color: "bg-indigo-500" },
  { icon: MessageCircle, label: "پیام‌ها", path: "/messages", color: "bg-amber-500" },
  { icon: StoreIcon, label: "فروشگاه‌ها", path: "/stores", color: "bg-emerald-500" },
  { icon: TrendingUp, label: "کسب درآمد", path: "/wallet", color: "bg-rose-500" },
  { icon: HeadphonesIcon, label: "پشتیبانی", path: "/support", color: "bg-purple-500" },
];

type LocationData = {
  city: string;
  province: string;
  display: string;
} | null;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function Home() {
  const { user } = useAuth();
  const [searchScope, setSearchScope] = useState<"city" | "province" | "all">("city");
  const [showMagicMenu, setShowMagicMenu] = useState(false);

  const {
    city: realCity,
    province: realProvince,
    displayLocation,
    gpsEnabled,
  } = useGeolocation("تهران");

  const [manualLocation, setManualLocation] = useState<LocationData>(null);

  const effectiveCity = manualLocation?.city || realCity || "";
  const effectiveProvince = manualLocation?.province || realProvince || "";
  const effectiveDisplay = manualLocation?.display || displayLocation || effectiveCity || "نامشخص";

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteProducts({
    scope: searchScope,
    city: searchScope === "city" ? effectiveCity : undefined,
    province: searchScope === "province" ? effectiveProvince : undefined,
    limit: 20,
  });

  const allProducts = data?.pages.flatMap((page: any) => page.products) || [];
  const totalCount = data?.pages[0]?.total || 0;

  const handleCityChange = (city: string, display: string, province: string) => {
    setManualLocation({ city, province, display });
  };

  const scopeLabel = useMemo(() => {
    if (searchScope === "all") return "سراسر کشور";
    if (searchScope === "province") return effectiveProvince;
    return effectiveCity;
  }, [searchScope, effectiveCity, effectiveProvince]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 pb-32"
    >
      {/* ==================== HEADER ==================== */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 shadow-sm sticky top-0 z-30 border-b border-gray-100"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <Link to="/" aria-label="صفحه اصلی">
              <motion.div
                whileHover={{ rotate: 6, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200 flex-shrink-0"
              >
                <Search className="text-white w-5 h-5" />
              </motion.div>
            </Link>

            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[9px] text-teal-600 font-black tracking-wider">سوپر اپلیکیشن</span>
              <Link to="/">
                <h1 className="text-xl font-black text-gray-900">کی داره؟</h1>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!user ? (
              <Link
                to="/login"
                className="flex items-center gap-1.5 bg-teal-50 text-teal-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">ورود</span>
              </Link>
            ) : (
              <Link
                to="/profile"
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-100 to-cyan-100 border border-teal-200 flex items-center justify-center relative hover:shadow-md transition-all active:scale-95"
              >
                <User className="w-5 h-5 text-teal-600" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              </Link>
            )}
          </div>
        </div>

        <CitySelector
          selectedCity={effectiveCity}
          displayLocation={effectiveDisplay}
          gpsEnabled={gpsEnabled && !manualLocation}
          onCityChange={handleCityChange}
          variant="compact"
        />
      </motion.header>

      {/* ==================== MAIN CONTENT ==================== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 space-y-5 px-4 pt-5"
      >
        <motion.div variants={itemVariants}>
          <HeroSection />
        </motion.div>

        <motion.div variants={itemVariants}>
          <LocationBadge scope={searchScope} location={scopeLabel} totalCount={totalCount} />
        </motion.div>

        {/* دسته‌بندی‌ها */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></span>
              دسته‌بندی‌ها
            </h2>
            <Link to="/categories" className="text-xs text-teal-600 font-bold flex items-center gap-1 hover:gap-2 transition-all group">
              مشاهده همه
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
          <CategoryCarousel categories={categoriesData.slice(0, 10)} iconMap={iconMap} />
        </motion.div>

        {/* تب‌های محدوده جستجو */}
        <motion.div variants={itemVariants} className="flex gap-2 bg-gradient-to-r from-gray-50 to-gray-100/50 p-1.5 rounded-xl border border-gray-100 sticky top-20 z-20">
          {[
            { value: "city" as const, label: "شهر من", icon: MapPin },
            { value: "province" as const, label: "استان من" },
            { value: "all" as const, label: "سراسر کشور" },
          ].map((tab) => (
            <motion.button
              key={tab.value}
              onClick={() => setSearchScope(tab.value)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                searchScope === tab.value ? "bg-white text-teal-600 shadow-md" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.value === "city" && <MapPin className="w-3.5 h-3.5" />}
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* نوار جستجو */}
        <motion.div variants={itemVariants}>
          <Link to="/search" className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-teal-200 transition-all active:scale-[0.98]">
            <Search className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-400 flex-1 text-right">دنبال چی می‌گردی؟</span>
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </Link>
        </motion.div>

        {/* محصولات */}
        <motion.div variants={itemVariants} className="space-y-4 mt-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></span>
              آخرین کالاها
              {totalCount > 0 && <span className="text-sm text-gray-400 font-normal">{totalCount.toLocaleString("fa-IR")}</span>}
            </h3>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                <p className="text-red-700 text-sm font-bold mb-2">خطا در بارگذاری</p>
                <button onClick={() => refetch()} className="text-xs text-red-600 hover:text-red-700 font-bold underline">تلاش دوباره</button>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isLoading && allProducts.length === 0 && (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-gradient-to-br from-gray-200 to-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!isLoading && allProducts.length === 0 && !error && (
              <EmptyState
                title="محصولی یافت نشد"
                description={`هنوز محصولی در ${scopeLabel} ثبت نشده است`}
                action={{ label: "جستجوی پیشرفته", onClick: () => (window.location.href = "/search") }}
              />
            )}
          </AnimatePresence>

          {allProducts.length > 0 && (
            <VirtualProductGrid
              products={allProducts}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage ?? false}
              fetchNextPage={fetchNextPage}
              error={error}
              onRetry={() => refetch()}
            />
          )}
        </motion.div>
      </motion.div>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-white border-t border-gray-100 mt-8 py-4 px-4">
        <div className="text-center text-xs text-gray-500 space-y-2">
          <p className="font-medium">© ۱۴۰۳ کی داره - تمامی حقوق محفوظ است</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/terms" className="hover:text-teal-600 transition-colors font-medium">قوانین</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-teal-600 transition-colors font-medium">حریم خصوصی</Link>
            <span>•</span>
            <Link to="/support" className="hover:text-teal-600 transition-colors font-medium">پشتیبانی</Link>
          </div>
        </div>
      </footer>

      {/* ==================== دکمه ثابت دستیار هوشمند (پایین وسط) ==================== */}
      <Link
        to="/ai"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3.5 rounded-2xl shadow-xl shadow-violet-300 active:scale-95 transition-all"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-bold text-sm">دستیار هوشمند</span>
      </Link>

      {/* ==================== منوی شناور (گوی) - پایین راست ==================== */}
      <div className="fixed bottom-6 right-6 z-50">
        <MagicMenu
          actions={magicActions}
          isOpen={showMagicMenu}
          onToggle={() => setShowMagicMenu(!showMagicMenu)}
        />
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
}