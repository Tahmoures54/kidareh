import { useQuery, useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { useRef, useEffect, useCallback } from "react";
import { PendingProduct, ReportItem, UserItem, StoreItem } from "./types";
import { apiRequest, ApiError } from "../../utils/api";

// ============================================
// 📌 1. Types & Interfaces
// ============================================
interface AdminSettings {
  PAYPING_TOKEN?: string;
  SMS_TOKEN?: string;
  [key: string]: string | undefined;
}

interface Withdrawal {
  id: number;
  user_phone: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface StoresResponse {
  stores?: StoreItem[];
}

interface SaveSettingsPayload {
  payToken?: string;
  smsToken?: string;
}

interface UpdateRolePayload {
  userId: number;
  role: string;
}

interface DeleteProductPayload {
  pid: number;
  rid: number;
}

type ToastFn = (msg: string) => void;

// ============================================
// 📌 2. Stable Toast (جلوگیری از رندر اضافی)
// ============================================
const useStableToast = (showToast: ToastFn) => {
  const ref = useRef(showToast);
  useEffect(() => { ref.current = showToast; }, [showToast]);
  return useCallback((msg: string) => ref.current(msg), []);
};

// ============================================
// 📌 3. Query Keys
// ============================================
export const ADMIN_KEYS = {
  products: ["admin", "products"] as const,
  reports: ["admin", "reports"] as const,
  users: ["admin", "users"] as const,
  stores: ["admin", "stores"] as const,
  settings: ["admin", "settings"] as const,
  withdrawals: ["admin", "withdrawals"] as const,
};

// ============================================
// 📌 4. Safe Fetcher (تبدیل خطای 404 بک‌اند به لیست خالی)
// ============================================
const fetchWithFallback = async <T>(url: string, fallback: T): Promise<T> => {
  try {
    return await apiRequest<T>(url, { auth: true });
  } catch (err: any) {
    if (err?.status === 404) return fallback;
    throw err;
  }
};

// ============================================
// 📌 5. Queries
// ============================================
export const usePendingProducts = (enabled: boolean) =>
  useQuery<PendingProduct[], ApiError>({
    queryKey: ADMIN_KEYS.products,
    queryFn: () => fetchWithFallback<PendingProduct[]>("/api/admin/pending", []),
    enabled,
  });

export const useReports = (enabled: boolean) =>
  useQuery<ReportItem[], ApiError>({
    queryKey: ADMIN_KEYS.reports,
    queryFn: async () => {
      const data = await fetchWithFallback<ReportItem[]>("/api/reports", []);
      return Array.isArray(data) ? data.filter(x => x.status === "pending" || x.status === "open") : [];
    },
    enabled,
  });

export const useUsers = (enabled: boolean) =>
  useQuery<UserItem[], ApiError>({
    queryKey: ADMIN_KEYS.users,
    queryFn: () => fetchWithFallback<UserItem[]>("/api/admin/users", []),
    enabled,
  });

export const useStores = (enabled: boolean) =>
  useQuery<StoreItem[], ApiError>({
    queryKey: ADMIN_KEYS.stores,
    queryFn: async () => {
      const data = await fetchWithFallback<StoresResponse | StoreItem[]>("/api/admin/stores", []);
      return Array.isArray(data) ? data : (data?.stores || []);
    },
    enabled,
  });

export const useAdminSettings = (enabled: boolean) =>
  useQuery<AdminSettings, ApiError>({
    queryKey: ADMIN_KEYS.settings,
    queryFn: () => fetchWithFallback<AdminSettings>("/api/admin/settings", {}),
    enabled,
    staleTime: 60_000,
  });

export const useWithdrawals = (enabled: boolean) =>
  useQuery<Withdrawal[], ApiError>({
    queryKey: ADMIN_KEYS.withdrawals,
    queryFn: () => fetchWithFallback<Withdrawal[]>("/api/admin/withdrawals", []),
    enabled,
  });

// ============================================
// 📌 6. Mutation Helper
// ============================================
type OptimisticOptions<TData, TVariables, TContext> = UseMutationOptions<TData, ApiError, TVariables, TContext>;

const createMutationHook = <TData, TVariables, TContext = unknown>(options: OptimisticOptions<TData, TVariables, TContext>) => 
  useMutation(options);

// ============================================
// 📌 7. Independent Mutations
// ============================================
export const useUpdateUserRole = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, UpdateRolePayload, { prev?: UserItem[] }>({
    mutationFn: ({ userId, role }) => apiRequest(`/api/admin/users/${userId}/role`, { method: "POST", auth: true, body: { role } }),
    onMutate: async ({ userId, role }) => {
      await qc.cancelQueries({ queryKey: ADMIN_KEYS.users });
      const prev = qc.getQueryData<UserItem[]>(ADMIN_KEYS.users);
      qc.setQueryData<UserItem[]>(ADMIN_KEYS.users, old => old?.map(u => u.id === userId ? { ...u, role } : u));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ADMIN_KEYS.users, ctx.prev);
      toast(`❌ ${err.message || "خطا در تغییر نقش"}`);
    },
    onSuccess: () => toast("✅ نقش کاربر تغییر کرد"),
    onSettled: () => qc.invalidateQueries({ queryKey: ADMIN_KEYS.users }),
  });
};

export const useApproveProduct = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, string | number, { prev?: PendingProduct[] }>({
    mutationFn: (id) => apiRequest(`/api/products/${id}/approve`, { method: "POST", auth: true }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADMIN_KEYS.products });
      const prev = qc.getQueryData<PendingProduct[]>(ADMIN_KEYS.products);
      qc.setQueryData<PendingProduct[]>(ADMIN_KEYS.products, old => old?.filter(p => String(p.id) !== String(id)));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ADMIN_KEYS.products, ctx.prev);
      toast(`❌ ${err.message || "خطا در تایید کالا"}`);
    },
    onSuccess: () => toast("✅ کالا تایید شد"),
    onSettled: () => qc.invalidateQueries({ queryKey: ADMIN_KEYS.products }),
  });
};

export const useRejectProduct = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, string | number, { prev?: PendingProduct[] }>({
    mutationFn: (id) => apiRequest(`/api/products/${id}/reject`, { method: "POST", auth: true }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADMIN_KEYS.products });
      const prev = qc.getQueryData<PendingProduct[]>(ADMIN_KEYS.products);
      qc.setQueryData<PendingProduct[]>(ADMIN_KEYS.products, old => old?.filter(p => String(p.id) !== String(id)));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ADMIN_KEYS.products, ctx.prev);
      toast(`❌ ${err.message || "خطا در رد کالا"}`);
    },
    onSuccess: () => toast("✅ کالا رد شد"),
    onSettled: () => qc.invalidateQueries({ queryKey: ADMIN_KEYS.products }),
  });
};

export const useResolveReport = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, number, { prev?: ReportItem[] }>({
    mutationFn: (id) => apiRequest(`/api/reports/${id}/resolve`, { method: "POST", auth: true }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADMIN_KEYS.reports });
      const prev = qc.getQueryData<ReportItem[]>(ADMIN_KEYS.reports);
      qc.setQueryData<ReportItem[]>(ADMIN_KEYS.reports, old => old?.filter(r => r.id !== id));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ADMIN_KEYS.reports, ctx.prev);
      toast(`❌ ${err.message || "خطا در حل گزارش"}`);
    },
    onSuccess: () => toast("✅ گزارش نادیده گرفته شد"),
    onSettled: () => qc.invalidateQueries({ queryKey: ADMIN_KEYS.reports }),
  });
};

export const useDeleteProduct = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, DeleteProductPayload>({
    mutationFn: async ({ pid, rid }) => {
      await apiRequest(`/api/products/${pid}`, { method: "DELETE", auth: true });
      try { await apiRequest(`/api/reports/${rid}/resolve`, { method: "POST", auth: true }); } catch(e) {}
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.reports });
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.products });
      toast("✅ کالای متخلف حذف شد");
    },
    onError: (err) => toast(`❌ ${err.message || "خطا در حذف کالا"}`),
  });
};

export const useApproveWithdrawal = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, string | number, { prev?: Withdrawal[] }>({
    mutationFn: (id) => apiRequest(`/api/admin/withdrawals/${id}/approve`, { method: "POST", auth: true }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADMIN_KEYS.withdrawals });
      const prev = qc.getQueryData<Withdrawal[]>(ADMIN_KEYS.withdrawals);
      qc.setQueryData<Withdrawal[]>(ADMIN_KEYS.withdrawals, old => old?.map(w => String(w.id) === String(id) ? { ...w, status: "approved" } : w));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ADMIN_KEYS.withdrawals, ctx.prev);
      toast(`❌ ${err.message || "خطا در تایید تسویه"}`);
    },
    onSuccess: () => toast("✅ مبلغ واریز و تسویه تایید شد"),
    onSettled: () => qc.invalidateQueries({ queryKey: ADMIN_KEYS.withdrawals }),
  });
};

export const useRejectWithdrawal = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, string | number, { prev?: Withdrawal[] }>({
    mutationFn: (id) => apiRequest(`/api/admin/withdrawals/${id}/reject`, { method: "POST", auth: true }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADMIN_KEYS.withdrawals });
      const prev = qc.getQueryData<Withdrawal[]>(ADMIN_KEYS.withdrawals);
      qc.setQueryData<Withdrawal[]>(ADMIN_KEYS.withdrawals, old => old?.map(w => String(w.id) === String(id) ? { ...w, status: "rejected" } : w));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ADMIN_KEYS.withdrawals, ctx.prev);
      toast(`❌ ${err.message || "خطا در رد تسویه"}`);
    },
    onSuccess: () => toast("✅ درخواست تسویه رد شد"),
    onSettled: () => qc.invalidateQueries({ queryKey: ADMIN_KEYS.withdrawals }),
  });
};

export const useSaveSettings = (showToast: ToastFn) => {
  const qc = useQueryClient();
  const toast = useStableToast(showToast);
  return createMutationHook<void, SaveSettingsPayload>({
    mutationFn: async ({ payToken, smsToken }) => {
      const reqs: Promise<unknown>[] = [];
      if (payToken !== undefined) reqs.push(apiRequest("/api/admin/settings", { method: "PUT", auth: true, body: { key: "PAYPING_TOKEN", value: payToken } }));
      if (smsToken !== undefined) reqs.push(apiRequest("/api/admin/settings", { method: "PUT", auth: true, body: { key: "SMS_TOKEN", value: smsToken } }));
      await Promise.all(reqs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEYS.settings });
      toast("✅ تنظیمات با موفقیت ذخیره شد");
    },
    onError: (err) => toast(`❌ ${err.message || "خطا در ذخیره تنظیمات"}`),
  });
};