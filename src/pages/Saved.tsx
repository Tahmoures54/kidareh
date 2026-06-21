import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Store,
  MapPin,
  UserPlus,
  BellRing,
  TrendingDown,
  ShoppingBag,
  SearchX,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  X,
  AlertCircle,
  Package,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest, ApiError } from "../utils/api";

// ==================== TYPES ====================

type ProductStatus = "موجود" | "ناموجود" | "در حال تامین";
type FilterType = "all" | "price_drop" | "available";

interface SavedProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  store: string;
  status: ProductStatus;
  distance: string;
  image: string;
  hasPriceDrop: boolean;
  storeId?: string;
}

interface SavedState {
  products: SavedProduct[];
  loading: boolean;
  errorText: string;
  activeFilter: FilterType;
  showNotification: boolean;
}

// ==================== CONSTANTS ====================

const FALLBACK_IMAGE =
  "https://placehold.co/400x400/f3f4f6/a1a1aa?text=No+Image";
const GRID_COLUMNS = 2;
const ANIMATION_DURATION = 0.2;
const NOTIFICATION_AUTO_HIDE_DELAY = 8000;

// ==================== HELPERS ====================

/**
 * نرمال‌سازی وضعیت محصول
 */
function normalizeStatus(value: unknown): ProductStatus {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (
    normalized === "available" ||
    normalized === "موجود" ||
    normalized === "in_stock"
  ) {
    return "موجود";
  }

  if (
    normalized === "ناموجود" ||
    normalized === "unavailable" ||
    normalized === "out_of_stock"
  ) {
    return "ناموجود";
  }

  return "در حال تامین";
}

/**
 * تبدیل فاصله به فرمت فارسی
 */
function formatDistanceFa(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 1000) {
      return `${Math.round(value).toLocaleString("fa-IR")} متر`;
    }
    return `${(value / 1000)
      .toFixed(1)
      .replace(".", "٫")} کیلومتر`;
  }

  return "نامشخص";
}

/**
 * نرمال‌سازی محصول از API
 */
function normalizeSavedProduct(item: any, index: number): SavedProduct | null {
  const id = String(item?.id ?? item?.product_id ?? "").trim();
  if (!id) return null;

  const price = Number(item?.price ?? 0);
  const oldPriceRaw = item?.oldPrice ?? item?.old_price;
  const oldPrice = Number(oldPriceRaw);

  const hasPriceDrop =
    typeof item?.hasPriceDrop === "boolean"
      ? item.hasPriceDrop
      : Number.isFinite(oldPrice) && oldPrice > price;

  return {
    id,
    name: String(item?.name ?? "کالا بدون نام"),
    price: Number.isFinite(price) ? price : 0,
    oldPrice: Number.isFinite(oldPrice) ? oldPrice : undefined,
    store: String(
      item?.store ?? item?.store_name ?? item?.storeName ?? "فروشگاه"
    ),
    status: normalizeStatus(item?.status),
    distance: formatDistanceFa(item?.distance ?? item?.distance_meters),
    image: String(item?.image ?? item?.image_url ?? FALLBACK_IMAGE),
    hasPriceDrop,
    storeId: item?.storeId ? String(item.storeId) : undefined,
  };
}

/**
 * محاسبه درصد تخفیف
 */
function calculateDiscount(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

// ==================== SKELETON LOADER ====================

function ProductGridSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="bg-white rounded-3xl p-2.5 border border-gray-100 animate-pulse"
        >
          {/* Image skeleton */}
          <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-gray-200 to-gray-100 mb-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>

          {/* Text skeleton */}
          <div className="space-y-2.5">
            <div className="h-3 bg-gray-200 rounded-lg w-4/5" />
            <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
            <div className="h-2 bg-gray-100 rounded-lg w-1/2 mt-3" />
            <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== ERROR STATE ====================

interface ErrorStateProps {
  errorText: string;
  onRetry: () => Promise<void>;
}

function ErrorState({ errorText, onRetry }: ErrorStateProps): JSX.Element {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border-2 border-red-100 rounded-3xl p-8 text-center max-w-sm mx-auto"
    >
      <motion.div
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"
      >
        <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
      </motion.div>

      <h3 className="font-black text-gray-900 text-lg mb-2">خطا در بارگذاری</h3>
      <p className="text-gray-600 text-sm mb-6 leading-relaxed font-medium">
        {errorText}
      </p>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-black hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-60 active:scale-95 shadow-md"
      >
        {isRetrying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {isRetrying ? "درحال تلاش..." : "تلاش مجدد"}
      </motion.button>
    </motion.div>
  );
}

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  hasFilter: boolean;
  onClearFilter: () => void;
}

function EmptyState({
  hasFilter,
  onClearFilter,
}: EmptyStateProps): JSX.Element {
  const icon = hasFilter ? SearchX : Heart;
  const Icon = icon;
  const title = hasFilter
    ? "کالایی با این فیلتر یافت نشد"
    : "لیست نشان‌های شما خالی است";
  const description = hasFilter
    ? "لطفاً فیلتر دیگری را امتحان کنید یا همه کالاها را نمایش دهید."
    : "کالاهایی که دوست دارید را نشان کنید تا بتوانید آن‌ها را دنبال کنید.";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 text-gray-400 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100"
      >
        <Icon className="w-12 h-12" strokeWidth={1.5} />
      </motion.div>

      <h2 className="text-gray-900 font-black text-lg mb-2">{title}</h2>
      <p className="text-gray-600 text-sm font-medium mb-8 max-w-sm leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        {hasFilter && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClearFilter}
            className="text-indigo-600 text-sm font-black bg-indigo-50 px-6 py-3 rounded-xl hover:bg-indigo-100 transition-all active:scale-95 border border-indigo-100"
          >
            مشاهده همه کالاها
          </motion.button>
        )}

        {!hasFilter && (
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            شروع خرید
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// ==================== PRICE DROP NOTIFICATION ====================

interface PriceDropNotificationProps {
  count: number;
  onDismiss: () => void;
}

function PriceDropNotification({
  count,
  onDismiss,
}: PriceDropNotificationProps): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDismiss, NOTIFICATION_AUTO_HIDE_DELAY);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, scale: 0.9, marginBottom: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-l-4 border-emerald-500 border-r border-t border-b border-emerald-100/50 rounded-2xl p-5 shadow-sm relative overflow-hidden group"
    >
      {/* Decorative blur */}
      <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-emerald-100 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />

      {/* Close button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onDismiss}
        className="absolute top-3 right-3 text-emerald-600/60 hover:text-emerald-600 active:scale-90 transition-all text-xl leading-none p-1 hover:bg-emerald-100/50 rounded-lg"
        aria-label="بستن"
      >
        <X className="w-5 h-5" strokeWidth={2.5} />
      </motion.button>

      {/* Content */}
      <div className="flex items-start gap-4 relative z-10">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 rounded-xl bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-md border-2 border-emerald-100"
        >
          <BellRing className="w-6 h-6" strokeWidth={1.5} />
        </motion.div>

        <div className="text-right flex-1">
          <h3 className="text-sm font-black text-emerald-900 mb-1 flex items-center justify-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={2} />
            خبر خوب! کاهش قیمت
          </h3>
          <p className="text-xs text-emerald-800/75 leading-relaxed font-medium">
            قیمت{" "}
            <span className="font-black text-emerald-700">
              {count.toLocaleString("fa-IR")} کالا
            </span>{" "}
            از نشان‌های شما کاهش پیدا کرده است. آن‌ها را بررسی کنید!
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== PRODUCT CARD ====================

interface ProductCardProps {
  product: SavedProduct;
  index: number;
  onRemove: (e: React.MouseEvent, id: string) => Promise<void>;
}

function ProductCard({
  product,
  index,
  onRemove,
}: ProductCardProps): JSX.Element {
  const [isRemoving, setIsRemoving] = useState(false);

  const discount = calculateDiscount(product.price, product.oldPrice);
  const hasDiscount = discount > 0;

  const handleRemoveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRemoving(true);
    try {
      await onRemove(e, product.id);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
      transition={{
        duration: ANIMATION_DURATION,
        delay: index * 0.05,
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className="bg-white rounded-3xl p-2.5 shadow-sm border border-gray-100 relative group overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300"
    >
      {/* Remove button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleRemoveClick}
        disabled={isRemoving}
        className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md z-10 hover:bg-white transition-all disabled:opacity-60 active:scale-90 border border-gray-100"
        aria-label="حذف از نشان‌ها"
      >
        {isRemoving ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        ) : (
          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" strokeWidth={0} />
        )}
      </motion.button>

      <Link to={`/product/${product.id}`} className="block">
        {/* Image section */}
        <div className="relative mb-3 overflow-hidden rounded-2xl bg-gray-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />

          {/* Discount badge */}
          {hasDiscount && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-2 right-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1"
            >
              <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
              {discount.toLocaleString("fa-IR")}٪
            </motion.div>
          )}

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`absolute top-2 left-2 text-[9px] px-2 py-1 rounded-lg font-bold backdrop-blur-md ${
              product.status === "موجود"
                ? "bg-emerald-500/80 text-white"
                : product.status === "ناموجود"
                ? "bg-red-500/80 text-white"
                : "bg-amber-500/80 text-white"
            }`}
          >
            {product.status}
          </motion.div>
        </div>

        {/* Product info */}
        <h3 className="font-black text-gray-900 text-xs line-clamp-2 mb-2 leading-relaxed min-h-[32px] group-hover:text-indigo-600 transition-colors">
          {product.name}
        </h3>

        {/* Store info */}
        <div className="flex items-center text-[9px] text-gray-600 mb-3 font-bold bg-gray-50 px-2.5 py-1.5 rounded-lg w-fit hover:bg-gray-100 transition-colors">
          <Store className="w-3 h-3 ml-1.5 text-gray-400 shrink-0" />
          <span className="truncate max-w-[100px]">{product.store}</span>
        </div>

        {/* Price section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-3"
        >
          {product.oldPrice && product.oldPrice > product.price && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] text-gray-400 line-through font-medium block mb-1"
            >
              {product.oldPrice.toLocaleString("fa-IR")}
            </motion.span>
          )}
          <div className="text-gray-900 font-black text-sm flex items-baseline gap-1">
            <span>{product.price.toLocaleString("fa-IR")}</span>
            <span className="text-[8px] text-gray-500 font-bold">تومان</span>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-gray-100 text-[9px] font-bold">
          <span className="flex items-center gap-0.5 text-gray-600">
            <MapPin className="w-3 h-3 text-indigo-500" strokeWidth={2.5} />
            {product.distance}
          </span>
          <span className="text-gray-400">›</span>
        </div>
      </Link>
    </motion.div>
  );
}

// ==================== FILTER TABS ====================

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: {
    all: number;
    price_drop: number;
    available: number;
  };
  isLoading: boolean;
}

function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
  isLoading,
}: FilterTabsProps): JSX.Element {
  const filters: Array<{
    id: FilterType;
    label: string;
    icon: any;
    count: number;
  }> = [
    { id: "all", label: "همه کالاها", icon: null, count: counts.all },
    { id: "price_drop", label: "کاهش قیمت", icon: TrendingDown, count: counts.price_drop },
    {
      id: "available",
      label: "فقط موجودها",
      icon: CheckCircle2,
      count: counts.available,
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;

        return (
          <motion.button
            key={filter.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onFilterChange(filter.id)}
            disabled={isLoading}
            className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-60 ${
              isActive
                ? "bg-gradient-to-r from-gray-900 to-black text-white shadow-lg shadow-gray-900/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {Icon && <Icon className="w-4 h-4" strokeWidth={2} />}
            {filter.label}

            {filter.count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-[8px] px-1.5 py-0.5 rounded-md font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-white text-gray-600"
                }`}
              >
                {filter.count > 99 ? "99+" : filter.count.toLocaleString("fa-IR")}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function Saved(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ===== State =====
  const [state, setState] = useState<SavedState>({
    products: [],
    loading: true,
    errorText: "",
    activeFilter: "all",
    showNotification: true,
  });

  // ===== Refs =====
  const mountedRef = useRef(true);

  // ===== State updater =====
  const updateState = useCallback(
    (updates: Partial<SavedState>) => {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // ===== Cleanup =====
  useEffect(() => {
    mountedRef.current = true;
    document.title = "نشان‌های من | کی‌داره";

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ===== Handle unauthorized =====
  const handleUnauthorized = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      if (mountedRef.current) {
        navigate("/login", {
          replace: true,
          state: { reason: "session_expired" },
        });
      }
    }
  }, [logout, navigate]);

  // ===== Fetch saved products =====
  const fetchSavedProducts = useCallback(async () => {
    if (!user) return;
    updateState({ loading: true, errorText: "" });

    try {
      let data: any;

      // سعی برای endpoint جدید
      try {
        data = await apiRequest<any[]>("/api/saved", {
          method: "GET",
          auth: true,
        });
      } catch (e: any) {
        // Fallback برای endpoint قدیمی
        if (e instanceof ApiError && e.status === 404) {
          data = await apiRequest<any[]>("/api/products/saved", {
            method: "GET",
            auth: true,
          });
        } else {
          throw e;
        }
      }

      if (!mountedRef.current) return;

      const normalized = (Array.isArray(data) ? data : [])
        .map((item, idx) => normalizeSavedProduct(item, idx))
        .filter((item): item is SavedProduct => item !== null);

      updateState({ products: normalized });
    } catch (err: any) {
      if (!mountedRef.current) return;

      if (err instanceof ApiError && err.status === 401) {
        await handleUnauthorized();
        return;
      }

      console.error("Fetch saved products error:", err);
      updateState({
        products: [],
        errorText: "دریافت لیست نشان‌ها با خطا مواجه شد.",
      });
    } finally {
      if (mountedRef.current) updateState({ loading: false });
    }
  }, [user, handleUnauthorized, updateState]);

  // ===== Effect: Load data =====
  useEffect(() => {
    if (!user) {
      updateState({ loading: false });
      return;
    }
    fetchSavedProducts();
  }, [user, fetchSavedProducts]);

  // ===== Handle remove product =====
  const handleRemove = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();

      // Optimistic update
      const previousProducts = state.products;
      updateState({
        products: state.products.filter((p) => p.id !== id),
      });

      try {
        try {
          await apiRequest(`/api/saved/${id}`, {
            method: "DELETE",
            auth: true,
          });
        } catch (err: any) {
          // Fallback برای DELETE
          if (err instanceof ApiError && err.status === 404) {
            await apiRequest("/api/products/save", {
              method: "POST",
              auth: true,
              body: { productId: Number(id), save: false },
            });
          } else {
            throw err;
          }
        }
      } catch (err: any) {
        // Rollback on error
        updateState({ products: previousProducts });

        if (err instanceof ApiError && err.status === 401) {
          await handleUnauthorized();
        }

        console.error("Remove product error:", err);
      }
    },
    [state.products, handleUnauthorized, updateState]
  );

  // ===== Memoized values =====
  const filteredProducts = useMemo(() => {
    switch (state.activeFilter) {
      case "price_drop":
        return state.products.filter((p) => p.hasPriceDrop);
      case "available":
        return state.products.filter((p) => p.status === "موجود");
      default:
        return state.products;
    }
  }, [state.products, state.activeFilter]);

  const counts = useMemo(
    () => ({
      all: state.products.length,
      price_drop: state.products.filter((p) => p.hasPriceDrop).length,
      available: state.products.filter((p) => p.status === "موجود").length,
    }),
    [state.products]
  );

  // ===== Render: Not logged in =====
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gradient-to-b from-gray-50 via-white to-rose-50 pb-24"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-rose-300 rounded-full blur-3xl"
          />

          <div className="relative w-32 h-32 bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-100 text-rose-500 rounded-full flex items-center justify-center shadow-2xl">
            <Heart className="w-16 h-16 fill-rose-500" strokeWidth={0} />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-black text-gray-900 mb-3"
        >
          لیست نشان‌های شما
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 mb-8 text-sm leading-relaxed max-w-sm font-medium"
        >
          کالاهایی که دوست دارید را نشان کنید تا بتوانید آن‌ها را دنبال کنید
          و از کاهش قیمت آن‌ها باخبر شوید.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm space-y-3"
        >
          <Link
            to="/login"
            className="w-full bg-gradient-to-r from-gray-900 to-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 hover:shadow-2xl hover:shadow-gray-900/30 transition-all shadow-xl active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            ورود یا ثبت‌نام
          </Link>

          <Link
            to="/"
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 hover:bg-gray-200 transition-all active:scale-95"
          >
            <ShoppingBag className="w-5 h-5" />
            شروع خرید
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  // ===== Render: Main content =====
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-gray-50 min-h-screen pb-24"
      dir="rtl"
    >
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 shadow-sm sticky top-0 z-30 rounded-b-3xl border-b border-gray-100/50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Heart className="w-6 h-6 text-rose-500 fill-rose-500" strokeWidth={0} />
              </motion.div>
              نشان‌ها
            </h1>
            <p className="text-[11px] text-gray-500 font-bold mt-1">
              {state.products.length.toLocaleString("fa-IR")} کالا ذخیره شده
            </p>
          </div>

          {!state.loading && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchSavedProducts()}
              className="text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              بروزرسانی
            </motion.button>
          )}
        </motion.div>

        {/* Filter tabs */}
        <FilterTabs
          activeFilter={state.activeFilter}
          onFilterChange={(filter) =>
            updateState({ activeFilter: filter })
          }
          counts={counts}
          isLoading={state.loading}
        />
      </header>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-4 space-y-4 flex-1"
      >
        {/* Price drop notification */}
        <AnimatePresence>
          {state.showNotification &&
            counts.price_drop > 0 &&
            !state.loading && (
              <PriceDropNotification
                count={counts.price_drop}
                onDismiss={() =>
                  updateState({ showNotification: false })
                }
              />
            )}
        </AnimatePresence>

        {/* Content based on state */}
        {state.loading ? (
          <ProductGridSkeleton />
        ) : state.errorText ? (
          <ErrorState
            errorText={state.errorText}
            onRetry={fetchSavedProducts}
          />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            hasFilter={state.activeFilter !== "all"}
            onClearFilter={() =>
              updateState({ activeFilter: "all" })
            }
          />
        ) : (
          /* Products grid */
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 md:gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  onRemove={handleRemove}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}