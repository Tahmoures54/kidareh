import { useState, useEffect, useCallback, useRef } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/context/AuthContext";
import type { WalletStats, Transaction, WithdrawalRequest } from "@/pages/Wallet/types";
import { api } from "@/utils/api";

type WalletStatsApiResponse =
  | Partial<WalletStats>
  | { data?: Partial<WalletStats>; stats?: Partial<WalletStats> };

type WalletTransactionsApiResponse =
  | Transaction[]
  | {
      data?: Transaction[];
      transactions?: Transaction[];
      items?: Transaction[];
    };

type WalletHookReturn = {
  stats: WalletStats | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  submitWithdrawal: (data: WithdrawalRequest) => Promise<unknown>;
  refreshData: () => Promise<void>;
};

function extractErrorMessage(err: unknown, fallback = "خطا در انجام عملیات"): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as any;
    return (
      data?.error ||
      data?.message ||
      err.message ||
      fallback
    );
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function normalizeStats(payload: WalletStatsApiResponse): WalletStats {
  const raw =
    (payload as any)?.data ||
    (payload as any)?.stats ||
    (payload as Partial<WalletStats>) ||
    {};

  return {
    balance: Number(raw.balance ?? 0),
    totalEarned: Number(raw.totalEarned ?? 0),
    totalWithdrawn: Number(raw.totalWithdrawn ?? 0),
    referredUsers: Number(raw.referredUsers ?? 0),
    referralCode: String(raw.referralCode ?? ""),
    pendingCommissions: Number(raw.pendingCommissions ?? 0),
    lastUpdated: raw.lastUpdated,
  };
}

function normalizeTransactions(payload: WalletTransactionsApiResponse): Transaction[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.transactions)
    ? payload.transactions
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return list.map((tx, index) => ({
    id: String(tx?.id ?? `tx-${Date.now()}-${index}`),
    type: tx?.type ?? "commission",
    amount: Number(tx?.amount ?? 0),
    title: tx?.title ?? "تراکنش کیف پول",
    description: tx?.description,
    date: tx?.date ?? new Date().toLocaleString("fa-IR"),
    timestamp: Number(tx?.timestamp ?? Date.now()),
    status: tx?.status ?? "success",
    relatedUserId: tx?.relatedUserId,
    relatedUserName: tx?.relatedUserName,
    refId: tx?.refId,
    metadata: tx?.metadata,
  }));
}

function normalizeWithdrawalResponse(responseData: any): { acceptedAmount: number | null } {
  // انعطاف برای پاسخ‌های مختلف بک‌اند
  const amount =
    responseData?.amount ??
    responseData?.data?.amount ??
    responseData?.withdrawal?.amount ??
    responseData?.request?.amount;

  return {
    acceptedAmount: typeof amount === "number" ? amount : null,
  };
}

export function useWallet(): WalletHookReturn {
  const { user } = useAuth();

  const [stats, setStats] = useState<WalletStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const clearWs = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }, []);

  const fetchWalletData = useCallback(async () => {
    if (!user) {
      setStats(null);
      setTransactions([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [statsRes, txRes] = await Promise.all([
        api.get<WalletStatsApiResponse>("/api/wallet/stats"),
        api.get<WalletTransactionsApiResponse>("/api/wallet/transactions"),
      ]);

      setStats(normalizeStats(statsRes.data));
      setTransactions(normalizeTransactions(txRes.data));
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "خطا در دریافت اطلاعات کیف پول"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const submitWithdrawal = useCallback(
    async (data: WithdrawalRequest) => {
      const requestedAmount = Number(data?.amount ?? 0);
      if (!requestedAmount || requestedAmount <= 0) {
        throw new Error("مبلغ برداشت نامعتبر است");
      }

      const response = await api.post("/api/wallet/withdraw", data);
      const { acceptedAmount } = normalizeWithdrawalResponse(response.data);
      const amountToApply = acceptedAmount ?? requestedAmount;

      // optimistic update
      setStats((prev) =>
        prev
          ? {
              ...prev,
              balance: Math.max(0, prev.balance - amountToApply),
              totalWithdrawn: prev.totalWithdrawn + amountToApply,
              lastUpdated: new Date().toISOString(),
            }
          : prev
      );

      const pendingTx: Transaction = {
        id: `local-withdraw-${Date.now()}`,
        type: "withdrawal",
        amount: amountToApply,
        status: "pending",
        title: "درخواست برداشت ثبت شد",
        description: data.accountHolder ? `به نام ${data.accountHolder}` : undefined,
        date: new Date().toLocaleString("fa-IR"),
        timestamp: Date.now(),
      };

      setTransactions((prev) => [pendingTx, ...prev]);

      return response.data;
    },
    []
  );

  const refreshData = useCallback(async () => {
    await fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    if (!user) {
      clearWs();
      return;
    }

    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      const wsUrl =
        (import.meta.env.VITE_WS_URL as string | undefined) ||
        (window.location.protocol === "https:"
          ? `wss://${window.location.host}`
          : `ws://${window.location.host}`);

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data?.type === "balance_update" && typeof data.balance === "number") {
              setStats((prev) =>
                prev
                  ? { ...prev, balance: Number(data.balance), lastUpdated: new Date().toISOString() }
                  : prev
              );
            }

            if (data?.type === "new_transaction" && data.transaction) {
              const tx = normalizeTransactions([data.transaction])[0];
              if (!tx) return;

              setTransactions((prev) => {
                // جلوگیری از تکراری شدن
                if (prev.some((p) => p.id === tx.id)) return prev;
                return [tx, ...prev];
              });
            }
          } catch {
            // ignore malformed payload
          }
        };

        socket.onclose = () => {
          if (unmounted) return;

          // reconnect with capped backoff
          const attempt = Math.min(reconnectAttemptsRef.current + 1, 5);
          reconnectAttemptsRef.current = attempt;
          const delay = attempt * 1500; // 1.5s, 3s, 4.5s...

          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        };
      } catch {
        // ws optional
      }
    };

    connect();

    return () => {
      unmounted = true;
      clearWs();
    };
  }, [user, clearWs]);

  return {
    stats,
    transactions,
    loading,
    error,
    submitWithdrawal,
    refreshData,
  };
}