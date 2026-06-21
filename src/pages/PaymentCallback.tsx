import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Copy,
  RefreshCw,
  AlertTriangle,
  Check,
  Sparkles,
  Clock,
  AlertCircle,
} from "lucide-react";

type VerifyStatus = "loading" | "success" | "error" | "expired";

interface VerifyResponse {
  success?: boolean;
  error?: string;
  message?: string;
  transactionId?: number;
  timestamp?: string;
  refId?: string;
}

interface PaymentState {
  status: VerifyStatus;
  errorMessage: string;
  trackingCode: string;
  copyDone: boolean;
  retryCount: number;
}

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;
const VERIFICATION_DEBOUNCE_MS = 800;

/**
 * استخراج پیام خطای ایمن و معتبر
 */
function getSafeErrorMessage(input?: string): string {
  if (!input) return "خطا در تایید پرداخت از سمت بانک یا سرور.";
  
  const msg = String(input).trim();
  if (!msg) return "خطا در تایید پرداخت از سمت بانک یا سرور.";
  
  // جلوگیری از پیام خیلی بلند برای جلوگیری از مشکل UX
  return msg.length > 220 ? `${msg.slice(0, 220)}...` : msg;
}

/**
 * تابع کمکی برای افزودن timeout به promise
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error("مهلت پاسخ بانک/سرور به پایان رسید.")),
      timeoutMs
    );

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * تایید اعتبار Transaction ID
 */
function validateTransactionId(id: string): number | null {
  const parsed = Number.parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Loading State Component
 */
function LoadingState(): JSX.Element {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.3 }}
      className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-white/80 w-full max-w-sm flex flex-col items-center text-center relative z-10"
    >
      {/* Icon with spinner */}
      <div className="relative mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
        />
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full flex items-center justify-center relative z-10">
          <ShieldCheck className="w-10 h-10 text-indigo-600" strokeWidth={1.5} />
        </div>
      </div>

      {/* Title and description */}
      <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">
        در حال استعلام از بانک...
      </h2>
      <p className="text-sm font-medium text-gray-600 mb-6">
        لطفاً صبور باشید و این صفحه را نبندید.
      </p>

      {/* Animated loading dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut",
            }}
            className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"
          />
        ))}
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-500 mt-6 px-4">
        اگر این صفحه بیش از ۳۰ ثانیه باقی بماند، صفحه را تازه کنید.
      </p>
    </motion.div>
  );
}

/**
 * Success State Component
 */
interface SuccessStateProps {
  trackingCode: string;
  onCopy: () => Promise<void>;
  copyDone: boolean;
  onNavigateHome: () => void;
  onNavigateSeller: () => void;
}

function SuccessState({
  trackingCode,
  onCopy,
  copyDone,
  onNavigateHome,
  onNavigateSeller,
}: SuccessStateProps): JSX.Element {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(34,197,94,0.15)] border border-green-100/50 w-full max-w-sm flex flex-col items-center text-center relative z-10"
    >
      {/* Success Icon with pulse animation */}
      <div className="relative mb-6">
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-green-400 rounded-[1.5rem] opacity-20"
        />
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 12,
            delay: 0.1,
          }}
          className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-[1.5rem] shadow-2xl shadow-green-500/30 flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* Success title with sparkle */}
      <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-1 flex items-center justify-center gap-2">
        پرداخت موفق!
        <motion.span animate={{ rotate: [0, 15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <Sparkles className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
        </motion.span>
      </h2>

      {/* Success badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xs font-bold text-green-700 mb-6 bg-green-50 px-4 py-2 rounded-lg border border-green-200/60 flex items-center gap-1.5"
      >
        <Check className="w-3.5 h-3.5" /> کیف پول شما شارژ شد و برچسب‌ها فعال شدند.
      </motion.div>

      {/* Receipt Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full bg-gradient-to-b from-gray-50 to-white rounded-2xl p-4 border-2 border-dashed border-gray-300 mb-6"
      >
        <h3 className="text-xs font-black text-gray-700 flex items-center justify-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-green-600" /> رسید الکترونیکی تراکنش
        </h3>

        {/* Status row */}
        <div className="flex items-center justify-between text-xs font-bold py-2.5 border-b border-gray-200/60">
          <span className="text-gray-600">وضعیت تراکنش:</span>
          <span className="text-green-700 bg-green-100 px-3 py-1 rounded-md font-black">
            ✓ تایید شده
          </span>
        </div>

        {/* Reference ID row */}
        <div className="flex items-center justify-between text-xs font-bold py-3">
          <span className="text-gray-600">شماره پیگیری:</span>
          <div className="flex items-center gap-2">
            <code className="text-gray-900 bg-gray-100 px-2.5 py-1.5 rounded-md font-mono tracking-widest text-[10px] font-black">
              {trackingCode}
            </code>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onCopy}
              className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition-colors active:scale-90"
              aria-label="کپی کد پیگیری"
              title="کپی کنید"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copyDone ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Check className="w-4 h-4 text-green-600" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Copy className="w-4 h-4" strokeWidth={2} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex w-full gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNavigateHome}
          className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all duration-200 active:scale-95 shadow-sm"
        >
          بازگشت به خانه
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNavigateSeller}
          className="flex-[2] py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-gray-900/25 hover:shadow-2xl hover:shadow-gray-900/35 transition-all duration-200 active:scale-95"
        >
          ورود به پنل فروشنده <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Error State Component
 */
interface ErrorStateProps {
  errorMessage: string;
  trackingCode: string;
  retryCount: number;
  onRetry: () => void;
  onSupport: () => void;
}

function ErrorState({
  errorMessage,
  trackingCode,
  retryCount,
  onRetry,
  onSupport,
}: ErrorStateProps): JSX.Element {
  return (
    <motion.div
      key="error"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(239,68,68,0.15)] border border-red-100/50 w-full max-w-sm flex flex-col items-center text-center relative z-10"
    >
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0, rotate: 25 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 12,
          delay: 0.1,
        }}
        className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 text-white rounded-[1.5rem] shadow-2xl shadow-red-500/30 flex items-center justify-center mb-6"
      >
        <XCircle className="w-12 h-12" strokeWidth={1.5} />
      </motion.div>

      {/* Error title */}
      <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
        پرداخت ناموفق بود!
      </h2>

      {/* Error message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xs font-bold text-red-800 mb-5 leading-relaxed bg-red-50 p-4 rounded-xl border border-red-200 flex gap-3 items-start"
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
        <span>{errorMessage}</span>
      </motion.div>

      {/* Tracking code card */}
      {trackingCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5 text-center"
        >
          <span className="block text-[11px] font-bold text-gray-500 mb-2">
            کد پیگیری شما (برای پشتیبانی):
          </span>
          <code className="font-mono text-sm font-black text-gray-900 tracking-wider">
            {trackingCode}
          </code>
        </motion.div>
      )}

      {/* Retry counter */}
      {retryCount > 0 && (
        <p className="text-xs text-gray-500 mb-4 bg-gray-100 px-3 py-1.5 rounded-md">
          تلاش {retryCount}/{MAX_RETRIES}
        </p>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex w-full gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSupport}
          className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-all duration-200 active:scale-95 shadow-sm"
        >
          <AlertTriangle className="w-4 h-4" /> پشتیبانی
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          disabled={retryCount >= MAX_RETRIES}
          className="flex-[2] py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 hover:shadow-2xl hover:shadow-indigo-600/35 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${retryCount > 0 ? "animate-spin" : ""}`} /> تلاش مجدد
        </motion.button>
      </motion.div>

      {retryCount >= MAX_RETRIES && (
        <p className="text-xs text-gray-600 mt-4 text-center">
          ⚠️ تعداد تلاش‌های مجدد به پایان رسید. لطفاً با پشتیبانی تماس بگیرید.
        </p>
      )}
    </motion.div>
  );
}

/**
 * Main PaymentCallback Component
 */
export default function PaymentCallback(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State management
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: "loading",
    errorMessage: "",
    trackingCode: "",
    copyDone: false,
    retryCount: 0,
  });

  // Refs for cleanup and abort
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized values
  const refId = useMemo(
    () => searchParams.get("refid") || searchParams.get("refId") || "",
    [searchParams]
  );

  const transactionId = useMemo(
    () => localStorage.getItem("pendingTransactionId") || "",
    []
  );

  /**
   * Clear payment-related cache from localStorage
   */
  const clearPendingPaymentCache = useCallback(() => {
    try {
      localStorage.removeItem("pendingTransactionId");
      localStorage.removeItem("pendingPaymentAmount");
    } catch (error) {
      console.warn("Failed to clear payment cache:", error);
    }
  }, []);

  /**
   * Update payment state
   */
  const updatePaymentState = useCallback(
    (updates: Partial<PaymentState>) => {
      if (!mountedRef.current) return;
      setPaymentState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  /**
   * Main payment verification logic
   */
  const verifyPayment = useCallback(async () => {
    // Clear previous timeout
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }

    updatePaymentState({
      status: "loading",
      errorMessage: "",
      copyDone: false,
    });

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Validation: Check refId
    if (!refId) {
      updatePaymentState({
        status: "error",
        errorMessage: "پرداخت لغو شده یا اطلاعات بازگشتی درگاه نامعتبر است.",
        trackingCode: "",
      });
      return;
    }

    // Validation: Check transactionId
    if (!transactionId) {
      updatePaymentState({
        status: "error",
        errorMessage:
          "شناسه تراکنش در مرورگر یافت نشد. اگر وجه کسر شده باشد، معمولاً تا ۷۲ ساعت برگشت می‌خورد.",
        trackingCode: refId,
      });
      return;
    }

    // Validation: Validate transactionId format
    const txIdNum = validateTransactionId(transactionId);
    if (!txIdNum) {
      updatePaymentState({
        status: "error",
        errorMessage: "شناسه تراکنش معتبر نیست. لطفاً با پشتیبانی تماس بگیرید.",
        trackingCode: refId,
      });
      return;
    }

    try {
      const token = localStorage.getItem("token") || "";
      const response = await withTimeout(
        fetch("/api/payment/verify", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            refId,
            transactionId: txIdNum,
          }),
          signal: controller.signal,
        })
      );

      if (!mountedRef.current) return;

      // Handle 401 Unauthorized
      if (response.status === 401) {
        updatePaymentState({
          status: "error",
          errorMessage: "نشست شما منقضی شده است. لطفاً دوباره وارد حساب کاربری شوید.",
          trackingCode: refId,
        });
        return;
      }

      // Parse response
      let data: VerifyResponse = {};
      try {
        data = (await response.json()) as VerifyResponse;
      } catch (parseError) {
        console.warn("Failed to parse JSON response:", parseError);
      }

      // Handle success
      if (response.ok && data?.success) {
        updatePaymentState({
          status: "success",
          trackingCode: refId,
        });
        clearPendingPaymentCache();
        return;
      }

      // Handle API error
      throw new Error(
        data?.error || data?.message || "پرداخت تایید نشد."
      );
    } catch (error: any) {
      if (!mountedRef.current) return;
      if (error?.name === "AbortError") return;

      const errorMsg = getSafeErrorMessage(error?.message);
      updatePaymentState({
        status: "error",
        errorMessage: errorMsg,
        trackingCode: refId || "",
      });
    }
  }, [refId, transactionId, updatePaymentState, clearPendingPaymentCache]);

  /**
   * Handle copy to clipboard
   */
  const handleCopyTrackCode = useCallback(async () => {
    if (!paymentState.trackingCode) return;

    try {
      await navigator.clipboard.writeText(paymentState.trackingCode);
      updatePaymentState({ copyDone: true });

      // Reset copy indicator after 1.5 seconds
      setTimeout(() => {
        if (mountedRef.current) {
          updatePaymentState({ copyDone: false });
        }
      }, 1500);
    } catch (error) {
      console.error("Failed to copy:", error);
      updatePaymentState({ copyDone: false });
    }
  }, [paymentState.trackingCode, updatePaymentState]);

  /**
   * Handle retry with counter
   */
  const handleRetry = useCallback(() => {
    if (paymentState.retryCount >= MAX_RETRIES) {
      return;
    }

    updatePaymentState({
      retryCount: paymentState.retryCount + 1,
    });

    // Debounce verification call
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }
    verifyTimeoutRef.current = setTimeout(() => {
      verifyPayment();
    }, VERIFICATION_DEBOUNCE_MS);
  }, [paymentState.retryCount, updatePaymentState, verifyPayment]);

  /**
   * Initial verification on mount
   */
  useEffect(() => {
    mountedRef.current = true;
    verifyPayment();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }
    };
  }, [verifyPayment]);

  return (
    <div
      className="flex flex-col min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-gray-50 items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
    >
      {/* Animated background glow */}
      <motion.div
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute top-0 right-0 w-96 h-96 blur-3xl pointer-events-none rounded-full ${
          paymentState.status === "success"
            ? "bg-green-400/40"
            : paymentState.status === "error"
            ? "bg-red-400/40"
            : "bg-indigo-400/40"
        }`}
      />

      {/* Secondary glow for depth */}
      <motion.div
        animate={{
          opacity: [0.1, 0.25, 0.1],
          scale: [1.1, 1, 1.1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className={`absolute bottom-0 left-0 w-96 h-96 blur-3xl pointer-events-none rounded-full ${
          paymentState.status === "success"
            ? "bg-green-300/20"
            : paymentState.status === "error"
            ? "bg-red-300/20"
            : "bg-indigo-300/20"
        }`}
      />

      {/* Main content */}
      <AnimatePresence mode="wait">
        {paymentState.status === "loading" && (
          <LoadingState />
        )}

        {paymentState.status === "success" && (
          <SuccessState
            trackingCode={paymentState.trackingCode}
            onCopy={handleCopyTrackCode}
            copyDone={paymentState.copyDone}
            onNavigateHome={() => navigate("/")}
            onNavigateSeller={() => navigate("/seller")}
          />
        )}

        {paymentState.status === "error" && (
          <ErrorState
            errorMessage={paymentState.errorMessage}
            trackingCode={paymentState.trackingCode}
            retryCount={paymentState.retryCount}
            onRetry={handleRetry}
            onSupport={() => navigate("/support")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}