import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import {
  Search as SearchIcon,
  ArrowRight,
  SlidersHorizontal,
  MapPin,
  Store,
  Phone,
  Navigation,
  Map as MapIcon,
  List,
  Sparkles,
  X,
  Filter,
  Share2,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
  Check,
  Star,
  Eye,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Virtuoso } from "react-virtuoso";
import { useInfiniteProducts } from "../hooks/useInfiniteProducts";
import { getBadgeStyle, formatPrice, truncateText } from "../utils";
import { getCategoryTextByValue } from "../data/categories";
import Map from "../components/Map";

// ==================== TYPES ====================

type SortType = "nearest" | "cheapest" | "newest";
type ViewMode = "list" | "map";
type FilterScope = "all" | "city" | "province";

interface ProductResult {
  id: number;
  name: string;
  store_name: string;
  distance: string;
  distanceMeters?: number;
  price: string | number;
  status: string;
  updated: string;
  image_url: string;
  rating: number;
  badge: string | null;
  lat?: number;
  lng?: number;
  city?: string;
  views?: number;
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface SearchFilters {
  minPrice: string;
  maxPrice: string;
  selectedRadius: string;
  onlyAvailable: boolean;
  sortBy: SortType;
}

interface SearchState {
  query: string;
  debouncedQuery: string;
  isSearching: boolean;
  showFilters: boolean;
  viewMode: ViewMode;
  toast: string;
  recentSearches: string[];
  locationLoading: boolean;
}

// ==================== CONSTANTS ====================

const FALLBACK_IMAGE =
  "https://placehold.co/200x200/f3f4f6/a1a1aa?text=No+Image";
const DEBOUNCE_DELAY = 350;
const TOAST_DURATION = 1600;
const MAX_RECENT_SEARCHES = 10;
const DEFAULT_LAT = 35.6892;
const DEFAULT_LNG = 51.389;
const GEOLOCATION_TIMEOUT = 10000;
const MAP_HEIGHT = "60vh";
const LIST_HEIGHT = "68vh";

// ==================== HELPERS ====================

/**
 * محاسبه فاصله بین دو نقطه جغرافیایی
 */
function calculateDistanceMeters(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371000; // شعاع زمین بر حسب متر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * فرمت فاصله به صورت فارسی
 */
function formatDistanceFa(meters?: number | null): string {
  if (meters == null) return "نامشخص";
  if (meters < 1000) {
    return `${meters.toLocaleString("fa-IR")} متر`;
  }
  return `${(meters / 1000)
    .toFixed(1)
    .replace(".", "٫")} کیلومتر`;
}

/**
 * تجزیه قیمت
 */
function parsePrice(price: string | number): number {
  if (typeof price === "number") return price;
  return Number(String(price).replace(/[^\d]/g, "")) || 0;
}

/**
 * بررسی وضعیت موجودی
 */
function isAvailable(status: string): boolean {
  const normalized = (status || "").trim().toLowerCase();
  return (
    normalized === "موجود" ||
    normalized === "available" ||
    normalized === "in_stock"
  );
}

/**
 * دریافت متن وضعیت
 */
function getStatusText(status: string): string {
  return isAvailable(status) ? "موجود" : status || "نامشخص";
}

/**
 * بررسی اینکه آیا کالا امروز ثبت شده است
 */
function isToday(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  return (
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate()
  );
}

// ==================== COMPONENTS ====================

/**
 * Toast notification
 */
interface ToastProps {
  message: string;
}

function Toast({ message }: ToastProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="fixed top-4 right-1/2 translate-x-1/2 z-[90] bg-gray-900/90 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl inline-flex items-center gap-2 border border-white/10"
    >
      <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
      {message}
    </motion.div>
  );
}

/**
 * Product Card Component
 */
interface ProductCardProps {
  product: ProductResult;
  index: number;
  onShare: (product: ProductResult) => Promise<void>;
  onNavigate: (product: ProductResult) => void;
}

function ProductCard({
  product,
  index,
  onShare,
  onNavigate,
}: ProductCardProps): JSX.Element {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await onShare(product);
    } finally {
      setIsSharing(false);
    }
  };

  const hasBadge = !!product.badge;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.02, 0.2),
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className={`bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group ${
        hasBadge
          ? "border border-amber-200 ring-1 ring-amber-100/50"
          : "border border-gray-100"
      }`}
    >
      {/* Badge */}
      {hasBadge && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`absolute top-0 right-0 px-3 py-1 rounded-bl-2xl text-[10px] font-black z-10 shadow-sm ${getBadgeStyle(
            product.badge!
          )}`}
        >
          {product.badge}
        </motion.div>
      )}

      {/* Main content */}
      <Link to={`/product/${product.id}`} className="flex gap-4">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-50">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover border border-gray-100 group-hover:scale-110 transition-transform duration-500"
          />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
          <div>
            {/* Title */}
            <h3
              className={`font-bold text-gray-900 text-[13px] line-clamp-2 leading-snug mb-1 group-hover:text-indigo-600 transition-colors ${
                hasBadge ? "mt-3" : ""
              }`}
            >
              {truncateText(product.name, 60)}
            </h3>

            {/* Store & Rating */}
            <div className="flex items-center text-[10px] text-gray-500 mb-2 font-medium gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-indigo-400" strokeWidth={2} />
                <span className="truncate max-w-[100px]">
                  {product.store_name}
                </span>
              </div>
              <span className="text-amber-500 font-bold inline-flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400" strokeWidth={0} />
                {product.rating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 flex items-center mb-1">
                <MapPin className="w-3 h-3 ml-0.5 text-teal-500" strokeWidth={2.5} />
                {product.distance}
              </span>
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-l from-teal-600 to-emerald-500 text-sm">
                {formatPrice(product.price)}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${
                  product.status === "موجود"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {product.status}
              </span>
              <span className="text-[9px] text-gray-400 flex items-center font-medium">
                <span
                  className={`w-1.5 h-1.5 rounded-full ml-1 ${
                    product.updated === "امروز"
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                />
                {product.updated}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Action buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-100 mt-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate(product)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-[11px] font-bold hover:bg-indigo-100 active:scale-95 transition-all"
        >
          <Navigation className="w-4 h-4" strokeWidth={2} />
          مسیریابی
        </motion.button>

        <Link
          to={`/product/${product.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-teal-50 text-teal-700 rounded-xl text-[11px] font-bold hover:bg-teal-100 active:scale-95 transition-all"
        >
          <Eye className="w-4 h-4" strokeWidth={2} />
          مشاهده
        </Link>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          disabled={isSharing}
          className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-100 active:scale-95 transition-all disabled:opacity-60"
          aria-label="اشتراک‌گذاری"
        >
          {isSharing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" strokeWidth={2} />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * Featured Products Carousel
 */
interface FeaturedCarouselProps {
  products: ProductResult[];
}

function FeaturedCarousel({ products }: FeaturedCarouselProps): JSX.Element {
  if (products.length === 0) return <></>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="-mx-4 px-4"
    >
      <div className="flex items-center gap-1.5 mb-3">
        <motion.span
          animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TrendingUp className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
        </motion.span>
        <h2 className="text-sm font-black text-gray-900">ویترین ویژه</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {products.slice(0, 5).map((product) => (
          <motion.div
            key={`featured-${product.id}`}
            whileHover={{ y: -8 }}
            className="min-w-[260px] shrink-0"
          >
            <Link
              to={`/product/${product.id}`}
              className="block bg-gradient-to-b from-white to-gray-50 rounded-2xl p-3 shadow-md border border-amber-200/60 relative overflow-hidden hover:shadow-lg transition-all group h-full"
            >
              {product.badge && (
                <div
                  className={`absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl text-[10px] font-black z-10 shadow-sm ${getBadgeStyle(
                    product.badge
                  )}`}
                >
                  {product.badge}
                </div>
              )}

              <div className="flex gap-3 mt-1">
                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                  className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-200 group-hover:scale-110 transition-transform duration-500"
                />

                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h3 className="font-bold text-gray-900 text-xs line-clamp-2 leading-snug mb-1.5">
                    {truncateText(product.name, 50)}
                  </h3>
                  <span className="font-black text-teal-600 text-sm">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Skeleton loader
 */
function ProductSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-4 animate-pulse">
      <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-100 rounded-xl shrink-0" />
      <div className="flex-1 py-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded-md w-full" />
        <div className="h-3 bg-gray-100 rounded-md w-2/3" />
        <div className="h-5 bg-gray-200 rounded-md w-1/2" />
      </div>
    </div>
  );
}

/**
 * Empty State
 */
interface EmptyStateProps {
  type: "no_results" | "no_search";
}

function EmptyState({ type }: EmptyStateProps): JSX.Element {
  const isNoResults = type === "no_results";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-14 bg-white rounded-3xl border border-dashed border-gray-300"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm"
      >
        <SearchIcon className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
      </motion.div>

      <h3 className="text-gray-900 font-black text-sm mb-1.5">
        {isNoResults ? "نتیجه‌ای یافت نشد" : "چه جستجو کنیم؟"}
      </h3>

      <p className="text-[11px] text-gray-500 font-medium max-w-[220px] mx-auto leading-relaxed">
        {isNoResults
          ? "موردی با این مشخصات پیدا نشد. فیلترها را تغییر دهید."
          : "شروع کنید به جستجو برای پیدا کردن کالاهای مورد نظر."}
      </p>
    </motion.div>
  );
}

/**
 * Filter Panel
 */
interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onClose: () => void;
  activeCount: number;
}

function FilterPanel({
  filters,
  onFiltersChange,
  onClose,
  activeCount,
}: FilterPanelProps): JSX.Element {
  const handleReset = () => {
    onFiltersChange({
      minPrice: "",
      maxPrice: "",
      selectedRadius: "all",
      onlyAvailable: false,
      sortBy: "newest",
    });
  };

  const radiusOptions = [
    { val: "all", label: "همه" },
    { val: "1", label: "تا ۱ کیلومتر" },
    { val: "5", label: "تا ۵ کیلومتر" },
    { val: "10", label: "تا ۱۰ کیلومتر" },
  ];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="overflow-hidden"
    >
      <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" strokeWidth={2.5} />
            فیلترهای پیشرفته
            {activeCount > 0 && (
              <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md">
                {activeCount}
              </span>
            )}
          </h3>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="text-[11px] font-black text-red-500 hover:bg-red-50 px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
            پاک‌کردن
          </motion.button>
        </div>

        {/* Price range */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="text-xs font-bold text-gray-700 block mb-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" strokeWidth={2.5} />
            محدوده قیمت
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) =>
                onFiltersChange({ minPrice: e.target.value })
              }
              placeholder="از (تومان)"
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              dir="ltr"
            />
            <span className="text-gray-400 font-bold">-</span>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) =>
                onFiltersChange({ maxPrice: e.target.value })
              }
              placeholder="تا (تومان)"
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              dir="ltr"
            />
          </div>
        </motion.div>

        {/* Distance radius */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className="text-xs font-bold text-gray-700 block mb-2 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-500" strokeWidth={2.5} />
            فاصله از من
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {radiusOptions.map((option) => (
              <motion.button
                key={option.val}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  onFiltersChange({ selectedRadius: option.val })
                }
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                  filters.selectedRadius === option.val
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Only available toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between pt-2"
        >
          <span className="text-xs font-bold text-gray-700">
            فقط کالاهای موجود
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={filters.onlyAvailable}
              onChange={(e) =>
                onFiltersChange({ onlyAvailable: e.target.checked })
              }
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner" />
          </label>
        </motion.div>

        {/* Apply button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-xl text-sm font-black hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all shadow-md"
        >
          اعمال فیلترها
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * Recent Searches
 */
interface RecentSearchesProps {
  searches: string[];
  onSearch: (query: string) => void;
  onClear: () => void;
}

function RecentSearches({
  searches,
  onSearch,
  onClear,
}: RecentSearchesProps): JSX.Element {
  if (searches.length === 0) return <></>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400" strokeWidth={2} />
          جستجوهای اخیر
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClear}
          className="text-[11px] text-red-500 font-black bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
        >
          پاک کردن
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-2">
        {searches.map((item, i) => (
          <motion.button
            key={`${item}-${i}`}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSearch(item)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-medium text-gray-700 shadow-sm hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-95"
          >
            {item}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Smart Suggestion Card
 */
function SmartSuggestion(): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-50 to-teal-50 rounded-3xl p-5 border border-indigo-100/50 shadow-sm relative overflow-hidden group"
    >
      {/* Decorative blurs */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-200 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        className="absolute -left-6 -bottom-6 w-24 h-24 bg-teal-200 rounded-full blur-3xl"
      />

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-sm font-black text-indigo-900 mb-3 flex items-center gap-1.5">
          <motion.span
            animate={{ rotate: [0, 15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={2} />
          </motion.span>
          پیشنهاد هوشمند کی‌داره
        </h3>

        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-50"
          >
            <SearchIcon className="w-6 h-6 text-indigo-600" strokeWidth={2} />
          </motion.div>

          <div>
            <p className="text-[13px] text-gray-800 font-bold mb-1">
              نام کالا + برند + مدل را بنویس
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              نتایج دقیق‌تر و نزدیک‌تر می‌گیری.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function Search(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== URL params =====
  const categoryParam = searchParams.get("category") || "";
  const qParam = searchParams.get("q") || "";
  const sortParam = (searchParams.get("sort") as SortType | null) || "newest";
  const onlyAvailableParam = searchParams.get("onlyAvailable") === "1";
  const minPriceParam = searchParams.get("minPrice") || "";
  const maxPriceParam = searchParams.get("maxPrice") || "";
  const radiusParam = searchParams.get("radius") || "all";
  const viewParam = (searchParams.get("view") as ViewMode | null) || "list";

  // ===== Local state =====
  const [state, setState] = useState<SearchState>({
    query: qParam,
    debouncedQuery: qParam,
    isSearching: !!qParam || !!categoryParam,
    showFilters: false,
    viewMode: viewParam,
    toast: "",
    recentSearches: [],
    locationLoading: true,
  });

  const [filters, setFilters] = useState<SearchFilters>({
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    selectedRadius: radiusParam,
    onlyAvailable: onlyAvailableParam,
    sortBy: sortParam,
  });

  const [userLocation, setUserLocation] = useState<UserLocation>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  // ===== Refs =====
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== State updater =====
  const updateState = useCallback((updates: Partial<SearchState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  // ===== Debounce search =====
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      updateState({ debouncedQuery: state.query.trim() });
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [state.query, updateState]);

  // ===== Toast auto-close =====
  useEffect(() => {
    if (!state.toast) return;

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      updateState({ toast: "" });
    }, TOAST_DURATION);

    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [state.toast, updateState]);

  // ===== Load recent searches =====
  useEffect(() => {
    try {
      const saved = localStorage.getItem("recentSearches");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          updateState({
            recentSearches: parsed
              .filter((s) => typeof s === "string" && s.trim())
              .slice(0, MAX_RECENT_SEARCHES),
          });
        }
      }
    } catch (error) {
      console.warn("Failed to load recent searches:", error);
    }
  }, [updateState]);

  // ===== Geolocation =====
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      updateState({ locationLoading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        updateState({ locationLoading: false });
      },
      (error) => {
        console.warn("Geolocation error:", error);
        updateState({ locationLoading: false });
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT,
        maximumAge: 30000,
      }
    );
  }, [updateState]);

  // ===== URL sync =====
  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    // Sort
    if (filters.sortBy !== "newest") {
      next.set("sort", filters.sortBy);
    } else {
      next.delete("sort");
    }

    // Filters
    if (filters.onlyAvailable) {
      next.set("onlyAvailable", "1");
    } else {
      next.delete("onlyAvailable");
    }

    if (filters.minPrice) {
      next.set("minPrice", filters.minPrice);
    } else {
      next.delete("minPrice");
    }

    if (filters.maxPrice) {
      next.set("maxPrice", filters.maxPrice);
    } else {
      next.delete("maxPrice");
    }

    if (filters.selectedRadius !== "all") {
      next.set("radius", filters.selectedRadius);
    } else {
      next.delete("radius");
    }

    if (state.viewMode !== "list") {
      next.set("view", state.viewMode);
    } else {
      next.delete("view");
    }

    setSearchParams(next, { replace: true });
  }, [filters, state.viewMode, setSearchParams, searchParams]);

  // ===== Event handlers =====
  const saveRecentSearch = useCallback((term: string) => {
    const v = term.trim();
    if (!v) return;

    setState((prev) => {
      const updated = [v, ...prev.recentSearches.filter((s) => s !== v)].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      localStorage.setItem("recentSearches", JSON.stringify(updated));
      return { ...prev, recentSearches: updated };
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = state.query.trim();
    if (!q && !categoryParam) return;

    updateState({ isSearching: true });

    const next = new URLSearchParams(searchParams);
    if (q) {
      next.set("q", q);
      saveRecentSearch(q);
    } else {
      next.delete("q");
    }
    setSearchParams(next);
  };

  const handleClearSearch = () => {
    updateState({
      query: "",
      debouncedQuery: "",
      isSearching: false,
    });

    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("category");
    setSearchParams(next);
  };

  const handleShare = async (product: ProductResult) => {
    const url = `${window.location.origin}/product/${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `${product.name} در ${product.store_name}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        updateState({ toast: "لینک کپی شد" });
      }
    } catch (error) {
      console.warn("Share error:", error);
    }
  };

  const handleNavigate = (product: ProductResult) => {
    if (!product.lat || !product.lng) {
      updateState({ toast: "مختصات فروشگاه ثبت نشده" });
      return;
    }

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${product.lat},${product.lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ===== Data fetch =====
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useInfiniteProducts({
    enabled: state.isSearching,
    limit: 20,
    q: state.debouncedQuery || undefined,
    category: categoryParam || undefined,
    scope: (filters.selectedRadius === "all" ? "all" : filters.selectedRadius === "1" ? "city" : "province") as FilterScope,
    city: "تهران",
    sort: filters.sortBy,
    onlyAvailable: filters.onlyAvailable,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    radiusKm:
      filters.selectedRadius === "all"
        ? undefined
        : Number(filters.selectedRadius),
    lat: userLocation.lat,
    lng: userLocation.lng,
  });

  // ===== Format products =====
  const formatProducts = useCallback(
    (rawProducts: any[]): ProductResult[] =>
      rawProducts.map((p) => {
        const meters = calculateDistanceMeters(
          userLocation.lat,
          userLocation.lng,
          p.lat,
          p.lng
        );

        return {
          id: Number(p.id),
          name: String(p.name || "کالا"),
          store_name: String(p.store_name || "فروشگاه محلی"),
          distance: formatDistanceFa(meters),
          distanceMeters: meters ?? undefined,
          price: p.price ?? 0,
          status: getStatusText(String(p.status || "")),
          updated: isToday(p.created_at) ? "امروز" : "اخیر",
          image_url: p.image_url || FALLBACK_IMAGE,
          rating: Number(p.rating ?? 4.5),
          badge: p.badge || null,
          lat: p.lat,
          lng: p.lng,
          city: p.city,
          views: Number(p.views ?? 0),
        };
      }),
    [userLocation]
  );

  // ===== Memoized values =====
  const allProducts = useMemo(() => {
    if (!data?.pages) return [];
    const flat = data.pages.flatMap((page) => page.products || []);
    return formatProducts(flat);
  }, [data, formatProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    if (filters.minPrice) {
      const min = Number(filters.minPrice) || 0;
      result = result.filter((p) => parsePrice(p.price) >= min);
    }

    if (filters.maxPrice) {
      const max = Number(filters.maxPrice) || Number.MAX_SAFE_INTEGER;
      result = result.filter((p) => parsePrice(p.price) <= max);
    }

    if (filters.onlyAvailable) {
      result = result.filter((p) => p.status === "موجود");
    }

    if (filters.selectedRadius !== "all") {
      const km = Number(filters.selectedRadius);
      if (Number.isFinite(km)) {
        result = result.filter(
          (p) => (p.distanceMeters ?? Infinity) <= km * 1000
        );
      }
    }

    // Apply sort
    if (filters.sortBy === "nearest") {
      result.sort(
        (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)
      );
    } else if (filters.sortBy === "cheapest") {
      result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else {
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [allProducts, filters]);

  const featuredProducts = useMemo(
    () => filteredProducts.filter((p) => !!p.badge),
    [filteredProducts]
  );

  const activeFiltersCount = useMemo(
    () =>
      [
        filters.minPrice,
        filters.maxPrice,
        filters.selectedRadius !== "all",
        filters.onlyAvailable,
      ].filter(Boolean).length,
    [filters]
  );

  // ===== Render =====
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-gray-50 pb-20"
      dir="rtl"
    >
      {/* Toast */}
      <AnimatePresence>
        {state.toast && <Toast message={state.toast} />}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 shadow-sm sticky top-0 z-20 rounded-b-3xl border-b border-gray-100/50">
        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all shrink-0"
            aria-label="بازگشت"
          >
            <ArrowRight className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
          </motion.button>

          <motion.form
            onSubmit={handleSearch}
            className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 shadow-inner relative focus-within:bg-white focus-within:border-indigo-200 focus-within:ring-2 focus-within:ring-indigo-50 transition-all"
            layout
          >
            <SearchIcon className="w-5 h-5 text-indigo-500 ml-3 shrink-0" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              placeholder="دنبال چی می‌گردی؟"
              className="bg-transparent border-none outline-none flex-1 text-sm text-gray-900 placeholder-gray-400 w-full"
              value={state.query}
              onChange={(e) =>
                updateState({ query: e.target.value })
              }
              autoFocus={!categoryParam}
            />
            <AnimatePresence>
              {state.query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute left-3 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="پاک کردن"
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.form>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateState({ showFilters: !state.showFilters })}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center relative active:scale-95 transition-all font-black ${
              state.showFilters
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100"
            }`}
            aria-label="فیلترها"
          >
            <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />
            {activeFiltersCount > 0 && !state.showFilters && (
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-md"
              >
                {activeFiltersCount}
              </motion.span>
            )}
          </motion.button>
        </motion.div>

        {/* Filter panel */}
        <AnimatePresence>
          {state.showFilters && (
            <FilterPanel
              filters={filters}
              onFiltersChange={updateFilters}
              onClose={() => updateState({ showFilters: false })}
              activeCount={activeFiltersCount}
            />
          )}
        </AnimatePresence>

        {/* Sort & View toggle */}
        {state.isSearching && !state.showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between mt-2 gap-2"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
              {categoryParam && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("category");
                    setSearchParams(next);
                    if (!state.query.trim()) {
                      updateState({ isSearching: false });
                    }
                  }}
                  className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-[11px] font-black border border-indigo-100 flex items-center gap-1.5"
                >
                  {getCategoryTextByValue(categoryParam)}
                  <X className="w-3 h-3 bg-indigo-200 rounded-full text-indigo-800" strokeWidth={3} />
                </motion.button>
              )}

              {[
                { id: "nearest", label: "نزدیک‌ترین" },
                { id: "cheapest", label: "ارزان‌ترین" },
                { id: "newest", label: "جدیدترین" },
              ].map((sort) => (
                <motion.button
                  key={sort.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    updateFilters({
                      sortBy: sort.id as SortType,
                    })
                  }
                  className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                    filters.sortBy === sort.id
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 border border-gray-200"
                  }`}
                >
                  {sort.label}
                </motion.button>
              ))}
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 shadow-inner">
              {[
                { mode: "list", icon: List },
                { mode: "map", icon: MapIcon },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.mode}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      updateState({ viewMode: item.mode as ViewMode })
                    }
                    className={`p-1.5 rounded-lg transition-all ${
                      state.viewMode === item.mode
                        ? "bg-white shadow-sm text-indigo-600"
                        : "text-gray-500"
                    }`}
                    aria-label={
                      item.mode === "list" ? "نمای لیست" : "نمای نقشه"
                    }
                  >
                    <Icon className="w-4 h-4" strokeWidth={2.5} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </header>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 px-4 py-6 overflow-y-auto"
      >
        {!state.isSearching ? (
          // Initial state
          <div className="space-y-8">
            <RecentSearches
              searches={state.recentSearches}
              onSearch={(query) => {
                updateState({
                  query,
                  debouncedQuery: query,
                  isSearching: true,
                });
                saveRecentSearch(query);

                const next = new URLSearchParams(searchParams);
                next.set("q", query);
                setSearchParams(next);
              }}
              onClear={() => {
                updateState({ recentSearches: [] });
                localStorage.removeItem("recentSearches");
              }}
            />

            <SmartSuggestion />
          </div>
        ) : (
          // Search results
          <div className="space-y-6">
            {/* Featured section */}
            {featuredProducts.length > 0 &&
              state.viewMode === "list" &&
              !isLoading && (
                <FeaturedCarousel products={featuredProducts} />
              )}

            {/* Results header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-900">
                همه نتایج
                {!isLoading && (
                  <span className="text-xs font-normal text-gray-500 mr-2">
                    ({filteredProducts.length.toLocaleString("fa-IR")} کالا)
                  </span>
                )}
              </h2>

              {state.locationLoading && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-[11px] text-gray-400 inline-flex items-center gap-1"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  دریافت موقعیت...
                </motion.span>
              )}
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 bg-white rounded-3xl border border-red-100"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-10 h-10 text-red-400 mx-auto mb-3"
                >
                  <AlertCircle className="w-10 h-10" strokeWidth={1.5} />
                </motion.div>
                <p className="text-sm text-gray-600 mb-4 font-medium">
                  خطا در دریافت اطلاعات
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => refetch()}
                  className="text-xs font-black text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                  تلاش مجدد
                </motion.button>
              </motion.div>
            )}

            {/* Empty state */}
            {!isLoading && !error && filteredProducts.length === 0 && (
              <EmptyState type="no_results" />
            )}

            {/* Map view */}
            {state.viewMode === "map" &&
              !isLoading &&
              filteredProducts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl overflow-hidden border border-gray-200 shadow-sm relative z-0`}
                  style={{ height: MAP_HEIGHT }}
                >
                  <Map
                    center={userLocation}
                    results={filteredProducts}
                  />
                </motion.div>
              )}

            {/* List view */}
            {state.viewMode === "list" &&
              !isLoading &&
              !error &&
              filteredProducts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ height: LIST_HEIGHT }}
                >
                  <Virtuoso
                    data={filteredProducts}
                    endReached={() => {
                      if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                      }
                    }}
                    overscan={300}
                    itemContent={(index, product) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4"
                      >
                        <ProductCard
                          product={product}
                          index={index}
                          onShare={handleShare}
                          onNavigate={handleNavigate}
                        />
                      </motion.div>
                    )}
                    components={{
                      Footer: () =>
                        hasNextPage ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-center py-4"
                          >
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => fetchNextPage()}
                              disabled={isFetchingNextPage}
                              className="flex items-center gap-2.5 bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 active:scale-95 transition-all shadow-md"
                            >
                              {isFetchingNextPage ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  درحال بارگذاری...
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4" strokeWidth={2} />
                                  مشاهده بیشتر
                                </>
                              )}
                            </motion.button>
                          </motion.div>
                        ) : (
                          <div className="py-2" />
                        ),
                    }}
                  />
                </motion.div>
              )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}