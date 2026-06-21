import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import {
  Store,
  Plus,
  Share2,
  MessageCircle,
  BarChart3,
  Settings,
  Package,
  Bell,
  MapPin,
  Phone,
  UserPlus,
  Tag,
  Edit,
  Trash2,
  LogOut,
  TrendingUp,
  Save,
  X,
  Loader2,
  Eye,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  ArrowUpRight,
  Clock,
  Users,
  Star,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { formatPrice, getBadgeStyle, truncateText } from "../utils";
import { apiRequest, ApiError } from "../utils/api";

// ==================== TYPES ====================

type ProductStatus =
  | "موجود"
  | "موجودی کم"
  | "فقط ۱ عدد"
  | "ناموجود";
type ChartPeriod = "weekly" | "monthly";
type FilterType = ProductStatus | "all";

interface Product {
  id: number;
  name: string;
  price: number;
  status: ProductStatus;
  views: number;
  isPublic: boolean;
  badge?: string | null;
  image?: string | null;
}

interface StoreInfo {
  name: string;
  description: string;
  address: string;
  phone: string;
  category: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  image?: string;
}

interface SellerProductsResponseItem {
  id: number;
  name: string;
  price: number | string;
  status: string;
  views?: number;
  is_public?: boolean;
  badge?: string | null;
  image_url?: string | null;
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend?: number;
}

interface PanelState {
  products: Product[];
  productsLoading: boolean;
  storeInfo: StoreInfo | null;
  storeLoading: boolean;
  deletingId: number | null;
  updatingId: number | null;
  toastMessage: string | null;
  editingStore: boolean;
  savingStore: boolean;
  chartPeriod: ChartPeriod;
  searchQuery: string;
  statusFilter: FilterType;
}

// ==================== CONSTANTS ====================

const FALLBACK_IMAGE =
  "https://placehold.co/300x300/f3f4f6/a1a1aa?text=No+Image";
const TOAST_DURATION = 3000;
const MAX_PRODUCT_NAME_LENGTH = 48;

const STATUS_FLOW: Record<ProductStatus, ProductStatus> = {
  موجود: "موجودی کم",
  "موجودی کم": "ناموجود",
  ناموجود: "موجود",
  "فقط ۱ عدد": "ناموجود",
};

const STATUS_COLORS: Record<ProductStatus, { bg: string; text: string; border: string }> = {
  موجود: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  "موجودی کم": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  "فقط ۱ عدد": {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  ناموجود: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
};

const CHART_DATA_WEEKLY = [
  { name: "ش", views: 80, clicks: 20 },
  { name: "ی", views: 120, clicks: 35 },
  { name: "د", views: 150, clicks: 40 },
  { name: "س", views: 110, clicks: 25 },
  { name: "چ", views: 190, clicks: 60 },
  { name: "پ", views: 240, clicks: 85 },
  { name: "ج", views: 300, clicks: 120 },
];

const CHART_DATA_MONTHLY = [
  { name: "هفته ۱", views: 850, clicks: 200 },
  { name: "هفته ۲", views: 1200, clicks: 350 },
  { name: "هفته ۳", views: 980, clicks: 280 },
  { name: "هفته ۴", views: 1400, clicks: 420 },
];

// ==================== HELPERS ====================

/**
 * نرمال‌سازی وضعیت محصول
 */
function normalizeStatus(s: string): ProductStatus {
  const normalized = (s || "").trim().toLowerCase();

  if (
    normalized === "موجود" ||
    normalized === "available" ||
    normalized === "in_stock"
  ) {
    return "موجود";
  }

  if (
    normalized === "موجودی کم" ||
    normalized === "low_stock"
  ) {
    return "موجودی کم";
  }

  if (
    normalized === "فقط ۱ عدد" ||
    normalized === "last_one"
  ) {
    return "فقط ۱ عدد";
  }

  return "ناموجود";
}

/**
 * نرمال‌سازی محصول از API
 */
function normalizeProduct(
  p: SellerProductsResponseItem
): Product {
  return {
    id: Number(p.id),
    name: p.name || "کالای بدون نام",
    price:
      typeof p.price === "number"
        ? p.price
        : Number(String(p.price).replace(/[^\d]/g, "")) || 0,
    status: normalizeStatus(p.status),
    views: Number(p.views ?? 0),
    isPublic: Boolean(p.is_public ?? true),
    badge: p.badge ?? null,
    image: p.image_url ?? null,
  };
}

// ==================== COMPONENTS ====================

/**
 * Toast Notification
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
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/10"
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
      />
      {message}
    </motion.div>
  );
}

/**
 * Stat Card
 */
interface StatCardComponentProps {
  stat: StatCard;
  index: number;
}

function StatCardComponent({ stat, index }: StatCardComponentProps): JSX.Element {
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className={`flex items-center gap-3 p-3 rounded-2xl ${stat.bg} transition-shadow hover:shadow-md border-l-4 ${stat.color}`}
    >
      <motion.div
        whileHover={{ rotate: 12 }}
        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm shrink-0"
      >
        <Icon className={`w-5 h-5 ${stat.color}`} strokeWidth={2} />
      </motion.div>

      <div className="overflow-hidden flex-1">
        <p className="text-[10px] text-gray-500 font-bold mb-0.5">
          {stat.label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-base font-black text-gray-900 truncate">
            {stat.value}
          </p>
          {stat.trend !== undefined && (
            <span
              className={`text-[9px] font-bold flex items-center gap-0.5 ${
                stat.trend > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              <ArrowUpRight
                className={`w-3 h-3 ${
                  stat.trend < 0 ? "rotate-180" : ""
                }`}
                strokeWidth={3}
              />
              {Math.abs(stat.trend)}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Store Edit Form
 */
interface StoreEditFormProps {
  editForm: StoreInfo;
  onFormChange: (form: StoreInfo) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

function StoreEditForm({
  editForm,
  onFormChange,
  onSave,
  onClose,
  isSaving,
}: StoreEditFormProps): JSX.Element {
  const formFields = [
    {
      key: "name",
      label: "نام فروشگاه",
      type: "text",
      required: true,
      placeholder: "نام فروشگاه",
    },
    {
      key: "description",
      label: "توضیحات",
      type: "textarea",
      required: false,
      placeholder: "توضیح کوتاه درباره فروشگاه",
    },
    {
      key: "address",
      label: "آدرس",
      type: "text",
      required: false,
      placeholder: "آدرس فروشگاه",
    },
    {
      key: "phone",
      label: "شماره تماس",
      type: "text",
      required: true,
      placeholder: "شماره تماس",
    },
    {
      key: "category",
      label: "دسته‌بندی",
      type: "text",
      required: false,
      placeholder: "مثلاً پوشاک",
    },
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
      className="px-4 mt-4 overflow-hidden"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-lg border border-gray-200 space-y-4"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <h2 className="text-sm font-black flex items-center gap-2">
            <Edit className="w-4 h-4 text-indigo-500" strokeWidth={2.5} />
            ویرایش اطلاعات فروشگاه
          </h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          {formFields.map((field) => {
            const value = editForm[field.key as keyof StoreInfo] || "";

            if (field.type === "textarea") {
              return (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) =>
                      onFormChange({
                        ...editForm,
                        [field.key]: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all resize-none h-20"
                  />
                </motion.div>
              );
            }

            return (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="text-[10px] font-bold text-gray-500 mb-1 block flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) =>
                    onFormChange({
                      ...editForm,
                      [field.key]: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                />
              </motion.div>
            );
          })}

          {/* City & Province */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                شهر
              </label>
              <input
                type="text"
                placeholder="تهران"
                value={editForm.city || ""}
                onChange={(e) =>
                  onFormChange({ ...editForm, city: e.target.value })
                }
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                استان
              </label>
              <input
                type="text"
                placeholder="تهران"
                value={editForm.province || ""}
                onChange={(e) =>
                  onFormChange({
                    ...editForm,
                    province: e.target.value,
                  })
                }
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
              />
            </div>
          </motion.div>
        </div>

        {/* Save button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" strokeWidth={2} />
              ذخیره تغییرات
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Low Stock Alert
 */
interface LowStockAlertProps {
  count: number;
}

function LowStockAlert({ count }: LowStockAlertProps): JSX.Element {
  if (count === 0) return <></>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-4 bg-gradient-to-r from-orange-50 to-rose-50 border-l-4 border-orange-500 border-r border-t border-b border-orange-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="bg-orange-100 text-orange-600 p-2 rounded-xl shrink-0"
      >
        <AlertTriangle className="w-5 h-5" strokeWidth={2} />
      </motion.div>

      <div className="flex-1">
        <h3 className="text-orange-900 font-black text-sm mb-1">
          نیاز به شارژ موجودی
        </h3>
        <p className="text-orange-800/80 text-[11px] font-medium leading-relaxed">
          <span className="font-bold text-rose-600">
            {count.toLocaleString("fa-IR")} کالا
          </span>{" "}
          در ویترین شما ناموجود شده یا موجودی کمی دارند.
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Product Item
 */
interface ProductItemProps {
  product: Product;
  isUpdating: boolean;
  isDeletingConfirm: boolean;
  onStatusChange: (product: Product) => Promise<void>;
  onTogglePublic: (product: Product) => Promise<void>;
  onDelete: (id: number) => void;
  onShare: (product: Product) => Promise<void>;
}

function ProductItem({
  product,
  isUpdating,
  isDeletingConfirm,
  onStatusChange,
  onTogglePublic,
  onDelete,
  onShare,
}: ProductItemProps): JSX.Element {
  const statusInfo = STATUS_COLORS[product.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className="p-3 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow"
    >
      {/* Main content */}
      <div className="flex gap-3">
        <motion.img
          whileHover={{ scale: 1.05 }}
          src={product.image || FALLBACK_IMAGE}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
          className="w-16 h-16 rounded-xl object-cover border border-gray-100 shrink-0"
          alt={product.name}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-black text-gray-900 line-clamp-2">
              {truncateText(product.name, MAX_PRODUCT_NAME_LENGTH)}
            </h4>

            {product.badge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-[10px] px-2 py-0.5 rounded-md font-black shrink-0 ${getBadgeStyle(
                  product.badge
                )}`}
              >
                {product.badge}
              </motion.span>
            )}
          </div>

          {/* Price & Views */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-600">
            <span className="font-black text-teal-600">
              {formatPrice(product.price)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
              {product.views.toLocaleString("fa-IR")}
            </span>
          </div>

          {/* Status & Public toggle */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onStatusChange(product)}
              disabled={isUpdating}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                statusInfo.bg
              } ${statusInfo.text} ${statusInfo.border} hover:shadow-sm disabled:opacity-50`}
            >
              {isUpdating ? "..." : product.status}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTogglePublic(product)}
              disabled={isUpdating}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                product.isPublic
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
              } disabled:opacity-50`}
            >
              {product.isPublic ? "منتشر شده" : "پیش‌نویس"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
        <Link
          to={`/add-product?edit=${product.id}`}
          className="flex-1 text-[11px] font-bold py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 inline-flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors active:scale-95"
        >
          <Edit className="w-3.5 h-3.5" strokeWidth={2.5} />
          ویرایش
        </Link>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onShare(product)}
          className="flex-1 text-[11px] font-bold py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 inline-flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          اشتراک
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDelete(product.id)}
          disabled={isUpdating}
          className={`flex-1 text-[11px] font-bold py-2 rounded-xl border inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 ${
            isDeletingConfirm
              ? "bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
              : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          {isDeletingConfirm ? "تأیید حذف" : "حذف"}
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * Products Section
 */
interface ProductsSectionProps {
  products: Product[];
  filteredProducts: Product[];
  loading: boolean;
  searchQuery: string;
  statusFilter: FilterType;
  deletingId: number | null;
  updatingId: number | null;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (filter: FilterType) => void;
  onStatusChange: (product: Product) => Promise<void>;
  onTogglePublic: (product: Product) => Promise<void>;
  onDelete: (id: number) => void;
  onShare: (product: Product) => Promise<void>;
}

function ProductsSection({
  products,
  filteredProducts,
  loading,
  searchQuery,
  statusFilter,
  deletingId,
  updatingId,
  onSearchChange,
  onStatusFilterChange,
  onStatusChange,
  onTogglePublic,
  onDelete,
  onShare,
}: ProductsSectionProps): JSX.Element {
  return (
    <div className="px-4 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" strokeWidth={2.5} />
            محصولات من
          </h3>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg"
          >
            {products.length.toLocaleString("fa-IR")} کالا
          </motion.span>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="جستجوی کالا..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-3 pr-9 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as FilterType)
            }
            className="border border-gray-200 rounded-xl text-xs px-2 py-2 bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="موجود">موجود</option>
            <option value="موجودی کم">موجودی کم</option>
            <option value="فقط ۱ عدد">فقط ۱ عدد</option>
            <option value="ناموجود">ناموجود</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 rounded-2xl border border-gray-100 animate-pulse flex gap-3"
              >
                <div className="w-16 h-16 rounded-xl bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-1/3 bg-gray-200 rounded" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <Package className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-700 mb-1">
              کالایی یافت نشد
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {searchQuery
                ? "جستجوی دیگری امتحان کنید"
                : "از دکمه افزودن کالای جدید استفاده کنید"}
            </p>

            {!searchQuery && (
              <Link
                to="/add-product"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                افزودن کالا
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  isUpdating={updatingId === product.id}
                  isDeletingConfirm={deletingId === product.id}
                  onStatusChange={onStatusChange}
                  onTogglePublic={onTogglePublic}
                  onDelete={onDelete}
                  onShare={onShare}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Chart Section
 */
interface ChartSectionProps {
  chartPeriod: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
}

function ChartSection({
  chartPeriod,
  onPeriodChange,
}: ChartSectionProps): JSX.Element {
  const chartData =
    chartPeriod === "weekly" ? CHART_DATA_WEEKLY : CHART_DATA_MONTHLY;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="px-4 mb-6"
    >
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" strokeWidth={2.5} />
            روند بازدید
          </h3>

          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-1">
            {(["weekly", "monthly"] as const).map((period) => (
              <motion.button
                key={period}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPeriodChange(period)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  chartPeriod === period
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {period === "weekly" ? "هفتگی" : "ماهانه"}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="h-44" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop
                    offset="95%"
                    stopColor="#4f46e5"
                    stopOpacity={0.04}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis hide />

              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                  fontWeight: "bold",
                  backgroundColor: "#ffffff",
                }}
                cursor={{ stroke: "#4f46e5", strokeWidth: 1 }}
              />

              <Area
                type="monotone"
                dataKey="views"
                stroke="#4f46e5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#viewsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function SellerPanel(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ===== State =====
  const [state, setState] = useState<PanelState>({
    products: [],
    productsLoading: true,
    storeInfo: null,
    storeLoading: true,
    deletingId: null,
    updatingId: null,
    toastMessage: null,
    editingStore: false,
    savingStore: false,
    chartPeriod: "weekly",
    searchQuery: "",
    statusFilter: "all",
  });

  const [editForm, setEditForm] = useState<StoreInfo>({
    name: "",
    description: "",
    address: "",
    phone: "",
    category: "",
    city: "",
    province: "",
    latitude: undefined,
    longitude: undefined,
    image: "",
  });

  // ===== State updater =====
  const updateState = useCallback(
    (updates: Partial<PanelState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // ===== Toast helper =====
  const showToast = useCallback(
    (msg: string) => {
      updateState({ toastMessage: msg });
      setTimeout(
        () => updateState({ toastMessage: null }),
        TOAST_DURATION
      );
    },
    [updateState]
  );

  // ===== Fetch products =====
  const fetchSellerProducts = useCallback(async () => {
    updateState({ productsLoading: true });
    try {
      const data = await apiRequest<SellerProductsResponseItem[]>(
        "/api/products/seller",
        { method: "GET", auth: true }
      );

      if (Array.isArray(data)) {
        updateState({
          products: data.map(normalizeProduct),
        });
      } else {
        updateState({ products: [] });
      }
    } catch (error) {
      console.error("Fetch products error:", error);
      showToast("خطا در دریافت کالاهای فروشگاه");
      updateState({ products: [] });
    } finally {
      updateState({ productsLoading: false });
    }
  }, [updateState, showToast]);

  // ===== Fetch store =====
  const fetchMyStore = useCallback(async () => {
    updateState({ storeLoading: true });
    try {
      const store = await apiRequest<Partial<StoreInfo>>(
        "/api/stores/my/store",
        { method: "GET", auth: true }
      );

      if (store && !(store as any).error) {
        const normalized: StoreInfo = {
          name: store.name || "",
          description: store.description || "",
          address: store.address || "",
          phone: store.phone || "",
          category: store.category || "",
          city: store.city || "",
          province: store.province || "",
          latitude: store.latitude,
          longitude: store.longitude,
          image: store.image || "",
        };

        updateState({ storeInfo: normalized });
        setEditForm(normalized);
      } else {
        updateState({ storeInfo: null });
      }
    } catch (error) {
      console.error("Fetch store error:", error);
      showToast("خطا در دریافت اطلاعات فروشگاه");
      updateState({ storeInfo: null });
    } finally {
      updateState({ storeLoading: false });
    }
  }, [updateState, showToast]);

  // ===== Effect: Load data =====
  useEffect(() => {
    if (!user) return;
    fetchSellerProducts();
    fetchMyStore();
  }, [user, fetchSellerProducts, fetchMyStore]);

  // ===== Computed values =====
  const totalViews = useMemo(
    () => state.products.reduce((acc, p) => acc + (p.views || 0), 0),
    [state.products]
  );

  const lowStockCount = useMemo(
    () =>
      state.products.filter((p) => p.status !== "موجود").length,
    [state.products]
  );

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      const matchSearch = state.searchQuery
        ? p.name
            .toLowerCase()
            .includes(state.searchQuery.toLowerCase())
        : true;
      const matchStatus =
        state.statusFilter === "all"
          ? true
          : p.status === state.statusFilter;
      return matchSearch && matchStatus;
    });
  }, [state.products, state.searchQuery, state.statusFilter]);

  // ===== Stats data =====
  const stats: StatCard[] = [
    {
      label: "بازدید ویترین",
      value: totalViews.toLocaleString("fa-IR"),
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      trend: 12,
    },
    {
      label: "کلیک تماس",
      value: "۸۴",
      icon: Phone,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      trend: 8,
    },
    {
      label: "مسیریابی",
      value: "۳۲",
      icon: MapPin,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      trend: -5,
    },
    {
      label: "پیام‌ها",
      value: "۱۵",
      icon: MessageCircle,
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
    },
  ];

  // ===== Event handlers =====
  const handleSaveStore = async () => {
    if (!editForm.name.trim()) {
      return showToast("نام فروشگاه الزامی است");
    }
    if (!editForm.phone.trim()) {
      return showToast("شماره تماس الزامی است");
    }

    updateState({ savingStore: true });

    try {
      const data = await apiRequest<
        StoreInfo | { error?: string }
      >("/api/stores", {
        method: "POST",
        auth: true,
        body: editForm,
      });

      if ((data as any)?.error) {
        showToast((data as any).error || "خطا در ذخیره");
        return;
      }

      updateState({
        storeInfo: {
          ...((state.storeInfo as StoreInfo) || editForm),
          ...editForm,
        },
        editingStore: false,
      });

      showToast("اطلاعات فروشگاه به‌روز شد");
    } catch (error) {
      console.error("Save store error:", error);
      showToast("خطا در ارتباط با سرور");
    } finally {
      updateState({ savingStore: false });
    }
  };

  const handleTogglePublic = async (product: Product) => {
    updateState({ updatingId: product.id });

    try {
      await apiRequest(
        `/api/products/${product.id}/visibility`,
        {
          method: "PUT",
          auth: true,
          body: { isPublic: !product.isPublic },
        }
      );

      updateState({
        products: state.products.map((p) =>
          p.id === product.id
            ? { ...p, isPublic: !p.isPublic }
            : p
        ),
      });

      showToast("وضعیت انتشار تغییر کرد");
    } catch (error) {
      console.error("Toggle public error:", error);
      showToast("خطا در تغییر وضعیت انتشار");
    } finally {
      updateState({ updatingId: null });
    }
  };

  const handleDelete = async (id: number) => {
    if (state.deletingId !== id) {
      updateState({ deletingId: id });
      setTimeout(
        () => updateState({ deletingId: null }),
        3000
      );
      return;
    }

    updateState({ updatingId: id });

    try {
      await apiRequest(`/api/products/${id}`, {
        method: "DELETE",
        auth: true,
      });

      updateState({
        products: state.products.filter((p) => p.id !== id),
        deletingId: null,
      });

      showToast("کالا با موفقیت حذف شد");
    } catch (error) {
      console.error("Delete product error:", error);
      showToast("خطا در حذف کالا");
    } finally {
      updateState({ updatingId: null });
    }
  };

  const handleStatusChange = async (product: Product) => {
    const newStatus = STATUS_FLOW[product.status] || "موجود";
    updateState({ updatingId: product.id });

    try {
      await apiRequest(
        `/api/products/${product.id}/status`,
        {
          method: "PUT",
          auth: true,
          body: { status: newStatus },
        }
      );

      updateState({
        products: state.products.map((p) =>
          p.id === product.id
            ? { ...p, status: newStatus }
            : p
        ),
      });

      showToast(`وضعیت به "${newStatus}" تغییر یافت`);
    } catch (error) {
      console.error("Status change error:", error);
      showToast("خطا در تغییر وضعیت");
    } finally {
      updateState({ updatingId: null });
    }
  };

  const handleShare = async (product: Product) => {
    const url = `${window.location.origin}/product/${product.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `${product.name} در فروشگاه من`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("لینک کالا کپی شد");
      }
    } catch (error) {
      console.warn("Share error:", error);
      showToast("اشتراک‌گذاری لغو شد");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("خطا در خروج");
    }
  };

  // ===== Render: Not logged in =====
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gradient-to-b from-gray-50 to-white"
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
            className="absolute inset-0 bg-indigo-300 rounded-full blur-3xl"
          />

          <div className="relative w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-2xl">
            <Store className="w-14 h-14" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-black text-gray-900 mb-3"
        >
          پنل فروشندگان کی‌داره
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 mb-8 text-sm leading-relaxed max-w-sm font-medium"
        >
          برای راه‌اندازی ویترین آنلاین، مدیریت محصولات و مشاهده آمار
          فروشگاه خود وارد شوید.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm"
        >
          <Link
            to="/login"
            className="w-full bg-gradient-to-r from-gray-900 to-black text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 hover:shadow-2xl hover:shadow-gray-900/30 transition-all shadow-xl active:scale-95"
          >
            <UserPlus className="w-5 h-5" strokeWidth={2} />
            ورود یا ثبت‌نام فروشگاه
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  // ===== Render: Main =====
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen bg-gray-50 pb-28"
      dir="rtl"
    >
      {/* Toast */}
      <AnimatePresence>
        {state.toastMessage && (
          <Toast message={state.toastMessage} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-20 rounded-b-[2.5rem] shadow-[0_20px_40px_rgba(79,70,229,0.2)] relative z-10 overflow-hidden">
        {/* Background decorations */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: 1,
          }}
          className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"
        />

        {/* Top content */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-start justify-between mb-8 relative z-10"
        >
          {/* Store info */}
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner overflow-hidden shrink-0 p-0.5"
            >
              {state.storeInfo?.image ? (
                <img
                  src={state.storeInfo.image}
                  alt={state.storeInfo.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-white/20 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
              )}
            </motion.div>

            <div>
              <h1 className="text-lg font-black leading-tight tracking-tight">
                {state.storeInfo?.name ||
                  user?.store_name ||
                  "فروشگاه بدون نام"}
              </h1>
              <p className="text-indigo-200 text-xs font-medium flex items-center mt-1.5 opacity-90">
                <MapPin className="w-3.5 h-3.5 ml-1" strokeWidth={2.5} />
                {state.storeInfo?.city
                  ? `${state.storeInfo.city}، ${
                      state.storeInfo.address || ""
                    }`
                  : state.storeInfo?.address || "آدرس ثبت نشده"}
              </p>
              {state.storeInfo?.province && (
                <p className="text-indigo-200/70 text-[10px] mt-0.5">
                  {state.storeInfo.province}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center relative hover:bg-white/20 transition-colors border border-white/10 group"
              aria-label="اعلان‌ها"
            >
              <Bell className="w-5 h-5" strokeWidth={2} />
              {lowStockCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-indigo-700"
                />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-rose-500/80 hover:text-white transition-colors border border-white/10"
              aria-label="خروج"
            >
              <LogOut className="w-4 h-4 ml-0.5" strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 relative z-10"
        >
          <Link
            to="/add-product"
            className="flex-[3] bg-white text-indigo-900 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:bg-indigo-50 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            افزودن کالای جدید
          </Link>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              updateState({
                editingStore: !state.editingStore,
              })
            }
            className="flex-[2] bg-white/15 backdrop-blur-md text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
          >
            <Edit className="w-5 h-5" strokeWidth={2} />
            ویرایش فروشگاه
          </motion.button>
        </motion.div>
      </header>

      {/* Edit Store Form */}
      <AnimatePresence>
        {state.editingStore && (
          <StoreEditForm
            editForm={editForm}
            onFormChange={setEditForm}
            onSave={handleSaveStore}
            onClose={() =>
              updateState({ editingStore: false })
            }
            isSaving={state.savingStore}
          />
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="px-4 -mt-10 relative z-20 mb-6">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 p-4 grid grid-cols-2 gap-3 border border-gray-100/50"
        >
          {stats.map((stat, i) => (
            <StatCardComponent
              key={i}
              stat={stat}
              index={i}
            />
          ))}
        </motion.div>

        {/* Low Stock Alert */}
        <LowStockAlert count={lowStockCount} />
      </div>

      {/* Chart Section */}
      <ChartSection
        chartPeriod={state.chartPeriod}
        onPeriodChange={(period) =>
          updateState({ chartPeriod: period })
        }
      />

      {/* Products Section */}
      <ProductsSection
        products={state.products}
        filteredProducts={filteredProducts}
        loading={state.productsLoading}
        searchQuery={state.searchQuery}
        statusFilter={state.statusFilter}
        deletingId={state.deletingId}
        updatingId={state.updatingId}
        onSearchChange={(query) =>
          updateState({ searchQuery: query })
        }
        onStatusFilterChange={(filter) =>
          updateState({ statusFilter: filter })
        }
        onStatusChange={handleStatusChange}
        onTogglePublic={handleTogglePublic}
        onDelete={handleDelete}
        onShare={handleShare}
      />

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-4 mb-6 grid grid-cols-2 gap-3"
      >
        {[
          {
            to: "/messages",
            label: "گفتگوها",
            text: "مدیریت پیام‌ها",
            icon: MessageCircle,
          },
          {
            to: "/seller/settings",
            label: "تنظیمات",
            text: "تنظیمات فروشگاه",
            icon: Settings,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group active:scale-95"
            >
              <div>
                <p className="text-xs text-gray-500 font-bold">
                  {item.label}
                </p>
                <p className="text-sm font-black text-gray-900 mt-1 group-hover:text-indigo-600 transition-colors">
                  {item.text}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-indigo-600" strokeWidth={2} />
              </div>
            </Link>
          );
        })}
      </motion.div>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 0.5,
          type: "spring",
          stiffness: 200,
          damping: 15,
        }}
        className="fixed bottom-24 left-4 z-50"
      >
        <Link
          to="/add-product"
          className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:shadow-xl hover:shadow-indigo-500/40 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-all"
          aria-label="افزودن کالای جدید"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </Link>
      </motion.div>
    </motion.div>
  );
}