import {
  TrendingUp,
  ArrowDownLeft,
  Gift,
  RefreshCw,
  HelpCircle,
} from "lucide-react";

export const TX_TYPE = {
  commission: {
    label: "پورسانت",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    icon: TrendingUp,
    sign: "+",
  },
  bonus: {
    label: "جایزه",
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    icon: Gift,
    sign: "+",
  },
  refund: {
    label: "بازگشت",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    icon: RefreshCw,
    sign: "+",
  },
  withdrawal: {
    label: "برداشت",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    icon: ArrowDownLeft,
    sign: "-",
  },
} as const;

export const DEFAULT_TX_TYPE = {
  label: "تراکنش",
  color: "text-gray-600 dark:text-gray-300",
  bg: "bg-gray-50 dark:bg-gray-800",
  icon: HelpCircle,
  sign: "",
} as const;

export const TX_STATUS = {
  success: {
    label: "موفق",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  },
  pending: {
    label: "در انتظار",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  },
  failed: {
    label: "ناموفق",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  },
  cancelled: {
    label: "لغو شده",
    className:
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  },
} as const;

export type NormalizedStatus = keyof typeof TX_STATUS;

export function normalizeTxStatus(raw?: string): NormalizedStatus {
  const s = String(raw || "").toLowerCase();

  if (s === "approved") return "success";
  if (s === "pending") return "pending";
  if (s === "success" || s === "succeeded") return "success";
  if (s === "failed" || s === "rejected") return "failed";
  if (s === "cancelled" || s === "canceled") return "cancelled";

  return "pending";
}

export function formatFaDate(raw?: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}