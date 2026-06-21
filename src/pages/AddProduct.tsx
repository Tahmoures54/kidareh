import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  UploadCloud,
  Image as ImageIcon,
  X,
  Package,
  DollarSign,
  CheckCircle2,
  Camera,
  Tag,
  Sparkles,
  Zap,
  AlertCircle,
  AlignRight,
  List,
  Gift,
  ShoppingBag,
  Flame,
  Loader2,
  TrendingUp,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { compressImage } from "../utils/imageCompression";
import { categoriesData } from "../data/categories";
import { useAuth } from "../context/AuthContext";

// ==================== TYPES ====================

interface BadgeOption {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  description?: string;
}

interface BadgeInventoryItem {
  name: string;
  count: number;
}

interface GenerateDescriptionResponse {
  success: boolean;
  data?: { description?: string };
  error?: string;
}

interface CreateProductResponse {
  success: boolean;
  error?: string;
  productId?: number;
}

interface FormState {
  name: string;
  price: string;
  description: string;
  category: string;
  status: "موجود" | "ناموجود";
  selectedBadge: string | null;
  imagePreview: string | null;
}

interface CompressionState {
  originalSize: number | null;
  compressedSize: number | null;
  isCompressing: boolean;
}

interface UIState {
  isGeneratingDesc: boolean;
  isSubmitting: boolean;
  submitError: string;
}

// ==================== CONSTANTS ====================

const BADGE_INVENTORY: Record<string, number> = {
  "بلک فرایدی": 1,
  "جشنواره نوروزی": 0,
  "جشنواره بهاری": 0,
  "جشنواره یلدا": 2,
  "حراج آخر فصل": 0,
  "پرفروش‌ترین": 1,
  "موجود شد": 0,
  "تخفیف دانشجویی": 0,
  "تخفیف ویژه": 3,
  "فروش ویژه": 0,
  "حراج": 5,
  "خرید عمده": 0,
  "جدید": 2,
  "پیشنهاد ویژه": 0,
};

const BADGES: BadgeOption[] = [
  {
    id: "بلک فرایدی",
    name: "بلک فرایدی",
    icon: Flame,
    color: "from-gray-800 to-black",
    description: "بیشترین توجه",
  },
  {
    id: "جشنواره نوروزی",
    name: "جشنواره نوروزی",
    icon: Sparkles,
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "جشنواره بهاری",
    name: "جشنواره بهاری",
    icon: Gift,
    color: "from-pink-400 to-rose-500",
  },
  {
    id: "جشنواره یلدا",
    name: "جشنواره یلدا",
    icon: ShoppingBag,
    color: "from-red-600 to-red-800",
  },
  {
    id: "پیشنهاد ویژه",
    name: "پیشنهاد ویژه",
    icon: Sparkles,
    color: "from-fuchsia-400 to-fuchsia-600",
  },
  {
    id: "پرفروش‌ترین",
    name: "پرفروش‌ترین",
    icon: Flame,
    color: "from-amber-400 to-yellow-500",
  },
  {
    id: "تخفیف ویژه",
    name: "تخفیف ویژه",
    icon: Tag,
    color: "from-red-500 to-rose-600",
  },
  {
    id: "جدید",
    name: "جدید",
    icon: Sparkles,
    color: "from-cyan-400 to-cyan-600",
  },
  {
    id: "حراج",
    name: "حراج",
    icon: Zap,
    color: "from-purple-500 to-fuchsia-600",
  },
];

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15,
    },
  },
};

// ==================== HELPERS ====================

/**
 * تبدیل اعداد فارسی/عربی به انگلیسی
 */
function toEnglishDigits(str: string): string {
  const persianDigits = [
    /۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g,
  ];
  const arabicDigits = [
    /٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g,
  ];

  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result
      .replace(persianDigits[i], String(i))
      .replace(arabicDigits[i], String(i));
  }
  return result;
}

/**
 * فرمت بایت به واحد خوانا
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${
    sizes[i]
  }`;
}

/**
 * فرمت قیمت با جداکننده هزارگان
 */
function formatPriceDisplay(price: string): string {
  const numbers = toEnglishDigits(price).replace(/\D/g, "");
  if (!numbers) return "";
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * تعداد کل نشان‌های موجود
 */
function getTotalBadgeCount(): number {
  return Object.values(BADGE_INVENTORY).reduce((a, b) => a + b, 0);
}

// ==================== COMPONENTS ====================

/**
 * Header Component
 */
interface HeaderProps {
  onBack: () => void;
}

function Header({ onBack }: HeaderProps): JSX.Element {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 px-4 py-4 flex items-center justify-between bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100"
    >
      <div className="flex items-center gap-3 flex-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="p-2 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all shadow-sm active:scale-95"
          aria-label="بازگشت"
        >
          <ArrowRight className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
        </motion.button>

        <h1 className="text-xl font-black text-gray-900">ثبت کالای جدید</h1>
      </div>

      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 opacity-20"
      />
    </motion.header>
  );
}

/**
 * Image Upload Section
 */
interface ImageUploadProps {
  preview: string | null;
  isCompressing: boolean;
  originalSize: number | null;
  compressedSize: number | null;
  onSelectImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
}

function ImageUpload({
  preview,
  isCompressing,
  originalSize,
  compressedSize,
  onSelectImage,
  onRemoveImage,
  fileInputRef,
  cameraInputRef,
}: ImageUploadProps): JSX.Element {
  return (
    <motion.div
      variants={ITEM_VARIANTS}
      className="card p-5 relative overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
        <ImageIcon className="w-5 h-5 text-teal-500" strokeWidth={2} />
        <h3>تصویر کالا (اختیاری)</h3>
      </div>

      {/* Hidden inputs */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={onSelectImage}
        className="hidden"
        aria-label="انتخاب عکس از گالری"
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={onSelectImage}
        className="hidden"
        aria-label="عکس با دوربین"
      />

      {/* Content */}
      <AnimatePresence mode="wait">
        {isCompressing ? (
          <motion.div
            key="compressing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-48 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 border-dashed flex flex-col items-center justify-center text-teal-600"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-8 h-8 mb-3" />
            </motion.div>
            <p className="font-bold text-sm">در حال بهینه‌سازی عکس...</p>
          </motion.div>
        ) : preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" }}
            className="relative h-56 rounded-2xl overflow-hidden shadow-lg group"
          >
            <img
              src={preview}
              alt="پیش‌نمایش تصویر"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
            />

            {/* Remove button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={onRemoveImage}
              className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg active:scale-90 transition-all"
              aria-label="حذف عکس"
            >
              <X className="w-4 h-4" strokeWidth={3} />
            </motion.button>

            {/* Size info */}
            {originalSize && compressedSize && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-bold text-gray-700"
              >
                <span>
                  کاهش از{" "}
                  <b className="text-red-500" dir="ltr">
                    {formatBytes(originalSize)}
                  </b>
                </span>
                <span className="flex items-center gap-1">
                  به{" "}
                  <b className="text-green-500" dir="ltr">
                    {formatBytes(compressedSize)}
                  </b>
                  <Check className="w-3 h-3 text-green-500" strokeWidth={3} />
                </span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-teal-50 hover:border-teal-400 transition-all group"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-teal-500 mb-2 transition-colors" strokeWidth={1.5} />
              </motion.div>
              <span className="text-sm font-bold text-gray-600 group-hover:text-teal-600">
                انتخاب از گالری
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-cyan-50 hover:border-cyan-400 transition-all group"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
              >
                <Camera className="w-8 h-8 text-gray-400 group-hover:text-cyan-500 mb-2 transition-colors" strokeWidth={1.5} />
              </motion.div>
              <span className="text-sm font-bold text-gray-600 group-hover:text-cyan-600">
                عکس با دوربین
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Form Section
 */
interface FormSectionProps {
  name: string;
  onNameChange: (name: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  price: string;
  onPriceChange: (price: string) => void;
  status: "موجود" | "ناموجود";
  onStatusChange: (status: "موجود" | "ناموجود") => void;
}

function FormSection({
  name,
  onNameChange,
  category,
  onCategoryChange,
  price,
  onPriceChange,
  status,
  onStatusChange,
}: FormSectionProps): JSX.Element {
  return (
    <motion.div
      variants={ITEM_VARIANTS}
      className="card p-5 space-y-4"
    >
      {/* Product name */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
          <Package className="w-4 h-4" strokeWidth={2} />
          نام کالا *
        </label>
        <motion.input
          whileFocus={{ scale: 1.01 }}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="مثلاً: گوشی سامسونگ S24"
          className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-500 focus:ring-2 ring-teal-500/20 rounded-2xl py-3.5 px-4 outline-none transition-all font-medium text-gray-800 placeholder-gray-400"
        />
      </motion.div>

      {/* Category */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
          <List className="w-4 h-4" strokeWidth={2} />
          دسته‌بندی *
        </label>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full appearance-none bg-gray-50 border-2 border-gray-200 focus:border-teal-500 focus:ring-2 ring-teal-500/20 rounded-2xl py-3.5 px-4 outline-none transition-all font-medium text-gray-800 cursor-pointer"
          >
            <option value="">انتخاب کنید...</option>
            {categoriesData.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={2} />
        </div>
      </motion.div>

      {/* Price and Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4"
      >
        {/* Price */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" strokeWidth={2} />
            قیمت (تومان)
          </label>
          <motion.input
            whileFocus={{ scale: 1.01 }}
            type="text"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="توافقی"
            dir="ltr"
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-500 focus:ring-2 ring-teal-500/20 rounded-2xl py-3.5 px-4 outline-none transition-all font-bold text-gray-800 text-left placeholder-gray-400 placeholder:text-right"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2.5">وضعیت</label>
          <div className="flex bg-gray-50 border-2 border-gray-200 rounded-2xl p-1.5 gap-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onStatusChange("موجود")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                status === "موجود"
                  ? "bg-white text-teal-600 shadow-sm border-2 border-teal-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              موجود
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onStatusChange("ناموجود")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                status === "ناموجود"
                  ? "bg-white text-rose-600 shadow-sm border-2 border-rose-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              ناموجود
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Description Section with AI
 */
interface DescriptionSectionProps {
  description: string;
  onDescriptionChange: (desc: string) => void;
  onGenerateDescription: () => Promise<void>;
  isGenerating: boolean;
  productName: string;
}

function DescriptionSection({
  description,
  onDescriptionChange,
  onGenerateDescription,
  isGenerating,
  productName,
}: DescriptionSectionProps): JSX.Element {
  return (
    <motion.div
      variants={ITEM_VARIANTS}
      className="card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <AlignRight className="w-4 h-4 text-gray-400" strokeWidth={2} />
          توضیحات (اختیاری)
        </label>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={onGenerateDescription}
          disabled={isGenerating || !productName}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              تولید...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
              هوشمند
            </>
          )}
        </motion.button>
      </div>

      <motion.textarea
        whileFocus={{ scale: 1.01 }}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="ویژگی‌ها، شرایط فروش یا جزئیات کالا را بنویسید..."
        rows={4}
        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-500 focus:ring-2 ring-teal-500/20 rounded-2xl p-4 outline-none transition-all text-sm font-medium text-gray-800 placeholder-gray-400 resize-none leading-relaxed"
      />
    </motion.div>
  );
}

/**
 * Badge Section
 */
interface BadgeSectionProps {
  selectedBadge: string | null;
  onBadgeSelect: (badge: string | null) => void;
  totalBadges: number;
}

function BadgeSection({
  selectedBadge,
  onBadgeSelect,
  totalBadges,
}: BadgeSectionProps): JSX.Element {
  return (
    <motion.div
      variants={ITEM_VARIANTS}
      className="space-y-3 relative z-10 w-full overflow-hidden"
    >
      <div className="flex items-center gap-2 px-1">
        <TrendingUp className="w-5 h-5 text-indigo-500" strokeWidth={2} />
        <h3 className="font-bold text-gray-800">
          نشان ویژه (
          <motion.span
            animate={{ color: totalBadges === 0 ? "#ef4444" : "#4f46e5" }}
            className="font-black"
          >
            {totalBadges} موجودی
          </motion.span>
          )
        </h3>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-4 pt-2 scrollbar-hide snap-x">
        {BADGES.map((badge) => {
          const count = BADGE_INVENTORY[badge.name] || 0;
          const isSelected = selectedBadge === badge.name;
          const isDisabled = count === 0;
          const BadgeIcon = badge.icon;

          return (
            <motion.button
              key={badge.name}
              whileHover={!isDisabled ? { scale: 1.05, y: -4 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              type="button"
              disabled={isDisabled}
              onClick={() =>
                onBadgeSelect(isSelected ? null : badge.name)
              }
              className={`snap-center shrink-0 w-[140px] p-3 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all duration-300 relative border-2 ${
                isSelected
                  ? "border-teal-500 bg-teal-50/50 shadow-lg"
                  : isDisabled
                  ? "border-gray-200 bg-gray-50 opacity-50 grayscale cursor-not-allowed"
                  : "border-gray-200 bg-white hover:border-teal-200 shadow-sm hover:shadow-md"
              }`}
            >
              {/* Icon */}
              <motion.div
                animate={{
                  scale: isSelected ? 1.15 : 1,
                  rotate: isSelected ? 360 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${badge.color} text-white shadow-md`}
              >
                <BadgeIcon className="w-5 h-5" strokeWidth={1.5} />
              </motion.div>

              {/* Name */}
              <span
                className={`text-xs font-black text-center leading-tight ${
                  isSelected ? "text-teal-700" : "text-gray-700"
                }`}
              >
                {badge.name}
              </span>

              {/* Count */}
              <motion.span
                animate={{
                  scale: isSelected ? 1.1 : 1,
                }}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  isSelected
                    ? "bg-teal-100 text-teal-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {count} موجود
              </motion.span>

              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center shadow-lg"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Error Alert
 */
interface ErrorAlertProps {
  message: string;
}

function ErrorAlert({ message }: ErrorAlertProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -10 }}
      transition={{ type: "spring" }}
      className="overflow-hidden"
    >
      <div className="bg-rose-50 border-l-4 border-rose-500 rounded-lg p-4 flex items-start gap-3 text-sm font-bold text-rose-700">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2} />
        <p>{message}</p>
      </div>
    </motion.div>
  );
}

/**
 * Submit Button
 */
interface SubmitButtonProps {
  isSubmitting: boolean;
}

function SubmitButton({ isSubmitting }: SubmitButtonProps): JSX.Element {
  return (
    <motion.button
      whileHover={!isSubmitting ? { scale: 1.02 } : {}}
      whileTap={!isSubmitting ? { scale: 0.95 } : {}}
      type="submit"
      disabled={isSubmitting}
      className="w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 flex justify-center items-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          در حال ثبت...
        </>
      ) : (
        <>
          <CheckCircle2 className="w-5 h-5" />
          ثبت نهایی کالا
        </>
      )}
    </motion.button>
  );
}

// ==================== MAIN COMPONENT ====================

export default function AddProduct(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ===== Refs =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ===== Form State =====
  const [formState, setFormState] = useState<FormState>({
    name: "",
    price: "",
    description: "",
    category:
      localStorage.getItem("lastSelectedCategory") || "",
    status: "موجود",
    selectedBadge: null,
    imagePreview: null,
  });

  // ===== Compression State =====
  const [compressionState, setCompressionState] =
    useState<CompressionState>({
      originalSize: null,
      compressedSize: null,
      isCompressing: false,
    });

  // ===== UI State =====
  const [uiState, setUIState] = useState<UIState>({
    isGeneratingDesc: false,
    isSubmitting: false,
    submitError: "",
  });

  // ===== Auth Check =====
  useEffect(() => {
    if (!user) {
      navigate("/login", {
        state: { from: "/add-product" },
      });
    }
  }, [user, navigate]);

  // ===== Event Handlers =====
  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("لطفاً یک فایل تصویری انتخاب کنید.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("حجم فایل نباید بیشتر از 10 مگابایت باشد.");
        return;
      }

      setCompressionState({
        originalSize: file.size,
        compressedSize: null,
        isCompressing: true,
      });

      try {
        const compressedBase64 = (await compressImage(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.7,
          outputType: "base64",
          fillWhiteBackground: true,
        })) as string;

        const approxSize = Math.round(
          (compressedBase64.length * 3) / 4
        );

        setCompressionState({
          originalSize: file.size,
          compressedSize: approxSize,
          isCompressing: false,
        });

        setFormState((prev) => ({
          ...prev,
          imagePreview: compressedBase64,
        }));
      } catch (error) {
        console.error("Image compression error:", error);
        alert("خطا در فشرده‌سازی تصویر.");
        setCompressionState({
          originalSize: null,
          compressedSize: null,
          isCompressing: false,
        });
      }
    },
    []
  );

  const handleRemoveImage = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      imagePreview: null,
    }));

    setCompressionState({
      originalSize: null,
      compressedSize: null,
      isCompressing: false,
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, []);

  const handleGenerateDescription = useCallback(async () => {
    if (!formState.name.trim()) {
      alert("ابتدا لطفاً نام کالا را وارد کنید.");
      return;
    }

    setUIState((prev) => ({
      ...prev,
      isGeneratingDesc: true,
    }));

    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          category: formState.category,
        }),
      });

      const data =
        (await response.json()) as GenerateDescriptionResponse;

      if (data.success && data.data?.description) {
        setFormState((prev) => ({
          ...prev,
          description: data.data!.description!,
        }));
      } else {
        alert(
          data.error || "سرور نتوانست توضیحی تولید کند."
        );
      }
    } catch (error) {
      console.error("AI generate error:", error);
      alert("خطا در ارتباط با هوش مصنوعی.");
    } finally {
      setUIState((prev) => ({
        ...prev,
        isGeneratingDesc: false,
      }));
    }
  }, [formState.name, formState.category]);

  const validateForm = useCallback((): string | null => {
    if (!formState.name.trim()) {
      return "نام کالا الزامی است";
    }
    if (formState.name.trim().length < 3) {
      return "نام کالا باید حداقل ۳ حرف باشد";
    }
    if (!formState.category) {
      return "لطفاً دسته‌بندی را انتخاب کنید";
    }
    if (formState.price) {
      const numPrice = parseInt(
        formState.price.replace(/,/g, ""),
        10
      );
      if (Number.isNaN(numPrice)) {
        return "قیمت وارد شده معتبر نیست";
      }
      if (numPrice < 0) {
        return "قیمت نمی‌تواند منفی باشد";
      }
      if (numPrice > 10000000000) {
        return "قیمت بیش از حد مجاز است";
      }
    }
    return null;
  }, [formState.name, formState.category, formState.price]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const validationError = validateForm();
      if (validationError) {
        setUIState((prev) => ({
          ...prev,
          submitError: validationError,
        }));
        return;
      }

      setUIState((prev) => ({
        ...prev,
        isSubmitting: true,
        submitError: "",
      }));

      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: formState.name.trim(),
            price: formState.price
              ? formState.price.replace(/,/g, "")
              : "",
            description: formState.description.trim(),
            category: formState.category,
            status: formState.status,
            image: formState.imagePreview,
            badge: formState.selectedBadge,
          }),
        });

        const data =
          (await response.json()) as CreateProductResponse;

        if (response.ok && data.success) {
          if (formState.category) {
            localStorage.setItem(
              "lastSelectedCategory",
              formState.category
            );
          }
          navigate("/seller", {
            state: { successMsg: "کالا با موفقیت ثبت شد!" },
          });
        } else {
          setUIState((prev) => ({
            ...prev,
            submitError: data.error || "خطا در ثبت کالا",
          }));
        }
      } catch (error) {
        console.error("Submit error:", error);
        setUIState((prev) => ({
          ...prev,
          submitError:
            "خطای ارتباط با سرور. لطفاً دوباره تلاش کنید.",
        }));
      } finally {
        setUIState((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      }
    },
    [formState, validateForm, navigate]
  );

  // ===== Auth check rendering =====
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-10 h-10 text-teal-600" />
        </motion.div>
      </div>
    );
  }

  // ===== Main render =====
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen bg-gray-50 pb-28 md:pb-12"
      dir="rtl"
    >
      {/* Header */}
      <Header onBack={() => navigate(-1)} />

      {/* Main form */}
      <form
        onSubmit={handleSubmit}
        className="px-4 pt-6 max-w-lg mx-auto w-full flex flex-col flex-1"
      >
        <motion.div
          variants={CONTAINER_VARIANTS}
          initial="hidden"
          animate="visible"
          className="space-y-6 pb-24"
        >
          {/* Image upload */}
          <ImageUpload
            preview={formState.imagePreview}
            isCompressing={compressionState.isCompressing}
            originalSize={compressionState.originalSize}
            compressedSize={compressionState.compressedSize}
            onSelectImage={handleImageSelect}
            onRemoveImage={handleRemoveImage}
            fileInputRef={fileInputRef}
            cameraInputRef={cameraInputRef}
          />

          {/* Form fields */}
          <FormSection
            name={formState.name}
            onNameChange={(name) =>
              setFormState((prev) => ({ ...prev, name }))
            }
            category={formState.category}
            onCategoryChange={(category) =>
              setFormState((prev) => ({ ...prev, category }))
            }
            price={formState.price}
            onPriceChange={(price) =>
              setFormState((prev) => ({
                ...prev,
                price: formatPriceDisplay(price),
              }))
            }
            status={formState.status}
            onStatusChange={(status) =>
              setFormState((prev) => ({ ...prev, status }))
            }
          />

          {/* Description */}
          <DescriptionSection
            description={formState.description}
            onDescriptionChange={(description) =>
              setFormState((prev) => ({
                ...prev,
                description,
              }))
            }
            onGenerateDescription={handleGenerateDescription}
            isGenerating={uiState.isGeneratingDesc}
            productName={formState.name}
          />

          {/* Badges */}
          <BadgeSection
            selectedBadge={formState.selectedBadge}
            onBadgeSelect={(badge) =>
              setFormState((prev) => ({
                ...prev,
                selectedBadge: badge,
              }))
            }
            totalBadges={getTotalBadgeCount()}
          />

          {/* Error message */}
          {uiState.submitError && (
            <ErrorAlert message={uiState.submitError} />
          )}
        </motion.div>

        {/* Submit button - Fixed at bottom */}
        <div className="fixed bottom-4 left-0 right-0 w-full px-4 max-w-lg mx-auto z-50">
          <SubmitButton isSubmitting={uiState.isSubmitting} />
        </div>
      </form>
    </motion.div>
  );
}