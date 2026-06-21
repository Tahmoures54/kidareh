// src/components/WalletBalance.tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Landmark,
  TrendingUp,
  Eye,
  EyeOff,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Shield,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface WalletBalanceProps {
  /** موجودی فعلی */
  balance: number;
  /** حداقل مبلغ برداشت */
  minWithdrawal: number;
  /** آیا می‌تواند برداشت کند */
  canWithdraw: boolean;
  /** ارز (پیش‌فرض: تومان) */
  currency?: string;
  /** آیا داده‌ها در حال بارگذاری هستند */
  loading?: boolean;
  /** آخرین زمان بروزرسانی */
  lastUpdated?: string;
  /** تابع برای بروزرسانی دستی */
  onRefresh?: () => Promise<void>;
  /** آیا بروزرسانی در حال انجام است */
  isRefreshing?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * فرمت کردن عدد به شیوه فارسی
 */
function formatNumber(num: number, locale = "fa-IR"): string {
  return num.toLocaleString(locale);
}

/**
 * محاسبه رنگ بر اساس وضعیت موجودی
 */
function getBalanceStatus(balance: number, minWithdrawal: number) {
  const percentage = (balance / minWithdrawal) * 100;

  if (percentage >= 100) {
    return { color: "text-emerald-400", bg: "from-emerald-500 to-teal-500", status: "کامل" };
  } else if (percentage >= 75) {
    return { color: "text-cyan-400", bg: "from-cyan-500 to-blue-500", status: "خوب" };
  } else if (percentage >= 50) {
    return { color: "text-amber-400", bg: "from-amber-500 to-orange-500", status: "متوسط" };
  } else {
    return { color: "text-rose-400", bg: "from-rose-500 to-pink-500", status: "پایین" };
  }
}

/**
 * تبدیل تاریخ به فرمت قابل‌درک
 */
function formatTimeAgo(dateString: string | undefined): string | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "همین الآن";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} دقیقه پیش`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ساعت پیش`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} روز پیش`;

    return date.toLocaleDateString("fa-IR");
  } catch {
    return null;
  }
}

// ============================================================================
// کامپوننت‌های کمکی
// ============================================================================

/**
 * اسکلتون بارگذاری
 */
const BalanceSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-4"
  >
    <div className="h-12 bg-white/10 rounded-xl animate-pulse" />
    <div className="h-3 bg-white/10 rounded-lg animate-pulse w-2/3" />
  </motion.div>
);

/**
 * نشان وضعیت موجودی
 */
interface StatusBadgeProps {
  canWithdraw: boolean;
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ canWithdraw, status }) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 400 }}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border backdrop-blur-sm transition-all ${
      canWithdraw
        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
        : "bg-rose-500/20 text-rose-300 border-rose-400/30"
    }`}
  >
    {canWithdraw ? (
      <>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <CheckCircle2 className="w-4 h-4" />
        </motion.div>
        آماده برداشت
      </>
    ) : (
      <>
        <AlertCircle className="w-4 h-4" />
        موجودی ناکافی
      </>
    )}
  </motion.div>
);

/**
 * نوار پیشرفت
 */
interface ProgressBarProps {
  progress: number;
  remaining: number;
  minWithdrawal: number;
  currency: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  remaining,
  minWithdrawal,
  currency,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
  >
    {/* متن و درصد */}
    <div className="flex items-center justify-between">
      <label className="text-xs font-black text-indigo-200 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        پیشرفت تا حداقل برداشت
      </label>
      <motion.span
        key={Math.round(progress)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        className="text-xs font-black text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-lg"
      >
        {Math.round(progress)}%
      </motion.span>
    </div>

    {/* نوار */}
    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: "easeOut", type: "spring" }}
        className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.6)]"
      />

      {/* نقاط درخشان */}
      {progress > 0 && (
        <>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"
            style={{ left: `${Math.max(progress - 5, 0)}%` }}
          />
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"
            style={{ left: `${Math.max(progress - 15, 0)}%` }}
          />
        </>
      )}
    </div>

    {/* اطلاعات باقی‌مانده */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center justify-between pt-2 border-t border-white/10"
    >
      <span className="text-[11px] text-indigo-300/80">تا حداقل برداشت:</span>
      <span className="text-xs font-black text-amber-300">
        {formatNumber(remaining)} {currency}
      </span>
    </motion.div>
  </motion.div>
);

/**
 * فوتر کارت با اطلاعات تکمیلی
 */
interface CardFooterProps {
  minWithdrawal: number;
  currency: string;
  lastUpdated?: string;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const CardFooter: React.FC<CardFooterProps> = ({
  minWithdrawal,
  currency,
  lastUpdated,
  onRefresh,
  isRefreshing,
}) => {
  const timeAgo = useMemo(() => formatTimeAgo(lastUpdated), [lastUpdated]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="space-y-3 border-t border-white/10 pt-4"
    >
      {/* ردیف اول: حداقل برداشت و تاریخ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-200/80 text-[11px]">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="font-bold">
            حداقل تسویه: {formatNumber(minWithdrawal)} {currency}
          </span>
        </div>

        {timeAgo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-indigo-300/60 text-[10px] font-medium"
          >
            <Clock className="w-3.5 h-3.5" />
            {timeAgo}
          </motion.div>
        )}
      </div>

      {/* دکمه بروزرسانی */}
      {onRefresh && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs font-bold text-indigo-300 group"
        >
          <motion.div
            animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0 }}
          >
            <RefreshCw className="w-4 h-4 group-hover:text-indigo-200 transition-colors" />
          </motion.div>
          {isRefreshing ? "در حال بروزرسانی..." : "بروزرسانی دستی"}
        </motion.button>
      )}
    </motion.div>
  );
};

// ============================================================================
// کامپوننت اصلی
// ============================================================================

/**
 * کامپوننت نمایش موجودی کیف پول
 */
export default function WalletBalance({
  balance,
  minWithdrawal,
  canWithdraw,
  currency = "تومان",
  loading = false,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: WalletBalanceProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [showBalance, setShowBalance] = useState(true);
  const [animatedBalance, setAnimatedBalance] = useState(balance);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * بروزرسانی موجودی انیمیشن شده
   */
  useEffect(() => {
    if (!loading) {
      // انیمیشن صاف برای تغییر موجودی
      const interval = setInterval(() => {
        setAnimatedBalance((prev) => {
          const diff = balance - prev;
          const step = diff / 10;
          return Math.abs(diff) < 1 ? balance : prev + step;
        });
      }, 30);

      return () => clearInterval(interval);
    }
  }, [balance, loading]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /** درصد پیشرفت برای رسیدن به حداقل برداشت */
  const withdrawalProgress = useMemo(
    () => Math.min((balance / minWithdrawal) * 100, 100),
    [balance, minWithdrawal]
  );

  /** مبلغ باقی‌مانده برای رسیدن به حداقل */
  const remainingAmount = useMemo(
    () => Math.max(minWithdrawal - balance, 0),
    [balance, minWithdrawal]
  );

  /** وضعیت موجودی (رنگ و متن) */
  const balanceStatus = useMemo(
    () => getBalanceStatus(balance, minWithdrawal),
    [balance, minWithdrawal]
  );

  /** فرمت شده موجودی برای نمایش */
  const formattedBalance = useMemo(
    () => formatNumber(Math.floor(animatedBalance)),
    [animatedBalance]
  );

  /** زمان آخرین بروزرسانی */
  const timeAgo = useMemo(() => formatTimeAgo(lastUpdated), [lastUpdated]);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * تغییر نمایش/مخفی موجودی
   */
  const handleToggleBalance = useCallback(() => {
    setShowBalance((prev) => !prev);
  }, []);

  /**
   * بروزرسانی داده‌ها
   */
  const handleRefresh = useCallback(async () => {
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  }, [onRefresh, isRefreshing]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-950 p-6 text-white shadow-2xl shadow-indigo-900/30 border border-white/5 relative overflow-hidden"
    >
      {/* ============================================================
          پس‌زمینه تزئینی
          ============================================================ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl"
        />

        {/* Grid Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent" />
        </div>
      </div>

      {/* ============================================================
          محتوی اصلی
          ============================================================ */}
      <div className="relative z-10">
        {/* بخش هدر */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mb-6"
        >
          {/* عنوان و آیکون */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg border border-white/20"
            >
              <Landmark className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h2 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                موجودی قابل برداشت
              </h2>
              {timeAgo && (
                <p className="text-[9px] text-indigo-400/60 mt-0.5">
                  آخرین بروزرسانی: {timeAgo}
                </p>
              )}
            </div>
          </div>

          {/* دکمه نمایش/مخفی */}
          <motion.button
            whileTap={{ scale: 0.85, rotate: 10 }}
            onClick={handleToggleBalance}
            className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 flex items-center justify-center hover:bg-white/20 transition-all shadow-lg hover:shadow-xl"
          >
            <motion.div
              key={showBalance ? "eye-open" : "eye-closed"}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
            >
              {showBalance ? (
                <Eye className="w-5 h-5 text-indigo-300" />
              ) : (
                <EyeOff className="w-5 h-5 text-indigo-400" />
              )}
            </motion.div>
          </motion.button>
        </motion.div>

        {/* موجودی */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          {loading ? (
            <BalanceSkeleton />
          ) : (
            <AnimatePresence mode="wait">
              <div key={showBalance ? "visible" : "hidden"}>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="space-y-2"
                >
                  {/* متن موجودی */}
                  <motion.h3 className="text-5xl font-black tracking-tighter">
                    {showBalance ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={balanceStatus.color}
                      >
                        {formattedBalance}
                      </motion.span>
                    ) : (
                      "••••••••••"
                    )}
                  </motion.h3>

                  {/* واحد پول */}
                  <motion.p className="text-lg font-bold text-indigo-300/80">
                    {currency}
                  </motion.p>
                </motion.div>
              </div>
            </AnimatePresence>
          )}
        </motion.div>

        {/* نوار پیشرفت */}
        {!loading && balance < minWithdrawal && (
          <ProgressBar
            progress={withdrawalProgress}
            remaining={remainingAmount}
            minWithdrawal={minWithdrawal}
            currency={currency}
          />
        )}

        {/* بخش وضعیت */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="my-4 flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <span className="text-xs text-indigo-300 font-bold">وضعیت</span>
            <StatusBadge canWithdraw={canWithdraw} status={balanceStatus.status} />
          </motion.div>
        )}

        {/* فوتر */}
        {!loading && (
          <CardFooter
            minWithdrawal={minWithdrawal}
            currency={currency}
            lastUpdated={lastUpdated}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}
      </div>
    </motion.div>
  );
}