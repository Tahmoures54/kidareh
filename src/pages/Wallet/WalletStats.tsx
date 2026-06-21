// src/components/WalletStats.tsx
import React, { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Sparkles,
  ArrowUpRight,
  Zap,
  Target,
  Flame,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface WalletStatsProps {
  /** کل درآمد */
  totalEarned: number;
  /** تعداد کاربران دعوت‌شده */
  referredUsers: number;
  /** مجموع برداشت‌ها */
  totalWithdrawn?: number;
  /** کمیسیون در انتظار */
  pendingCommissions?: number;
  /** ارز (پیش‌فرض: تومان) */
  currency?: string;
  /** آیا درخواست‌های تسویه در حال بررسی هستند */
  hasPendingWithdrawals?: boolean;
  /** تابع برای کلیک روی آمار */
  onStatClick?: (stat: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * فرمت کردن عدد به شیوه فارسی
 */
function formatNumber(num: number): string {
  return num.toLocaleString("fa-IR");
}

/**
 * محاسبه درصد تغییر
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * دریافت رنگ بر اساس درصد تغییر
 */
function getChangeColor(percentage: number): string {
  if (percentage > 0) return "text-emerald-600 bg-emerald-100";
  if (percentage < 0) return "text-rose-600 bg-rose-100";
  return "text-gray-600 bg-gray-100";
}

// ============================================================================
// کامپوننت‌های کمکی
// ============================================================================

/**
 * کارت آمار با انیمیشن
 */
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  iconBg: string;
  index: number;
  trend?: number;
  isPending?: boolean;
  onClick?: () => void;
  badge?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  bgColor,
  textColor,
  borderColor,
  iconBg,
  index,
  trend,
  isPending,
  onClick,
  badge,
}) => (
  <motion.button
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{
      delay: index * 0.08,
      type: "spring",
      stiffness: 400,
      damping: 30,
    }}
    whileHover={{ y: -6, scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`rounded-2xl border ${borderColor} ${bgColor} backdrop-blur-sm p-5 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer`}
  >
    {/* پس‌زمینه تزئینی */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 rounded-full blur-2xl transition-opacity duration-300`} />
    </div>

    {/* محتوا */}
    <div className="relative z-10">
      {/* بخش بالا: آیکون و لیبل */}
      <div className="flex items-start justify-between mb-4">
        {/* آیکون */}
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shadow-lg border border-white/20`}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>

        {/* Badge (در صورت وجود) */}
        {badge && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-[9px] font-black border border-amber-200"
          >
            {badge}
          </motion.div>
        )}
      </div>

      {/* لیبل */}
      <p className="text-[11px] font-bold text-gray-600 mb-2">{label}</p>

      {/* مقدار */}
      <div className="mb-3">
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-lg font-black ${textColor} flex items-baseline gap-1`}
        >
          {formatNumber(value)}
          <span className="text-[10px] font-bold text-gray-500">{suffix}</span>
        </motion.p>
      </div>

      {/* اضافات: Trend یا Status */}
      <AnimatePresence mode="popLayout">
        {isPending ? (
          // وضعیت "در انتظار"
          <motion.div
            key="pending"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-amber-400"
            />
            در حال بررسی
          </motion.div>
        ) : trend !== undefined && trend !== 0 ? (
          // نمایش Trend
          <motion.div
            key={`trend-${trend}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${getChangeColor(trend)}`}
          >
            <ArrowUpRight
              className={`w-3 h-3 transition-transform ${trend < 0 ? "rotate-180" : ""}`}
            />
            {Math.abs(trend)}%
          </motion.div>
        ) : (
          // نشان (Sparkles یا Flame)
          <motion.div
            key="sparkles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1"
          >
            {value > 0 && (
              <>
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </motion.div>
                <span className="text-[9px] font-bold text-gray-600">فعال</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* خط تحتانی برای نشان دهنده‌ی فعالیت */}
    {value > 0 && (
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: index * 0.08 + 0.3, duration: 0.6 }}
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${color} origin-left`}
      />
    )}
  </motion.button>
);

/**
 * کارت خلاصه کل درآمد
 */
interface SummaryCardProps {
  totalEarned: number;
  totalWithdrawn: number;
  currency: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ totalEarned, totalWithdrawn, currency }) => {
  const remaining = totalEarned - totalWithdrawn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200/60 p-5 relative overflow-hidden"
    >
      {/* پس‌زمینه تزئینی */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-200/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* هدر */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-black text-indigo-900">خلاصه درآمد</h3>
        </div>

        {/* سطرها */}
        <div className="space-y-3">
          {/* کل درآمد */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-indigo-100">
            <span className="text-xs font-bold text-indigo-700">کل درآمد</span>
            <span className="text-sm font-black text-indigo-900">
              {formatNumber(totalEarned)} {currency}
            </span>
          </div>

          {/* برداشت‌ها */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-emerald-100">
            <span className="text-xs font-bold text-emerald-700">برداشت‌شده</span>
            <span className="text-sm font-black text-emerald-900">
              {formatNumber(totalWithdrawn)} {currency}
            </span>
          </div>

          {/* باقی‌مانده */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200">
            <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              موجودی فعلی
            </span>
            <span className="text-sm font-black text-purple-900">
              {formatNumber(remaining)} {currency}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// کامپوننت اصلی
// ============================================================================

/**
 * نمایش آمار کیف پول
 */
export default function WalletStats({
  totalEarned,
  referredUsers,
  totalWithdrawn = 0,
  pendingCommissions = 0,
  currency = "تومان",
  hasPendingWithdrawals = false,
  onStatClick,
}: WalletStatsProps) {
  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * تعریف آیتم‌های آمار
   */
  const items = useMemo(
    () => [
      {
        id: "total-earned",
        icon: TrendingUp,
        label: "کل درآمد",
        value: totalEarned,
        suffix: currency,
        color: "from-emerald-400 to-teal-500",
        bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200/60",
        iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
        badge: totalEarned > 1000000 ? "🔥 بالا" : undefined,
      },
      {
        id: "referred-users",
        icon: Users,
        label: "دعوت‌شده‌ها",
        value: referredUsers,
        suffix: "فروشگاه",
        color: "from-blue-400 to-cyan-500",
        bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200/60",
        iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
        badge: referredUsers >= 10 ? "⭐ برتر" : undefined,
      },
      {
        id: "total-withdrawn",
        icon: DollarSign,
        label: "مجموع برداشت",
        value: totalWithdrawn,
        suffix: currency,
        color: "from-amber-400 to-orange-500",
        bgColor: "bg-gradient-to-br from-amber-50 to-orange-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200/60",
        iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      },
      {
        id: "pending-commissions",
        icon: Award,
        label: "در انتظار",
        value: pendingCommissions,
        suffix: currency,
        color: "from-purple-400 to-pink-500",
        bgColor: "bg-gradient-to-br from-purple-50 to-pink-50",
        textColor: "text-purple-700",
        borderColor: "border-purple-200/60",
        iconBg: "bg-gradient-to-br from-purple-500 to-pink-500",
        isPending: pendingCommissions > 0,
        badge: hasPendingWithdrawals ? "⏳ در انتظار" : undefined,
      },
    ],
    [totalEarned, referredUsers, totalWithdrawn, pendingCommissions, currency, hasPendingWithdrawals]
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * کلیک روی آمار
   */
  const handleStatClick = useCallback(
    (statId: string) => {
      onStatClick?.(statId);
    },
    [onStatClick]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ============================================================
          گرید آمار
          ============================================================ */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.08 }}
      >
        {items.map((item, index) => (
          <StatCard
            key={item.id}
            {...item}
            index={index}
            onClick={() => handleStatClick(item.id)}
          />
        ))}
      </motion.div>

      {/* ============================================================
          کارت خلاصه (در صورت وجود برداشت)
          ============================================================ */}
      {totalWithdrawn > 0 && (
        <SummaryCard
          totalEarned={totalEarned}
          totalWithdrawn={totalWithdrawn}
          currency={currency}
        />
      )}

      {/* ============================================================
          کارت نکات مفید (در صورت درآمد صفر)
          ============================================================ */}
      {totalEarned === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/60 p-5 relative overflow-hidden"
        >
          {/* پس‌زمینه تزئینی */}
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-black text-blue-900 mb-1">
                🚀 شروع کنید!
              </h4>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                با دعوت دوستان و فروشندگان خود، درآمدهای تکراری کسب کنید و
                موجودی خود را افزایش دهید.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export type { WalletStatsProps };