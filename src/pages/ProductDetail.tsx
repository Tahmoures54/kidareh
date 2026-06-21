import React, { 
  useEffect, 
  useState, 
  useCallback, 
  useMemo, 
  useRef,
  ReactNode 
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  Share2,
  MapPin,
  Store,
  Phone,
  MessageCircle,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Bell,
  ThumbsUp,
  MessageSquare,
  Star,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPinIcon,
  Loader2,
  Check,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getBadgeStyle, formatPrice } from "../utils";
import { useAuth } from "../context/AuthContext";
import { apiRequest, ApiError } from "../utils/api";

// ==================== TYPES ====================

interface ProductData {
  id: number;
  name: string;
  price: number | string;
  status: string;
  badge?: string;
  image_url?: string;
  images?: string[];
  description?: string;
  category?: string;
  views?: number;
  clicks?: number;
  saves?: number;
  created_at: string;
  updated_at?: string;
  store_id: number;
  store_name?: string;
  store_phone?: string;
  store_city?: string;
  store_province?: string;
  has_business_license?: boolean;
  lat?: number;
  lng?: number;
  address?: string;
  moderation_status?: string;
}

interface Review {
  id: number;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
  helpful_count?: number;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  saved?: boolean;
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface ComponentState {
  isSaved: boolean;
  saveLoading: boolean;
  showPhone: boolean;
  showReportModal: boolean;
  reportReason: string;
  isSubmittingReport: boolean;
  hasRequestedNotify: boolean;
  notifyLoading: boolean;
  commentError: string;
  isSubmittingComment: boolean;
  toast: string;
  currentImageIndex: number;
  showImageGallery: boolean;
}

// ==================== CONSTANTS ====================

const FALLBACK_IMAGE = "https://placehold.co/800x800/f3f4f6/a1a1aa?text=No+Image";
const TOAST_DURATION = 1800;
const MIN_COMMENT_LENGTH = 1;
const MAX_COMMENT_LENGTH = 1000;

// ==================== HELPERS ====================

/**
 * محاسبه فاصله بین دو نقطه جغرافیایی
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  if (!lat1 || !lon1 || !lat2 || !lon2) return "نامشخص";

  const R = 6371; // شعاع زمین (کیلومتر)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) return `${Math.round(distance * 1000)} متر`;
  return `${distance.toFixed(1)} کیلومتر`;
}

/**
 * بررسی وضعیت موجودی کالا
 */
function isAvailableStatus(status?: string): boolean {
  const normalized = (status || "").trim().toLowerCase();
  return (
    normalized === "موجود" ||
    normalized === "available" ||
    normalized === "in_stock"
  );
}

/**
 * استخراج URL نقشه گوگل
 */
function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// ==================== SKELETON LOADER ====================

function ProductDetailSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50" dir="rtl">
      {/* Image skeleton */}
      <div className="h-80 bg-gradient-to-b from-gray-200 to-gray-100 animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>

      {/* Content skeleton */}
      <div className="px-4 py-6 -mt-6 bg-white rounded-t-[2.5rem] relative z-20 space-y-4">
        {/* Badges */}
        <div className="flex gap-2">
          <div className="w-16 h-6 bg-gray-200 rounded-md animate-pulse" />
          <div className="w-12 h-6 bg-gray-100 rounded-md animate-pulse" />
        </div>

        {/* Title */}
        <div className="w-3/4 h-7 bg-gray-200 rounded-lg animate-pulse" />

        {/* Price card */}
        <div className="w-full h-24 bg-gray-100 rounded-2xl animate-pulse" />

        {/* Store card */}
        <div className="w-full h-32 bg-gray-100 rounded-2xl animate-pulse" />

        {/* Description */}
        <div className="space-y-2">
          <div className="w-1/3 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-full h-20 bg-gray-100 rounded-2xl animate-pulse" />
        </div>

        {/* Reviews section */}
        <div className="w-full h-40 bg-gray-100 rounded-2xl animate-pulse mt-6" />
      </div>
    </div>
  );
}

// ==================== ERROR STATE ====================

interface ErrorStateProps {
  errorText: string;
  onRetry: () => void;
  onBack: () => void;
}

function ErrorState({
  errorText,
  onRetry,
  onBack,
}: ErrorStateProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 text-center"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-lg"
      >
        <AlertTriangle className="w-12 h-12 text-red-500" strokeWidth={1.5} />
      </motion.div>

      <h2 className="text-2xl font-black text-gray-900 mb-2">کالا یافت نشد!</h2>
      <p className="text-sm text-gray-600 mb-8 max-w-sm leading-relaxed">
        {errorText || "خطا در دریافت اطلاعات کالا"}
      </p>

      <div className="flex gap-3 w-full max-w-xs">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-800 px-6 py-3.5 rounded-xl font-bold hover:bg-gray-300 transition-colors active:scale-95 shadow-md"
        >
          بازگشت
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 shadow-md"
        >
          تلاش مجدد
        </motion.button>
      </div>
    </motion.div>
  );
}

// ==================== TOAST COMPONENT ====================

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
}

function Toast({ message, type = "success" }: ToastProps): JSX.Element {
  const bgColor = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type];

  const icon = {
    success: <Check className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    info: <Bell className="w-4 h-4" />,
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] ${bgColor} text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/20 backdrop-blur-md`}
    >
      {icon}
      {message}
    </motion.div>
  );
}

// ==================== REPORT MODAL ====================

interface ReportModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}

function ReportModal({
  isOpen,
  isSubmitting,
  reason,
  onReasonChange,
  onSubmit,
  onClose,
}: ReportModalProps): JSX.Element {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-900">گزارش تخلف</h3>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors active:scale-95"
                  aria-label="بستن"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </motion.button>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                اگر این آگهی مغایر با قوانین است، لطفاً برای ما گزارش دهید.
              </p>

              {/* Textarea */}
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="توضیحات مشکل (الزامی)..."
                maxLength={500}
                rows={4}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 resize-none mb-4 transition-all"
              />

              {/* Character count */}
              <p className="text-xs text-gray-400 mb-4 text-right">
                {reason.length}/500
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors active:scale-95"
                  disabled={isSubmitting}
                >
                  انصراف
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onSubmit}
                  disabled={isSubmitting || !reason.trim()}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      درحال ارسال...
                    </>
                  ) : (
                    "ثبت گزارش"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== IMAGE GALLERY ====================

interface ImageGalleryProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  productName: string;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

function ImageGallery({
  isOpen,
  images,
  currentIndex,
  productName,
  onClose,
  onPrevious,
  onNext,
}: ImageGalleryProps): JSX.Element {
  return (
    <AnimatePresence>
      {isOpen && images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Close button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors active:scale-95"
            aria-label="بستن گالری"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </motion.button>

          {/* Main image */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center max-w-full max-h-full"
          >
            <img
              src={images[currentIndex]}
              alt={productName}
              className="max-w-full max-h-[90vh] object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
              }}
            />
          </motion.div>

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              {/* Previous button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors active:scale-95"
                aria-label="تصویر قبلی"
              >
                <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
              </motion.button>

              {/* Next button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors active:scale-95"
                aria-label="تصویر بعدی"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
              </motion.button>

              {/* Counter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold"
              >
                {(currentIndex + 1).toLocaleString("fa-IR")} /{" "}
                {images.length.toLocaleString("fa-IR")}
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== REVIEW FORM ====================

interface ReviewFormProps {
  rating: number;
  comment: string;
  authorName: string;
  isSubmitting: boolean;
  error: string;
  isLoggedIn: boolean;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onAuthorNameChange: (name: string) => void;
  onSubmit: () => Promise<void>;
}

function ReviewForm({
  rating,
  comment,
  authorName,
  isSubmitting,
  error,
  isLoggedIn,
  onRatingChange,
  onCommentChange,
  onAuthorNameChange,
  onSubmit,
}: ReviewFormProps): JSX.Element {
  const isValid = comment.trim().length >= MIN_COMMENT_LENGTH;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-5"
    >
      <h4 className="text-xs font-black text-gray-900 mb-4 flex items-center gap-1.5">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        ثبت نظر جدید
      </h4>

      <div className="space-y-4">
        {/* Rating stars */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 font-bold">امتیاز:</span>
          <div className="flex gap-1" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => onRatingChange(star)}
                className="focus:outline-none transition-transform"
                aria-label={`امتیاز ${star}`}
              >
                <Star
                  className={`w-5 h-5 transition-all ${
                    star <= rating
                      ? "fill-amber-400 text-amber-400 drop-shadow-md"
                      : "text-gray-300 hover:text-gray-400"
                  }`}
                  strokeWidth={1.5}
                />
              </motion.button>
            ))}
          </div>
          <span className="text-xs text-gray-500 font-medium ml-2">
            {rating}/5
          </span>
        </div>

        {/* Author name (if not logged in) */}
        {!isLoggedIn && (
          <input
            type="text"
            placeholder="نام شما (اختیاری)"
            value={authorName}
            onChange={(e) => onAuthorNameChange(e.target.value)}
            maxLength={50}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        )}

        {/* Comment textarea */}
        <div className="relative">
          <textarea
            rows={4}
            placeholder="تجربه خرید خود را بنویسید... (حداقل ۱ کاراکتر)"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            maxLength={MAX_COMMENT_LENGTH}
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 resize-none pb-12 transition-all"
          />

          {/* Character counter */}
          <span className="absolute bottom-3 left-3 text-[9px] text-gray-400 font-medium">
            {comment.length}/{MAX_COMMENT_LENGTH}
          </span>

          {/* Submit button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !isValid}
            className="absolute bottom-2 left-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-2.5 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            aria-label="ارسال نظر"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 -rotate-45" />
            )}
          </motion.button>
        </div>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-600 font-bold flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// ==================== REVIEW ITEM ====================

interface ReviewItemProps {
  review: Review;
}

function ReviewItem({ review }: ReviewItemProps): JSX.Element {
  const firstChar = (review.author_name || "ک").charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black rounded-full flex items-center justify-center text-xs shadow-md">
            {firstChar}
          </div>

          <div>
            <h5 className="text-xs font-black text-gray-900">
              {review.author_name || "کاربر ناشناس"}
            </h5>
            <span className="text-[9px] text-gray-400 font-medium">
              {new Date(review.created_at).toLocaleDateString("fa-IR", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Rating */}
        <div className="flex gap-0.5" dir="ltr">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={idx}
              className={`w-3.5 h-3.5 ${
                idx < review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-200"
              }`}
              strokeWidth={2}
            />
          ))}
        </div>
      </div>

      {/* Comment content */}
      <p className="text-xs text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">
        {review.content}
      </p>

      {/* Helpful count */}
      {review.helpful_count && review.helpful_count > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-500 font-medium"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          {Number(review.helpful_count).toLocaleString("fa-IR")} نفر مفید دانستند
        </motion.div>
      )}
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ProductDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth() as { user: any };

  // ===== State =====
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [componentState, setComponentState] = useState<ComponentState>({
    isSaved: false,
    saveLoading: false,
    showPhone: false,
    showReportModal: false,
    reportReason: "",
    isSubmittingReport: false,
    hasRequestedNotify: false,
    notifyLoading: false,
    commentError: "",
    isSubmittingComment: false,
    toast: "",
    currentImageIndex: 0,
    showImageGallery: false,
  });

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [comments, setComments] = useState<Review[]>([]);

  const [reviewForm, setReviewForm] = useState({
    comment: "",
    rating: 5,
    authorName: "",
  });

  // ===== Refs =====
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  // ===== State updater helper =====
  const updateState = useCallback(
    (updates: Partial<ComponentState>) => {
      if (!mountedRef.current) return;
      setComponentState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const showToast = useCallback(
    (message: string) => {
      updateState({ toast: message });
    },
    [updateState]
  );

  // ===== Effect: Cleanup =====
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      document.title = "کی داره؟";
    };
  }, []);

  // ===== Effect: Toast timeout =====
  useEffect(() => {
    if (!componentState.toast) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) updateState({ toast: "" });
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [componentState.toast, updateState]);

  // ===== Effect: Geolocation =====
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mountedRef.current) {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      (error) => console.warn("Geolocation error:", error)
    );
  }, []);

  // ===== Effect: Keyboard navigation for gallery =====
  useEffect(() => {
    if (!componentState.showImageGallery) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        updateState({ showImageGallery: false });
      }
      if (e.key === "ArrowLeft") {
        setComponentState((prev) => ({
          ...prev,
          currentImageIndex:
            prev.currentImageIndex > 0
              ? prev.currentImageIndex - 1
              : images.length - 1,
        }));
      }
      if (e.key === "ArrowRight") {
        setComponentState((prev) => ({
          ...prev,
          currentImageIndex:
            prev.currentImageIndex < images.length - 1
              ? prev.currentImageIndex + 1
              : 0,
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [componentState.showImageGallery, updateState]);

  // ===== Fetch product =====
  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorText("");

    try {
      const data = await apiRequest<ProductData>(
        `/api/products/${id}`,
        { method: "GET", auth: false }
      );
      if (!mountedRef.current) return;
      setProductData(data);
      document.title = `${data.name} | کی داره؟`;
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError && err.status === 404) {
        setErrorText("این کالا یافت نشد یا حذف شده است.");
      } else {
        setErrorText("خطا در دریافت اطلاعات کالا.");
        console.error("Fetch product error:", err);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  // ===== Fetch reviews =====
  const fetchReviews = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiRequest<Review[]>(
        `/api/products/${id}/reviews`,
        { method: "GET", auth: false }
      );
      if (!mountedRef.current) return;
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("Fetch reviews error:", err);
      setComments([]);
    }
  }, [id]);

  // ===== Effect: Load data =====
  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [fetchProduct, fetchReviews]);

  // ===== Handle share =====
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: productData?.name || "کی داره؟",
          text: `ببین چی پیدا کردم: ${productData?.name || ""}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("لینک کپی شد");
      }
    } catch (error) {
      console.warn("Share error:", error);
    }
  }, [productData?.name, showToast]);

  // ===== Handle save =====
  const handleSave = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!id || componentState.saveLoading) return;

    const previousState = componentState.isSaved;
    const newState = !previousState;
    updateState({ isSaved: newState, saveLoading: true });

    try {
      const res = await apiRequest<ApiResponse, { productId: number; save: boolean }>(
        "/api/products/save",
        {
          method: "POST",
          body: { productId: Number(id), save: newState },
        }
      );

      if (!mountedRef.current) return;
      if (typeof res?.saved === "boolean") {
        updateState({ isSaved: res.saved });
      }
      showToast(newState ? "ذخیره شد" : "از ذخیره خارج شد");
    } catch (err: any) {
      if (!mountedRef.current) return;
      updateState({ isSaved: previousState });
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login");
      } else {
        showToast("خطا در ذخیره‌سازی");
      }
    } finally {
      if (mountedRef.current) updateState({ saveLoading: false });
    }
  }, [user, id, componentState.saveLoading, componentState.isSaved, navigate, updateState, showToast]);

  // ===== Handle open map =====
  const handleOpenMap = useCallback(() => {
    if (!productData?.lat || !productData?.lng) {
      showToast("مختصات این فروشگاه ثبت نشده");
      return;
    }
    const mapUrl = getGoogleMapsUrl(productData.lat, productData.lng);
    window.open(mapUrl, "_blank", "noopener,noreferrer");
  }, [productData, showToast]);

  // ===== Handle submit comment =====
  const handleSubmitComment = useCallback(async () => {
    if (!id) return;

    const trimmedComment = reviewForm.comment.trim();
    if (!trimmedComment || trimmedComment.length < MIN_COMMENT_LENGTH) {
      updateState({
        commentError: "متن نظر نمی‌تواند خالی باشد.",
      });
      return;
    }

    updateState({ isSubmittingComment: true, commentError: "" });

    try {
      const newReview = await apiRequest<Review, {
        author_name: string;
        rating: number;
        content: string;
      }>(
        `/api/products/${id}/reviews`,
        {
          method: "POST",
          body: {
            author_name:
              reviewForm.authorName || user?.name || "کاربر ناشناس",
            rating: reviewForm.rating,
            content: trimmedComment,
          },
          auth: !!user,
        }
      );

      if (!mountedRef.current) return;
      setComments((prev) => [newReview, ...prev]);
      setReviewForm({ comment: "", rating: 5, authorName: "" });
      showToast("نظر شما ثبت شد");
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login");
        return;
      }
      updateState({
        commentError: "خطا در ثبت نظر. لطفاً دوباره تلاش کنید.",
      });
      console.error("Submit comment error:", err);
    } finally {
      if (mountedRef.current) updateState({ isSubmittingComment: false });
    }
  }, [id, reviewForm, user, navigate, updateState, showToast]);

  // ===== Handle submit report =====
  const handleSubmitReport = useCallback(async () => {
    if (!id) return;
    const trimmedReason = componentState.reportReason.trim();
    if (!trimmedReason) {
      showToast("لطفاً دلیل گزارش را وارد کنید");
      return;
    }

    updateState({ isSubmittingReport: true });
    try {
      await apiRequest<ApiResponse, {
        productId: number;
        reason: string;
        userId?: number;
      }>(`/api/reports`, {
        method: "POST",
        body: {
          productId: Number(id),
          reason: trimmedReason,
          userId: user?.id,
        },
        auth: !!user,
      });

      if (!mountedRef.current) return;
      showToast("گزارش شما ثبت شد");
      updateState({ showReportModal: false, reportReason: "" });
    } catch (error) {
      console.error("Submit report error:", error);
      showToast("خطا در ثبت گزارش");
    } finally {
      if (mountedRef.current) updateState({ isSubmittingReport: false });
    }
  }, [id, componentState.reportReason, user, updateState, showToast]);

  // ===== Handle request notify =====
  const handleRequestNotify = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!id || componentState.notifyLoading) return;

    updateState({ notifyLoading: true });
    try {
      await apiRequest<ApiResponse, { userId: number }>(
        `/api/products/${id}/notify`,
        {
          method: "POST",
          body: { userId: user.id },
        }
      );
      if (!mountedRef.current) return;
      updateState({ hasRequestedNotify: true });
      showToast("با موجود شدن کالا اطلاع می‌دهیم");
    } catch (error) {
      console.error("Request notify error:", error);
      showToast("ثبت درخواست اطلاع‌رسانی ناموفق بود");
    } finally {
      if (mountedRef.current) updateState({ notifyLoading: false });
    }
  }, [user, id, componentState.notifyLoading, navigate, updateState, showToast]);

  // ===== Memoized values =====
  const images = useMemo(() => {
    if (!productData) return [];
    const list = Array.isArray(productData.images)
      ? productData.images.filter(Boolean)
      : productData.image_url
      ? [productData.image_url]
      : [];
    return list.length ? list : [FALLBACK_IMAGE];
  }, [productData]);

  const distance = useMemo(() => {
    if (!userLocation || !productData?.lat || !productData?.lng) {
      return "نامشخص";
    }
    return calculateDistance(
      userLocation.lat,
      userLocation.lng,
      productData.lat,
      productData.lng
    );
  }, [userLocation, productData?.lat, productData?.lng]);

  const priceFormatted = useMemo(
    () => formatPrice(productData?.price ?? 0),
    [productData?.price]
  );

  const statusDisplay = useMemo(
    () =>
      isAvailableStatus(productData?.status)
        ? "موجود"
        : productData?.status || "نامشخص",
    [productData?.status]
  );

  const storeName = productData?.store_name || "فروشگاه";
  const phone = productData?.store_phone || "تماس نامشخص";

  const avgRating = useMemo(() => {
    if (!comments.length) return "5.0";
    const sum = comments.reduce((acc, c) => acc + (Number(c.rating) || 0), 0);
    return (sum / comments.length).toFixed(1);
  }, [comments]);

  // ===== Scroll to image helper =====
  const scrollToImage = useCallback((idx: number) => {
    updateState({ currentImageIndex: idx });
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        left: idx * container.clientWidth,
        behavior: "smooth",
      });
    }
  }, [updateState]);

  // ===== Render loading =====
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  // ===== Render error =====
  if (!productData || errorText) {
    return (
      <ErrorState
        errorText={errorText}
        onRetry={fetchProduct}
        onBack={() => navigate(-1)}
      />
    );
  }

  // ===== Render main =====
  return (
    <div
      className="flex flex-col min-h-screen bg-gray-50 pb-[max(5.5rem,env(safe-area-inset-bottom))]"
      dir="rtl"
    >
      {/* Toast */}
      <AnimatePresence>
        {componentState.toast && (
          <Toast message={componentState.toast} type="success" />
        )}
      </AnimatePresence>

      {/* Header with overlays */}
      <header className="absolute top-0 w-full px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 flex items-center justify-between z-10 bg-gradient-to-b from-black/40 via-black/20 to-transparent pointer-events-none">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white transition-colors active:scale-95 pointer-events-auto"
          aria-label="بازگشت"
        >
          <ArrowRight className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
        </motion.button>

        <div className="flex gap-2 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white transition-colors active:scale-95"
            aria-label="اشتراک‌گذاری"
          >
            <Share2 className="w-5 h-5 text-gray-900" strokeWidth={2} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={componentState.saveLoading}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white transition-colors active:scale-95 disabled:opacity-60"
            aria-label="ذخیره"
          >
            {componentState.saveLoading ? (
              <Loader2 className="w-5 h-5 text-gray-900 animate-spin" />
            ) : (
              <Heart
                className={`w-5 h-5 transition-colors ${
                  componentState.isSaved
                    ? "fill-red-500 text-red-500"
                    : "text-gray-900"
                }`}
                strokeWidth={componentState.isSaved ? 0 : 2}
              />
            )}
          </motion.button>
        </div>
      </header>

      {/* Image carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-80 bg-gray-300 overflow-hidden cursor-pointer group"
        onClick={() => images.length > 0 && updateState({ showImageGallery: true })}
      >
        <div
          ref={scrollContainerRef}
          className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
          onScroll={(e) => {
            const index = Math.round(
              e.currentTarget.scrollLeft / e.currentTarget.clientWidth
            );
            if (mountedRef.current) {
              updateState({ currentImageIndex: index });
            }
          }}
        >
          {images.map((img, idx) => (
            <img
              key={`${img}-${idx}`}
              src={img}
              alt={`${productData.name} - ${idx + 1}`}
              className="w-full h-full object-cover shrink-0 snap-center"
              referrerPolicy="no-referrer"
              loading={idx === 0 ? "eager" : "lazy"}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
              }}
            />
          ))}
        </div>

        {/* Dot indicators */}
        {images.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10"
          >
            {images.map((_, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToImage(idx);
                }}
                className={`rounded-full transition-all ${
                  idx === componentState.currentImageIndex
                    ? "w-6 h-2 bg-white shadow-lg"
                    : "w-2 h-2 bg-white/60 hover:bg-white/80"
                }`}
                aria-label={`تصویر ${idx + 1}`}
              />
            ))}
          </motion.div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
          >
            {(componentState.currentImageIndex + 1).toLocaleString("fa-IR")} /{" "}
            {images.length.toLocaleString("fa-IR")}
          </motion.div>
        )}

        {/* View counter */}
        {productData.views ? (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-20 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg"
          >
            <Eye className="w-3.5 h-3.5" />
            {Number(productData.views).toLocaleString("fa-IR")}
          </motion.div>
        ) : null}

        {/* Image hint overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/20 flex items-center justify-center z-5"
        >
          <div className="flex flex-col items-center gap-2 text-white">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs font-bold">برای بزرگ‌نمایی کلیک کنید</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Content section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6 -mt-6 bg-white rounded-t-[2.5rem] relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex-1"
      >
        {/* Category and status badges */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {productData.category && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm"
              >
                {productData.category}
              </motion.span>
            )}

            {productData.badge && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-[10px] px-3 py-1.5 rounded-lg font-black shadow-sm ${getBadgeStyle(
                  productData.badge
                )}`}
              >
                {productData.badge}
              </motion.span>
            )}
          </div>

          <motion.div
            animate={{
              scale: statusDisplay === "موجود" ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`text-[11px] px-3 py-1.5 rounded-full font-black flex items-center gap-1.5 shadow-sm ${
              statusDisplay === "موجود"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusDisplay === "موجود"
                  ? "bg-green-500 animate-pulse"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            {statusDisplay}
          </motion.div>
        </div>

        {/* Product title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-black text-gray-900 leading-snug mb-4"
        >
          {productData.name}
        </motion.h1>

        {/* Price card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-end justify-between bg-gradient-to-br from-gray-50 via-white to-gray-50 p-5 rounded-2xl border-2 border-gray-100 shadow-sm mb-6 hover:border-indigo-200 transition-colors"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              قیمت کالا
            </span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-l from-teal-600 via-emerald-500 to-green-500 tracking-tight drop-shadow-sm">
              {priceFormatted}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] text-gray-600 font-bold flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {new Date(productData.created_at).toLocaleDateString("fa-IR", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>

            {productData.saves && productData.saves > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] text-rose-500 font-black flex items-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500" strokeWidth={0} />
                {Number(productData.saves).toLocaleString("fa-IR")} ذخیره
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Store card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-5 mb-6 border-l-4 border-indigo-500 border-r border-t border-b border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Store avatar */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center border-2 border-indigo-300 shadow-md"
              >
                <Store className="w-7 h-7 text-white" strokeWidth={1.5} />
              </motion.div>

              {/* Store info */}
              <div className="flex-1">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                  {storeName}
                  {productData.has_business_license && (
                    <motion.span
                      whileHover={{ scale: 1.1 }}
                      title="دارای مجوز کسب و کار"
                    >
                      <ShieldCheck className="w-4 h-4 text-teal-500 drop-shadow-md" />
                    </motion.span>
                  )}
                </h3>

                <div className="flex items-center gap-3 text-[11px] text-gray-600 mt-2 font-bold">
                  {/* Distance */}
                  <div className="flex items-center gap-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    فاصله:
                    <span className="font-black text-indigo-600">{distance}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {avgRating}
                  </div>
                </div>
              </div>
            </div>

            {/* Store button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/store/${productData.store_id}`)}
              className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100 active:scale-95 shadow-sm"
            >
              ویترین
            </motion.button>
          </div>

          {/* Address */}
          {productData.address && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-xs text-gray-700 mt-4 pt-4 border-t border-gray-100 leading-relaxed font-medium bg-gray-50 p-3 rounded-xl flex items-start gap-2.5"
            >
              <MapPinIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span>{productData.address}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Description */}
        {productData.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              توضیحات کالا
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 shadow-sm whitespace-pre-line hover:border-gray-200 transition-colors">
              {productData.description}
            </p>
          </motion.div>
        )}

        {/* Safety warning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-2xl p-4 mb-6 border border-amber-200/60 flex items-start gap-3 shadow-sm"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-amber-100"
          >
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </motion.div>

          <div>
            <h4 className="font-black text-amber-900 text-xs mb-1">
              🛡️ هشدار ایمنی
            </h4>
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              پیش از هر معاملهٔ مالی، صحت و سلامت کالا را حضوری بررسی کنید.
              «کی‌داره؟» مسئولیتی در قبال معاملات شما ندارد.
            </p>
          </div>
        </motion.div>

        {/* Report button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => updateState({ showReportModal: true })}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gray-50 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-100 transition-colors border border-gray-200 mb-8 active:scale-95 shadow-sm"
        >
          <AlertTriangle className="w-4 h-4" />
          گزارش تخلف یا مشکل
        </motion.button>

        {/* Reviews section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-t border-gray-100 pt-6"
        >
          <h3 className="text-sm font-black text-gray-900 mb-5 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            نظرات خریداران
            <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-lg">
              {comments.length.toLocaleString("fa-IR")}
            </span>
          </h3>

          {/* Review form */}
          <ReviewForm
            rating={reviewForm.rating}
            comment={reviewForm.comment}
            authorName={reviewForm.authorName}
            isSubmitting={componentState.isSubmittingComment}
            error={componentState.commentError}
            isLoggedIn={!!user}
            onRatingChange={(rating) =>
              setReviewForm((prev) => ({ ...prev, rating }))
            }
            onCommentChange={(comment) =>
              setReviewForm((prev) => ({ ...prev, comment }))
            }
            onAuthorNameChange={(authorName) =>
              setReviewForm((prev) => ({ ...prev, authorName }))
            }
            onSubmit={handleSubmitComment}
          />

          {/* Reviews list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="space-y-3"
          >
            {comments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm"
              >
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-xs text-gray-500 font-medium">
                  هنوز نظری ثبت نشده
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  اولین نظر را شما ثبت کنید
                </p>
              </motion.div>
            ) : (
              comments.map((comment, idx) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <ReviewItem review={comment} />
                </motion.div>
              ))
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Bottom action bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-xl border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-3 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
      >
        {statusDisplay === "ناموجود" ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRequestNotify}
            disabled={
              componentState.hasRequestedNotify ||
              componentState.notifyLoading
            }
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/30 py-4 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {componentState.notifyLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            {componentState.hasRequestedNotify
              ? "درخواست ثبت شد"
              : "موجود شد اطلاع بده"}
          </motion.button>
        ) : (
          <>
            {/* Map button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenMap}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all py-4 active:scale-95"
            >
              <Navigation className="w-5 h-5" />
              مسیریابی
            </motion.button>

            {/* Call button */}
            {componentState.showPhone ? (
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all py-4 active:scale-95"
              >
                <Phone className="w-5 h-5" />
                <span className="truncate">{phone}</span>
              </motion.a>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateState({ showPhone: true })}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all py-4 active:scale-95"
              >
                <Phone className="w-5 h-5" />
                تماس
              </motion.button>
            )}

            {/* Chat button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                navigate(
                  `/chat/${productData.store_id}?product=${productData.id}`
                )
              }
              className="w-14 h-14 bg-gradient-to-br from-sky-50 to-blue-50 text-sky-600 border-2 border-sky-100 rounded-2xl flex items-center justify-center hover:border-sky-200 hover:bg-sky-100 transition-all shrink-0 shadow-md active:scale-95 relative overflow-hidden"
              aria-label="گفتگو"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-sky-400/20 rounded-2xl"
              />
              <MessageCircle className="w-6 h-6 relative z-10" strokeWidth={2} />
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-1 right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-md"
              />
            </motion.button>
          </>
        )}
      </motion.div>

      {/* Modals */}
      <ReportModal
        isOpen={componentState.showReportModal}
        isSubmitting={componentState.isSubmittingReport}
        reason={componentState.reportReason}
        onReasonChange={(reason) => updateState({ reportReason: reason })}
        onSubmit={handleSubmitReport}
        onClose={() => updateState({ showReportModal: false, reportReason: "" })}
      />

      <ImageGallery
        isOpen={componentState.showImageGallery}
        images={images}
        currentIndex={componentState.currentImageIndex}
        productName={productData.name}
        onClose={() => updateState({ showImageGallery: false })}
        onPrevious={() =>
          updateState({
            currentImageIndex:
              componentState.currentImageIndex > 0
                ? componentState.currentImageIndex - 1
                : images.length - 1,
          })
        }
        onNext={() =>
          updateState({
            currentImageIndex:
              componentState.currentImageIndex < images.length - 1
                ? componentState.currentImageIndex + 1
                : 0,
          })
        }
      />
    </div>
  );
}