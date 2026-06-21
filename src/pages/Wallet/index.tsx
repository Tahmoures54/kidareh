// src/pages/Wallet/index.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useClipboard } from "@/hooks/useClipboard";
import { MIN_WITHDRAWAL, REFERRAL_PERCENTAGE } from "@/utils/constants";

import WalletBalance from "./WalletBalance";
import WalletStats from "./WalletStats";
import ReferralCard from "./ReferralCard";
import WithdrawalForm from "./WithdrawalForm";
import TransactionList from "./TransactionList";

import {
  ArrowRight,
  TrendingUp,
  Bell,
  X,
  RefreshCw,
  Loader2,
  Sparkles,
  Wallet,
  AlertCircle,
} from "lucide-react";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// ============================================================================
// کامپوننت‌های کمکی
// ============================================================================

/**
 * Wrapper برای محدودیت‌های ایمن صفحه
 */
const SafeAreaWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="safe-area">{children}</div>
);

/**
 * اسکلتون بارگذاری با انیمیشن
 */
const LoadingSkeleton: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* هالو انیمیشن */}
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -inset-8 bg-gradient-to-r from-indigo-400 to-purple-400/20 blur-3xl rounded-full"
      />

      {/* آیکون اصلی */}
      <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl border border-white/20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <Loader2 className="w-10 h-10 text-white" />
        </motion.div>
      </div>
    </motion.div>

    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 text-sm font-bold text-gray-600"
    >
      در حال بارگذاری کیف پول شما...
    </motion.p>
  </div>
);

/**
 * کامپوننت Toast برای اطلاع‌رسانی
 */
interface ToastProps {
  message: string | null;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

const Toast: React.FC<ToastProps> = ({ message, onClose, type = "success" }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const bgColor = {
    success: "bg-emerald-900/90 border-emerald-700/50",
    error: "bg-red-900/90 border-red-700/50",
    info: "bg-blue-900/90 border-blue-700/50",
  };

  const icon = {
    success: <Sparkles className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Bell className="w-4 h-4 text-blue-400" />,
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 ${bgColor[type]} backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl z-50 text-sm font-bold border flex items-center gap-3 max-w-xs`}
        >
          {icon[type]}
          <span className="line-clamp-2">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * کارت خطا
 */
interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="bg-white rounded-3xl shadow-2xl border border-red-100 p-8 max-w-sm w-full text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6"
      >
        <AlertCircle className="w-8 h-8 text-red-500" />
      </motion.div>

      <h2 className="text-xl font-black text-gray-900 mb-3">خطا در بارگذاری</h2>
      <p className="text-sm text-gray-600 mb-8 leading-relaxed">{message}</p>

      <button
        onClick={onRetry}
        className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95 shadow-md"
      >
        <RefreshCw className="w-5 h-5" />
        تلاش مجدد
      </button>
    </motion.div>
  </div>
);

// ============================================================================
// کامپوننت اصلی
// ============================================================================

/**
 * صفحه کیف پول
 */
export default function WalletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const { copy, copied } = useClipboard();

  const { stats, transactions, loading, error, submitWithdrawal, refreshData } = useWallet();

  // State Management
  const [showNotification, setShowNotification] = useState(true);
  const [toast, setToast] = useState<{ message: string | null; type: "success" | "error" | "info" }>({
    message: null,
    type: "info",
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * ردیابی بازدید صفحه
   */
  useEffect(() => {
    if (stats?.balance !== undefined) {
      trackEvent?.("wallet_page_view", {
        balance: stats.balance,
        role: user?.role,
        hasStats: Boolean(stats),
      });
    }
  }, [stats?.balance, user?.role, trackEvent]);

  /**
   * پنهان کردن اطلاع رسان برای کاربران غیر بازاریاب
   */
  useEffect(() => {
    if (user?.role !== "marketer") {
      setShowNotification(false);
    }
  }, [user?.role]);

  /**
   * اتو‌پنهان کردن اطلاع رسان بعد از 10 ثانیه
   */
  useEffect(() => {
    if (!showNotification) return;
    const timer = setTimeout(() => setShowNotification(false), 10000);
    return () => clearTimeout(timer);
  }, [showNotification]);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * کپی کد معرفی
   */
  const handleCopy = useCallback(() => {
    if (!stats?.referralCode) {
      setToast({ message: "کد معرفی موجود نیست", type: "error" });
      return;
    }

    copy(stats.referralCode);
    setToast({ message: "کد معرفی کپی شد! ✓", type: "success" });
    trackEvent?.("referral_code_copied", {
      code: stats.referralCode,
      timestamp: new Date().toISOString(),
    });
  }, [stats?.referralCode, copy, trackEvent]);

  /**
   * اشتراک کد معرفی
   */
  const handleShare = useCallback(async () => {
    if (!stats?.referralCode) {
      setToast({ message: "کد معرفی موجود نیست", type: "error" });
      return;
    }

    const shareText = `🎉 با کد معرفی من در کی‌داره ثبت‌نام کن!\n\n📌 کد: ${stats.referralCode}\n\n💰 با خرید سرویس ویژه، ${REFERRAL_PERCENTAGE}% پورسانت به من می‌رسد.\n\n🔗 https://kidareh.com`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "کد معرفی کی‌داره",
          text: shareText,
        });
        trackEvent?.("referral_code_shared", {
          method: "native",
          code: stats.referralCode,
        });
      } else {
        copy(shareText);
        setToast({ message: "متن معرفی کپی شد! اکنون می‌تواند اشتراک کنید", type: "success" });
        trackEvent?.("referral_code_shared", {
          method: "clipboard",
          code: stats.referralCode,
        });
      }
    } catch (err) {
      // کاربر عملیات اشتراک را لغو کرد
      trackEvent?.("referral_share_cancelled", { code: stats.referralCode });
    }
  }, [stats?.referralCode, copy, trackEvent]);

  /**
   * ارسال درخواست تسویه
   */
  const handleWithdrawSubmit = useCallback(
    async (data: any) => {
      if (!stats) {
        setToast({ message: "اطلاعات کیف پول دریافت نشد", type: "error" });
        return;
      }

      const withdrawAmount = data?.amount ?? stats.balance;

      if (withdrawAmount < MIN_WITHDRAWAL) {
        setToast({
          message: `حداقل مبلغ تسویه ${MIN_WITHDRAWAL.toLocaleString()} تومان است`,
          type: "error",
        });
        return;
      }

      setIsWithdrawing(true);
      trackEvent?.("withdrawal_initiated", {
        amount: withdrawAmount,
        balance: stats.balance,
        timestamp: new Date().toISOString(),
      });

      try {
        await submitWithdrawal(data);
        setToast({
          message: "✓ درخواست تسویه شما با موفقیت ثبت شد",
          type: "success",
        });
        trackEvent?.("withdrawal_success", {
          amount: withdrawAmount,
          duration: new Date().getTime(),
        });
        await refreshData();
      } catch (err: any) {
        const errorMessage = err?.message || "خطای نامشخصی رخ داد";
        setToast({
          message: `${errorMessage}`,
          type: "error",
        });
        trackEvent?.("withdrawal_failed", {
          amount: withdrawAmount,
          error: errorMessage,
        });
      } finally {
        setIsWithdrawing(false);
      }
    },
    [stats, submitWithdrawal, trackEvent, refreshData]
  );

  // ============================================================================
  // Computed Values
  // ============================================================================

  const canWithdraw = useMemo(
    () => (stats?.balance ?? 0) >= MIN_WITHDRAWAL,
    [stats?.balance]
  );

  const isMarketer = useMemo(() => user?.role === "marketer", [user?.role]);

  // ============================================================================
  // Render
  // ============================================================================

  // بارگذاری اولیه
  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  // خطا در بارگذاری
  if (error && !stats) {
    return <ErrorCard message={error} onRetry={refreshData} />;
  }

  // عدم داشتن اطلاعات
  if (!stats) {
    return (
      <ErrorCard
        message="اطلاعات کیف پول موجود نیست. لطفاً دوباره سعی کنید."
        onRetry={refreshData}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Helmet>
        <title>کیف پول | کی‌داره</title>
        <meta
          name="description"
          content="مدیریت موجودی، تسویه حساب، سیستم معرفی و درآمدزایی"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>

      <SafeAreaWrapper>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-32 relative overflow-hidden"
          dir="rtl"
        >
          {/* ============================================================
              پس‌زمینه تزئینی
              ============================================================ */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient Orbs */}
            <motion.div
              animate={{
                y: [0, -20, 0],
                x: [0, 10, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                y: [0, 20, 0],
                x: [0, -10, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"
            />
          </div>

          {/* ============================================================
              هدر
              ============================================================ */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white/60 backdrop-blur-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shadow-lg shadow-gray-200/50 sticky top-0 z-40 rounded-b-3xl border-b border-white/60"
          >
            <div className="flex items-center justify-between">
              {/* دکمه بازگشت */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center hover:shadow-md transition-all active:scale-95 border border-gray-200/50"
              >
                <ArrowRight className="w-5 h-5 text-gray-700" />
              </motion.button>

              {/* عنوان */}
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-lg font-black text-gray-900 flex items-center gap-2"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Wallet className="w-6 h-6 text-indigo-600" />
                </motion.div>
                کیف پول من
              </motion.h1>

              {/* دکمه بروزرسانی */}
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={refreshData}
                disabled={loading}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 flex items-center justify-center hover:shadow-md transition-all active:scale-95 border border-indigo-200/50 disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.header>

          {/* ============================================================
              محتوی اصلی
              ============================================================ */}
          <div className="p-4 space-y-5 relative z-10 max-w-2xl mx-auto">
            {/* اطلاع‌رسان */}
            <AnimatePresence>
              {showNotification && isMarketer && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200/60 shadow-lg"
                >
                  {/* خط رنگی */}
                  <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />

                  {/* محتوا */}
                  <div className="p-4 flex items-start gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-md flex-shrink-0 border border-emerald-100"
                    >
                      <Bell className="w-5 h-5" />
                    </motion.div>

                    <div className="flex-1">
                      <h3 className="text-sm font-black text-emerald-900 mb-1">
                        🎉 واریز پورسانت جدید!
                      </h3>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        یک پورسانت جدید ثبت‌نام شده و به موجودی شما افزوده شد. اکنون می‌توانید آن را
                        تسویه کنید.
                      </p>
                    </div>

                    {/* دکمه بستن */}
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => setShowNotification(false)}
                      className="text-emerald-600/50 hover:text-emerald-600 transition-colors flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* کارت موجودی */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 30 }}
            >
              <WalletBalance
                balance={stats.balance}
                minWithdrawal={MIN_WITHDRAWAL}
                canWithdraw={canWithdraw}
                lastUpdated={stats.lastUpdated}
              />
            </motion.div>

            {/* کارت آمار */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 30 }}
            >
              <WalletStats
                totalEarned={stats.totalEarned}
                referredUsers={stats.referredUsers}
                totalWithdrawn={stats.totalWithdrawn}
                pendingCommissions={stats.pendingCommissions}
              />
            </motion.div>

            {/* کارت معرفی */}
            {isMarketer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 30 }}
              >
                <ReferralCard
                  referralCode={stats.referralCode}
                  referralPercentage={REFERRAL_PERCENTAGE}
                  totalEarnings={stats.totalEarned}
                  activeReferrals={stats.referredUsers}
                  onCopy={handleCopy}
                  onShare={handleShare}
                  copied={copied}
                  userRole={user?.role as any}
                  hasStore={Boolean((user as any)?.storeId)}
                />
              </motion.div>
            )}

            {/* فرم تسویه */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 30 }}
            >
              <WithdrawalForm
                balance={stats.balance}
                canWithdraw={canWithdraw}
                isWithdrawing={isWithdrawing}
                minAmount={MIN_WITHDRAWAL}
                onSubmit={handleWithdrawSubmit}
              />
            </motion.div>

            {/* لیست تراکنش‌ها */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 30 }}
            >
              <TransactionList transactions={transactions || []} loading={loading} />
            </motion.div>
          </div>

          {/* Toast */}
          <Toast
            message={toast.message}
            onClose={() => setToast({ ...toast, message: null })}
            type={toast.type}
          />
        </motion.div>
      </SafeAreaWrapper>
    </ErrorBoundary>
  );
}