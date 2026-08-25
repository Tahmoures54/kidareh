import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react"; // فریمورک یکپارچه شد
import { ArrowRight, RefreshCw, AlertCircle, Wallet2, Trophy, Send } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useClipboard } from "../../hooks/useClipboard";
import { useReferral } from "../../hooks/useReferral";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import { MIN_WITHDRAWAL } from "../../utils/constants";
import type { User, Transaction } from "./types";

// مسیر Toast اصلاح شد
import { Toast } from "../../components/ui/Toast"; 

// Toast از اینجا حذف شد چون دیگر در این پوشه نیست
import {
  BalanceCard,
  StatsGrid,
  ReferralSection,
  WithdrawalSection,
  TransactionSection,
  ReferralSkeleton,
  Leaderboard,
} from "./components";

// انیمیشن ملایم برای ورود بخش‌ها
const sectionAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
};

export default function ReferralPage() {
  const navigate = useNavigate();
  const { user } = useAuth() as { user: User | null };
  const { copy, copied } = useClipboard();

  const { stats, percentage, transactions, loading, error, submitWithdrawal, refreshData } =
    useReferral();

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
    id: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      setToast({ msg, type, id: Date.now() });
    },
    []
  );

  const handleCopy = useCallback(() => {
    if (!stats?.referralCode) return;
    copy(stats.referralCode);
    showToast("کد دعوت کپی شد");
  }, [stats?.referralCode, copy, showToast]);

  const handleShare = useCallback(async () => {
    if (!stats?.referralCode) return;
    const text = `فروشگاهت رو رایگان تو کی‌داره ثبت‌نام کن! با کد دعوت من: ${stats.referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "دعوت به کی‌داره", text });
      } catch (err) {
        // کاربر منصرف شده
      }
    } else {
      copy(text);
      showToast("متن دعوت کپی شد");
    }
  }, [stats?.referralCode, copy, showToast]);

  const handleWithdraw = useCallback(
    async (data: { amount: number; iban: string }) => {
      setSubmitting(true);
      try {
        await submitWithdrawal(data);
        showToast("درخواست برداشت ثبت شد");
      } catch (err: unknown) { // بهینه سازی تایپ
        const errorMessage = err instanceof Error ? err.message : "خطا در ثبت درخواست برداشت";
        showToast(errorMessage, "error");
      } finally {
        setSubmitting(false);
      }
    },
    [submitWithdrawal, showToast]
  );

  return (
    <ErrorBoundary>
      <div className="min-h-full pb-32 bg-gray-50/50 dark:bg-gray-950" dir="rtl">
        <AnimatePresence>
          {toast && (
            <Toast
              key={toast.id}
              msg={toast.msg}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center active:scale-95 transition"
              aria-label="بازگشت"
            >
              <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <div className="leading-tight">
              <h1 className="text-[15px] font-black text-gray-900 dark:text-white">کسب درآمد</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                معرفی دوستان و برداشت موجودی
              </p>
            </div>
          </div>

          <button
            onClick={refreshData}
            className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center transition active:scale-95"
            aria-label="تازه‌سازی"
            title="تازه‌سازی"
          >
            <RefreshCw className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        <main className="px-4 py-6 space-y-6 max-w-md mx-auto">
          {loading ? (
            <ReferralSkeleton />
          ) : error ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-3xl border border-rose-200/70 dark:border-rose-800/40 p-6 text-center shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl mx-auto bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-rose-600 dark:text-rose-300 font-black text-sm mb-1">خطا در دریافت اطلاعات</p>
              <p className="text-rose-500 dark:text-rose-400 text-xs font-medium mb-4">{error}</p>

              <button
                onClick={refreshData}
                className="inline-flex items-center justify-center gap-2 text-sm font-black text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-2.5 active:scale-95 transition"
              >
                <RefreshCw className="w-4 h-4" />
                تلاش مجدد
              </button>
            </motion.div>
          ) : stats ? (
            <>
              <motion.div {...sectionAnimation} transition={{ delay: 0.05 }}>
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20">
                  <div className="absolute -top-6 -left-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">💰</span>
                      <h2 className="text-base font-black">چطور درآمد کسب کنم؟</h2>
                    </div>
                    
                    <p className="text-sm leading-relaxed font-medium opacity-95 mb-4">
                      فروشگاه‌ها رو همین الان به <span className="font-black underline underline-offset-2 decoration-wavy decoration-emerald-300">کی‌داره</span> دعوت کن و از خرید برچسب اعتبار اون‌ها تا <span className="font-black text-yellow-300 text-base drop-shadow-sm">{percentage}٪</span> پورسانت بگیر!
                    </p>

                    <button 
                      onClick={handleShare}
                      className="w-full bg-white text-emerald-700 font-black text-sm py-3 rounded-2xl active:scale-[0.98] transition-transform shadow-md flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      دعوت از فروشگاه‌ها
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div {...sectionAnimation} transition={{ delay: 0.1 }}>
                <BalanceCard
                  balance={stats.balance}
                  minWithdrawal={MIN_WITHDRAWAL}
                  canWithdraw={stats.balance >= MIN_WITHDRAWAL}
                />
              </motion.div>

              <motion.div {...sectionAnimation} transition={{ delay: 0.15 }}>
                <StatsGrid
                  totalEarned={stats.totalEarned}
                  totalWithdrawn={stats.totalWithdrawn}
                  referredUsers={stats.referredUsers}
                  pendingCommissions={stats.pendingCommissions}
                />
              </motion.div>

              {stats.referralCode && (
                <motion.div {...sectionAnimation} transition={{ delay: 0.2 }}>
                  <ReferralSection
                    code={stats.referralCode}
                    copied={copied}
                    onCopy={handleCopy}
                    onShare={handleShare}
                    percentage={percentage}
                  />
                </motion.div>
              )}

              <motion.div {...sectionAnimation} transition={{ delay: 0.25 }}>
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                      <Wallet2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">ثبت درخواست برداشت</h3>
                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                        واریز به شبای وارد شده انجام می‌شود
                      </p>
                    </div>
                  </div>

                  <WithdrawalSection
                    balance={stats.balance}
                    minAmount={MIN_WITHDRAWAL}
                    onSubmit={handleWithdraw}
                    submitting={submitting}
                  />
                </section>
              </motion.div>

              <motion.div {...sectionAnimation} transition={{ delay: 0.3 }}>
                <section className="space-y-3">
                  <div className="flex items-end justify-between px-1">
                    <h3 className="text-base font-black text-gray-900 dark:text-white">گردش حساب</h3>
                    <span className="text-[11px] font-bold text-gray-400">
                      50 مورد اخیر
                    </span>
                  </div>

                  <TransactionSection
                    transactions={transactions as Transaction[]}
                    loading={false}
                  />
                </section>
              </motion.div>

              <motion.div {...sectionAnimation} transition={{ delay: 0.35 }}>
                <section className="space-y-3 pt-4">
                  <div className="flex items-center gap-2 px-1">
                    <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-sm" />
                    <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-500">
                      جدول رتبه‌بندی
                    </h3>
                  </div>
                  <Leaderboard />
                </section>
              </motion.div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center py-10 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <p className="text-gray-500 dark:text-gray-400 font-black text-sm">
                داده‌ای برای نمایش وجود ندارد
              </p>

              <button
                onClick={refreshData}
                className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl px-4 py-2.5 active:scale-95 transition"
              >
                <RefreshCw className="w-4 h-4" />
                بارگذاری مجدد
              </button>
            </motion.div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}