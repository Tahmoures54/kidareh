import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "../utils/api";

export interface ReferralStats {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  referredUsers: number;
  pendingCommissions: number;
  referralCode: string | null;
  lastUpdated?: string;
}

export type WalletTransactionType =
  | "commission"
  | "withdrawal"
  | "bonus"
  | "refund"
  | string;

export type WalletTransactionStatus =
  | "approved"
  | "pending"
  | "failed"
  | "rejected"
  | string;

export interface ReferralTransaction {
  id: string | number;
  type: WalletTransactionType;
  title?: string | null;
  amount: number;
  date: string;
  status: WalletTransactionStatus;
  description?: string | null;
  source?: string | null;
  created_at?: string;
}

type StatsResponse = {
  success: boolean;
  percentage?: number;
  stats: ReferralStats;
};

type TransactionsResponse = {
  success: boolean;
  total: number;
  limit: number;
  offset: number;
  transactions: ReferralTransaction[];
};

export function useReferral() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [percentage, setPercentage] = useState<number>(10); // پیش‌فرض ۱۰ درصد
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const statsRes = await api.get<StatsResponse>("/api/referral/stats");
      
      // ✅ دریافت آمار
      setStats(statsRes?.stats ?? null);
      
      // ✅ دریافت درصد پورسانت که ادمین در تنظیمات سیستم تعیین کرده است
      if (statsRes?.percentage) {
        setPercentage(statsRes.percentage);
      }

      const txRes = await api.get<TransactionsResponse>(
        "/api/referral/transactions?limit=50"
      );

      setTransactions(Array.isArray(txRes?.transactions) ? txRes.transactions : []);
    } catch (err: any) {
      console.error("❌ Referral Fetch Error:", err);

      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("مشکل در ارتباط با سرور. لطفا مجددا تلاش کنید.");
      }

      setStats(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshData = useCallback(() => fetchData(), [fetchData]);

  const submitWithdrawal = useCallback(
    async (data: { amount: number; iban: string }) => {
      try {
        await api.post("/api/referral/withdraw", data);
        await refreshData();
      } catch (err: any) {
        if (err instanceof ApiError) {
          throw new Error(err.message);
        }
        throw new Error("خطا در ثبت درخواست برداشت");
      }
    },
    [refreshData]
  );

  // ✅ اضافه کردن percentage به خروجی هوک
  return { stats, percentage, transactions, loading, error, submitWithdrawal, refreshData };
}