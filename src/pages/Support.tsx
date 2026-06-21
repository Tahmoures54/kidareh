import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Share2,
  MapPin,
  Phone,
  MessageCircle,
  Package,
  Star,
  BarChart3,
  Store,
  Navigation,
  CheckCircle2,
  Info,
  ShoppingBag,
  Calendar,
  LocateFixed,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getBadgeStyle, formatPrice, truncateText } from "../utils";
import { apiRequest, ApiError } from "../utils/api";

// ==================== TYPES ====================

interface Product {
  id: number;
  name: string;
  price: number | string;
  status: string;
  views: number;
  badge?: string | null;
  image_url?: string | null;
  lat?: number;
  lng?: number;
}

interface StoreData {
  id: number;
  name: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviews: number;
  joined: string;
  image?: string | null;
  verified?: boolean;
  description?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  products?: Product[];
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface RouteInfo {
  distance: string;
  time: string;
  lat: number;
  lng: number;
}

type TabType = "products" | "about";

// ==================== CONSTANTS ====================

const FALLBACK_STORE_IMAGE =
  "https://placehold.co/200x200/f3f4f6/a1a1aa?text=Store";
const FALLBACK_PRODUCT_IMAGE =
  "https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image";

const TOAST_DURATION = 2500;
const GEOLOCATION_TIMEOUT = 9000;
const ROUTE_ANIMATION_DELAY = 600;

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 14 },
  },
};

const TAB_VARIANTS = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

// ==================== HELPERS ====================

/**
 * تبدیل مقدار به عدد معتبر
 */
function toNumber(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * تبدیل عدد به فرمت فارسی
 */
function toFaDigits(value: number | string): string {
  return Number(value || 0).toLocaleString("fa-IR");
}

/**
 * محاسبه فاصله با Haversine Formula
 */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // شعاع زمین (کیلومتر)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * تبدیل فاصله به فرمت دوست‌داشتنی
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${toFaDigits(Math.round(km * 1000))} متر`;
  }
  return `${km.toFixed(1).replace(".", "٫")} کیلومتر`;
}

/**
 * محاسبه زمان تقریبی (بر اساس سرعت شهری)
 */
function estimateTravelTime(km: number): number {
  const URBAN_SPEED_KMH = 28; // سرعت متوسط شهری
  const MIN_TIME = 3; // حداقل زمان
  return Math.max(MIN_TIME, Math.round((km / URBAN_SPEED_KMH) * 60));
}

/**
 * ساخت URL نقشه
 */
function buildMapUrl(
  lat?: number,
  lng?: number,
  address?: string
): string | null {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      address
    )}`;
  }

  return null;
}

// ==================== COMPONENTS ====================

/**
 * Skeleton Loader
 */
function StoreSkeleton(): JSX.Element {
  return (
    <div
      className="flex flex-col min-h-screen bg-gray-50 pb-24"
      dir="rtl"
    >
      {/* Header skeleton */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="h-[320px] bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-b-[2.5rem] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-2xl" />
      </motion.div>

      {/* Card skeleton */}
      <div className="px-4 -mt-16 relative z-20 space-y-4">
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-white h-44 rounded-3xl shadow-sm border border-gray-100"
        />

        {/* Tabs skeleton */}
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-gray-100 h-12 rounded-2xl mt-6"
        />

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="bg-white h-60 rounded-3xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Toast Notification
 */
interface ToastProps {
  message: string;
}

function Toast({ message }: ToastProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-xs font-black shadow-2xl z-50 flex items-center gap-2 border border-white/10 max-w-sm"
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      {message}
    </motion.div>
  );
}

/**
 * Route Information Card
 */
interface RouteCardProps {
  routeInfo: RouteInfo;
  isRouting: boolean;
  onRoute: () => void;
  onNoRoute: () => void;
  locDenied: boolean;
}

function RouteCard({
  routeInfo,
  isRouting,
  onRoute,
  onNoRoute,
  locDenied,
}: RouteCardProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="mb-4 bg-gradient-to-l from-emerald-50/50 to-teal-50/50 rounded-2xl p-4 border border-emerald-100/50 shadow-sm relative overflow-hidden"
    >
      {/* Left accent bar */}
      <div className="absolute top-0 right-0 w-1 h-full bg-emerald-400" />

      {/* Route info header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Navigation icon with live indicator */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="relative"
          >
            <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-50">
              <Navigation className="w-5 h-5 fill-emerald-50" strokeWidth={1.5} />
            </div>

            {/* Live location pulse */}
            {!locDenied && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white shadow-sm" />
              </span>
            )}
          </motion.div>

          {/* Text info */}
          <div>
            <h4 className="text-[13px] font-black text-gray-900">
              فاصله تا فروشگاه
            </h4>
            <p className="text-[10px] font-bold text-gray-500">
              {locDenied
                ? "دسترسی موقعیت غیرفعال است"
                : "بر اساس لوکیشن زنده شما"}
            </p>
          </div>
        </div>

        {/* Distance & time */}
        <div className="text-right flex flex-col items-end">
          <motion.span
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-lg font-black text-emerald-700 block leading-none drop-shadow-sm"
          >
            {routeInfo.time}
          </motion.span>
          <span className="text-[11px] font-black text-gray-500 mt-1">
            {routeInfo.distance} فاصله
          </span>
        </div>
      </div>

      {/* Route button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRoute}
        disabled={isRouting}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-200 disabled:opacity-60"
      >
        {isRouting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال محاسبه...
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" strokeWidth={2.5} />
            شروع مسیریابی هوشمند
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

/**
 * Route Request Button
 */
interface RouteRequestProps {
  isRouting: boolean;
  onRoute: () => void;
}

function RouteRequest({ isRouting, onRoute }: RouteRequestProps): JSX.Element {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onRoute}
      disabled={isRouting}
      className="w-full mb-4 py-3.5 bg-gray-50 border-2 border-gray-200 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-100 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 group"
    >
      {isRouting ? (
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      ) : (
        <LocateFixed className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
      )}
      <span>
        {isRouting
          ? "در حال محاسبه مسیر..."
          : "دریافت مسیر و فاصله تا اینجا"}
      </span>
    </motion.button>
  );
}

/**
 * Products Grid
 */
interface ProductsGridProps {
  products: Product[];
  onProductClick: (id: number) => void;
}

function ProductsGrid({
  products,
  onProductClick,
}: ProductsGridProps): JSX.Element {
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-gray-200 shadow-sm"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-sm"
        >
          <Package className="w-8 h-8" strokeWidth={1.5} />
        </motion.div>
        <p className="text-gray-500 text-sm font-bold">
          این فروشگاه هنوز کالایی ثبت نکرده است.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={CONTAINER_VARIANTS}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 pb-8"
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product.id)}
        />
      ))}
    </motion.div>
  );
}

/**
 * Product Card
 */
interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

function ProductCard({ product, onClick }: ProductCardProps): JSX.Element {
  return (
    <motion.button
      variants={ITEM_VARIANTS}
      onClick={onClick}
      className="bg-white rounded-3xl p-2.5 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300 group active:scale-95 text-left"
    >
      {/* Badge */}
      {product.badge && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[9px] font-black z-10 shadow-sm ${getBadgeStyle(
            product.badge
          )}`}
        >
          {product.badge}
        </motion.div>
      )}

      {/* Image */}
      <div className="aspect-square rounded-2xl bg-gray-50 mb-3 overflow-hidden border border-gray-50 relative shadow-sm">
        <motion.img
          whileHover={{ scale: 1.08 }}
          src={product.image_url || FALLBACK_PRODUCT_IMAGE}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
          }}
        />
      </div>

      {/* Title */}
      <h4 className="font-black text-gray-800 text-[11px] mb-2 line-clamp-2 leading-relaxed px-1 min-h-[32px] group-hover:text-indigo-600 transition-colors">
        {truncateText(product.name, 45)}
      </h4>

      {/* Footer */}
      <div className="mt-auto px-1 pb-1 space-y-2">
        {/* Price */}
        <motion.p
          whileHover={{ scale: 1.05 }}
          className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-700 to-teal-600 font-black text-[13px] tracking-tight drop-shadow-sm"
        >
          {formatPrice(product.price)}
        </motion.p>

        {/* Status & Views */}
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-[9px] px-2 py-0.5 rounded-md font-bold border transition-colors ${
              product.status === "موجود"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-amber-50 text-amber-700 border-amber-100"
            }`}
          >
            {product.status || "نامشخص"}
          </span>
          <span className="text-[9px] text-gray-400 flex items-center gap-0.5 font-bold">
            <BarChart3 className="w-3 h-3" strokeWidth={2.5} />
            {toFaDigits(product.views || 0)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * About Tab Content
 */
interface AboutTabProps {
  store: StoreData;
}

function AboutTab({ store }: AboutTabProps): JSX.Element {
  return (
    <motion.div
      variants={TAB_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 space-y-5"
    >
      {/* Header */}
      <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
        <Info className="w-5 h-5 text-indigo-600" strokeWidth={2} />
        معرفی فروشگاه
      </h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-sm text-gray-600 leading-loose font-medium whitespace-pre-line"
      >
        {store.description ||
          `فروشگاه ${store.name} با هدف ارائه بهترین کالاها در دسته‌بندی ${
            store.category || "عمومی"
          } فعالیت می‌کند.`}
      </motion.p>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3 pt-4 border-t border-dashed border-gray-100"
      >
        {/* Rating stat */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-b from-amber-50 to-yellow-50 rounded-2xl p-4 text-center border border-amber-100/50 shadow-sm"
        >
          <Star className="w-6 h-6 text-amber-400 fill-amber-400 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-lg font-black text-gray-900">
            {toFaDigits(store.rating || 0)}
          </p>
          <p className="text-[10px] text-gray-500 font-bold">امتیاز کاربران</p>
        </motion.div>

        {/* Products stat */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-b from-indigo-50 to-purple-50 rounded-2xl p-4 text-center border border-indigo-100/50 shadow-sm"
        >
          <ShoppingBag className="w-6 h-6 text-indigo-500 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-lg font-black text-gray-900">
            {toFaDigits(store.products?.length || 0)}
          </p>
          <p className="text-[10px] text-gray-500 font-bold">تعداد کالا</p>
        </motion.div>
      </motion.div>

      {/* Additional info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" strokeWidth={2} />
          <span className="text-sm font-bold text-gray-700">
            عضو سایت از {toFaDigits(store.joined || "نامشخص")}
          </span>
        </div>

        {store.category && (
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" strokeWidth={2} />
            <span className="text-sm font-bold text-gray-700">
              دسته‌بندی: {store.category}
            </span>
          </div>
        )}

        {store.city && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" strokeWidth={2} />
            <span className="text-sm font-bold text-gray-700">
              شهر: {store.city}
              {store.province && ` - ${store.province}`}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * Products Tab Content
 */
interface ProductsTabProps {
  products: Product[];
  onProductClick: (id: number) => void;
}

function ProductsTab({
  products,
  onProductClick,
}: ProductsTabProps): JSX.Element {
  return (
    <motion.div
      variants={TAB_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <h3 className="text-[15px] font-black text-gray-800 flex items-center gap-2">
          <motion.span
            animate={{ scaleY: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-4 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full inline-block shadow-md"
          />
          لیست موجودی
        </h3>

        <motion.span
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[11px] text-indigo-600 font-black bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full"
        >
          {toFaDigits(products.length)} قلم کالا
        </motion.span>
      </div>

      {/* Products grid */}
      <ProductsGrid
        products={products}
        onProductClick={onProductClick}
      />
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function StoreDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ===== State =====
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [toast, setToast] = useState<string | null>(null);

  const [isRouting, setIsRouting] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locDenied, setLocDenied] = useState(false);

  // ===== Toast helper =====
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  // ===== Fetch store =====
  const fetchStore = useCallback(async () => {
    if (!id) {
      setError("شناسه فروشگاه نامعتبر است");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<
        StoreData | { error?: string }
      >(`/api/stores/${id}`, { method: "GET", auth: false });

      if ((data as any)?.error) {
        throw new Error(
          (data as any).error || "فروشگاه یافت نشد"
        );
      }

      const normalized = data as StoreData;
      setStore({
        ...normalized,
        rating: Number(normalized.rating ?? 0),
        reviews: Number(normalized.reviews ?? 0),
        products: Array.isArray(normalized.products)
          ? normalized.products.map((p) => ({
              ...p,
              views: Number(p.views ?? 0),
              lat: toNumber((p as any).lat),
              lng: toNumber((p as any).lng),
            }))
          : [],
      });
    } catch (err: any) {
      const message =
        err instanceof ApiError
          ? err.message
          : err?.message || "خطا در دریافت اطلاعات فروشگاه";

      setError(message);
      showToast(message);

      setTimeout(() => navigate(-1), 1200);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  // ===== Effect: Load store =====
  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // ===== Geolocation =====
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setLocDenied(true);
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT,
        maximumAge: 30000,
      }
    );
  }, []);

  // ===== Calculate route =====
  const routeInfo = useMemo((): RouteInfo | null => {
    if (!store || !userLocation) return null;

    const storeLat = toNumber(store.latitude);
    const storeLng = toNumber(store.longitude);

    if (!storeLat || !storeLng) return null;

    const km = calculateDistanceKm(
      userLocation.lat,
      userLocation.lng,
      storeLat,
      storeLng
    );

    const minutes = estimateTravelTime(km);

    return {
      distance: formatDistance(km),
      time: `${toFaDigits(minutes)} دقیقه`,
      lat: storeLat,
      lng: storeLng,
    };
  }, [store, userLocation]);

  // ===== Event handlers =====
  const handleRoute = useCallback(() => {
    if (!store) return;

    setIsRouting(true);

    setTimeout(() => {
      setIsRouting(false);

      const mapUrl = buildMapUrl(
        toNumber(store.latitude),
        toNumber(store.longitude),
        store.address
      );

      if (mapUrl) {
        window.open(mapUrl, "_blank", "noopener,noreferrer");
      } else {
        showToast("مختصات یا آدرس فروشگاه ثبت نشده است");
      }
    }, ROUTE_ANIMATION_DELAY);
  }, [store, showToast]);

  const handleShare = useCallback(async () => {
    if (!store) return;

    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: store.name,
          text: `ویترین فروشگاه ${store.name} را در کی‌داره ببینید`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("لینک فروشگاه کپی شد");
      }
    } catch (error) {
      console.warn("Share error:", error);
    }
  }, [store, showToast]);

  const handleOpenChat = useCallback(() => {
    if (store) {
      navigate(`/messages?storeId=${store.id}`);
    }
  }, [store, navigate]);

  const handleProductClick = useCallback(
    (productId: number) => {
      navigate(`/product/${productId}`);
    },
    [navigate]
  );

  // ===== Render: Loading =====
  if (loading) {
    return <StoreSkeleton />;
  }

  // ===== Render: Error =====
  if (error || !store) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center"
        dir="rtl"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-400 shadow-md"
        >
          <AlertCircle className="w-8 h-8" strokeWidth={1.5} />
        </motion.div>

        <h2 className="text-xl font-black text-gray-900 mb-2">
          فروشگاه یافت نشد!
        </h2>

        <p className="text-gray-600 text-sm mb-6 max-w-sm leading-relaxed font-medium">
          {error || "متاسفانه فروشگاه مورد نظر موجود نیست."}
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
        >
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          بازگشت
        </motion.button>
      </motion.div>
    );
  }

  // ===== Render: Main =====
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen bg-gray-50 pb-24"
      dir="rtl"
    >
      {/* ===== Header ===== */}
      <header className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 text-white px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[5.5rem] rounded-b-[2.5rem] shadow-[0_20px_40px_rgba(67,56,202,0.2)] relative z-10 overflow-hidden">
        {/* Decorative backgrounds */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"
        />
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: 1,
          }}
          className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-400/20 rounded-full blur-2xl -translate-x-1/4 translate-y-1/4"
        />

        {/* Navbar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 relative z-10"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-95 shadow-sm"
            aria-label="بازگشت"
          >
            <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
          </motion.button>

          <h1 className="text-[15px] font-black tracking-wide">
            ویترین فروشگاه
          </h1>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-95 shadow-sm"
            aria-label="اشتراک‌گذاری"
          >
            <Share2 className="w-5 h-5 text-white" strokeWidth={2} />
          </motion.button>
        </motion.div>

        {/* Store info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center text-center relative z-10"
        >
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative mb-4 group"
          >
            <motion.div
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-white/20 rounded-[1.8rem] blur-md"
            />

            <div className="w-24 h-24 bg-white rounded-[1.75rem] p-1 shadow-2xl relative flex items-center justify-center overflow-hidden ring-4 ring-white/10">
              {store.image ? (
                <img
                  src={store.image}
                  alt={store.name}
                  className="w-full h-full object-cover rounded-[1.5rem]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      FALLBACK_STORE_IMAGE;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
                  <Store className="w-10 h-10 text-indigo-400" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* Verified badge */}
            {store.verified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-lg border border-gray-50 flex items-center justify-center"
              >
                <CheckCircle2 className="w-6 h-6 text-teal-500 fill-teal-50" strokeWidth={1.5} />
              </motion.div>
            )}
          </motion.div>

          {/* Store name */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black mb-1.5 tracking-tight text-white"
          >
            {store.name}
          </motion.h2>

          {/* Category badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.25 }}
            className="inline-flex items-center bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full mb-4"
          >
            <span className="text-indigo-100 text-[11px] font-black">
              {store.category || "فروشگاه عمومی"}
            </span>
          </motion.div>

          {/* Rating & joined */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 bg-black/10 backdrop-blur-md shadow-inner px-5 py-2.5 rounded-2xl border border-white/10"
          >
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" strokeWidth={0} />
              <span className="text-[13px] font-black drop-shadow-sm">
                {toFaDigits(store.rating || 0)}
              </span>
              <span className="text-[10px] text-indigo-200">
                ({toFaDigits(store.reviews || 0)} نظر)
              </span>
            </div>

            <div className="w-px h-4 bg-white/20" />

            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-300" strokeWidth={2} />
              <span className="text-[11px] font-bold text-indigo-100">
                عضو از {toFaDigits(store.joined || "نامشخص")}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </header>

      {/* ===== Contact Card ===== */}
      <div className="px-4 -mt-10 relative z-20 mb-6">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 p-5 border border-gray-100"
        >
          {/* Address */}
          <div className="flex items-start gap-3.5 mb-4 pb-4 border-b border-dashed border-gray-100">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-[14px] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" strokeWidth={2} />
            </div>

            <p className="text-[13px] text-gray-700 leading-relaxed font-bold pt-1 text-justify">
              {store.city && (
                <span className="text-indigo-600 ml-1">{store.city}،</span>
              )}
              {store.address || "آدرس دقیق در سیستم ثبت نشده است."}
            </p>
          </div>

          {/* Route info or request */}
          <AnimatePresence mode="wait">
            {routeInfo ? (
              <RouteCard
                key="route-info"
                routeInfo={routeInfo}
                isRouting={isRouting}
                onRoute={handleRoute}
                onNoRoute={() => showToast("مختصات ثبت نشده")}
                locDenied={locDenied}
              />
            ) : (
              <RouteRequest
                key="route-request"
                isRouting={isRouting}
                onRoute={handleRoute}
              />
            )}
          </AnimatePresence>

          {/* Contact buttons */}
          <div className="flex gap-3">
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              href={
                store.phone ? `tel:${store.phone}` : undefined
              }
              onClick={(e) => {
                if (!store.phone) {
                  e.preventDefault();
                  showToast("شماره تماس ثبت نشده");
                }
              }}
              className="flex-[3] bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-200/50 active:scale-95 transition-transform"
            >
              <Phone className="w-5 h-5" strokeWidth={2} />
              تماس با فروشنده
            </motion.a>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenChat}
              className="flex-[2] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border border-indigo-100"
            >
              <MessageCircle className="w-5 h-5" strokeWidth={2} />
              چت مستقیم
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="px-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/60 backdrop-blur-md p-1.5 rounded-[1rem] flex relative border border-gray-200/50 shadow-sm"
        >
          <motion.div
            layout
            className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-sm border border-gray-100"
            style={{
              width: "calc(50% - 6px)",
              right:
                activeTab === "products"
                  ? "6px"
                  : "auto",
              left:
                activeTab === "about"
                  ? "6px"
                  : "auto",
            }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 25,
            }}
          />

          {(["products", "about"] as const).map((tab) => (
            <motion.button
              key={tab}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black z-10 flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                activeTab === tab
                  ? "text-indigo-700"
                  : "text-gray-500"
              }`}
            >
              {tab === "products" ? (
                <>
                  <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                  محصولات
                </>
              ) : (
                <>
                  <Info className="w-4 h-4" strokeWidth={2} />
                  اطلاعات فروشگاه
                </>
              )}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ===== Tab Content ===== */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {activeTab === "products" ? (
            <ProductsTab
              key="products-tab"
              products={store.products || []}
              onProductClick={handleProductClick}
            />
          ) : (
            <AboutTab key="about-tab" store={store} />
          )}
        </AnimatePresence>
      </div>

      {/* ===== Toast ===== */}
      <AnimatePresence>
        {toast && <Toast message={toast} />}
      </AnimatePresence>
    </motion.div>
  );
}