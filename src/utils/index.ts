import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Re-export other utility modules
export * from "./formatPrice";
export * from "./imageCompression";
export * from "./lazyLoad";

// ============================================================
// 1. BASE UTILITIES
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FALLBACK_IMAGE = "https://placehold.co/400x400/1e293b/94a3b8?text=No+Image";

// ============================================================
// 2. TEXT & NUMBER FORMATTING
// ============================================================

export function normalizeText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\u064A/g, "\u06CC") // ی عربی به فارسی
    .replace(/\u0649/g, "\u06CC") // ی آخر عربی به فارسی
    .replace(/\u0643/g, "\u06A9") // ک عربی به فارسی
    .replace(/\u0629/g, "\u0647") // ه دایر به فارسی
    .replace(/[\u0623\u0625]/g, "\u0627") // همزه به الف
    .replace(/\s*\u200C\s*/g, "\u200C") // نیم‌فاصله استاندارد
    .replace(/\s+/g, " ")
    .trim();
}

export function toPersianNum(n: number | string | undefined | null): string { 
  return Number(n || 0).toLocaleString("fa-IR"); 
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function getInitials(name: string = ""): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ============================================================
// 3. LOCATION & DISTANCE
// ============================================================

export function calcDistance(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371; // Earth radius in km
  const dL = ((la2 - la1) * Math.PI) / 180;
  const dO = ((lo2 - lo1) * Math.PI) / 180;
  const a = Math.sin(dL / 2) ** 2 + Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (!km || km < 0) return "نامشخص";
  if (km < 1) return `${Math.round(km * 1000).toLocaleString("fa-IR")} متر`;
  return `${km.toFixed(1).replace(".", "٫")} کیلومتر`;
}

// ============================================================
// 4. UI & STYLING (Badges)
// ============================================================

export type BadgeType =
  | "تخفیف ویژه"
  | "فروش ویژه"
  | "حراج"
  | "قیمت قدیم"
  | "ارسال رایگان"
  | "گارانتی طلایی"
  | "بلک فرایدی"
  | "جشنواره بهاری"
  | "جشنواره نوروزی"
  | "جشنواره یلدا"
  | "حراج آخر فصل"
  | "پرفروش‌ترین"
  | "موجود شد"
  | "تخفیف دانشجویی"
  | "خرید عمده"
  | "جدید"
  | "پیشنهاد ویژه";

// استایل‌های ارتقا یافته با پشتیبانی از دارک مود و افکت شیشه‌ای برای استفاده روی عکس
const badgeStyles: Record<BadgeType, string> = {
  "تخفیف ویژه": "bg-rose-500/90 text-white backdrop-blur-md border border-rose-400/30 shadow-sm dark:bg-rose-600/80",
  "فروش ویژه": "bg-amber-500/90 text-white backdrop-blur-md border border-amber-400/30 shadow-sm dark:bg-amber-600/80",
  "حراج": "bg-purple-600/90 text-white backdrop-blur-md border border-purple-400/30 shadow-sm dark:bg-purple-700/80",
  "قیمت قدیم": "bg-blue-500/90 text-white backdrop-blur-md border border-blue-400/30 shadow-sm dark:bg-blue-600/80",
  "ارسال رایگان": "bg-emerald-500/90 text-white backdrop-blur-md border border-emerald-400/30 shadow-sm dark:bg-emerald-600/80",
  "گارانتی طلایی": "bg-yellow-500/90 text-yellow-950 backdrop-blur-md border border-yellow-400/30 shadow-sm dark:bg-yellow-400/80 dark:text-yellow-900",
  "بلک فرایدی": "bg-black/90 text-white border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] dark:bg-gray-900/90 dark:border-rose-400",
  "جشنواره بهاری": "bg-gradient-to-r from-pink-500/90 to-rose-400/90 text-white backdrop-blur-md border border-white/20 shadow-lg shadow-pink-500/20",
  "جشنواره نوروزی": "bg-gradient-to-r from-green-500/90 to-emerald-600/90 text-white backdrop-blur-md border-2 border-yellow-400/80 shadow-lg shadow-green-500/20",
  "جشنواره یلدا": "bg-gradient-to-r from-red-600/90 to-red-800/90 text-white backdrop-blur-md border-2 border-emerald-500/80 shadow-lg shadow-red-500/20",
  "حراج آخر فصل": "bg-gradient-to-r from-orange-400/90 to-orange-600/90 text-white backdrop-blur-md border border-amber-300/40 shadow-md",
  "پرفروش‌ترین": "bg-gradient-to-r from-yellow-400/90 to-amber-500/90 text-amber-950 backdrop-blur-md border-2 border-amber-200/80 shadow-lg font-black",
  "موجود شد": "bg-teal-500/90 text-white backdrop-blur-md border border-teal-400/30 shadow-sm dark:bg-teal-600/80",
  "تخفیف دانشجویی": "bg-indigo-500/90 text-white backdrop-blur-md border border-indigo-400/30 shadow-sm dark:bg-indigo-600/80",
  "خرید عمده": "bg-slate-700/90 text-white backdrop-blur-md border border-slate-500/30 shadow-sm dark:bg-slate-800/80",
  "جدید": "bg-cyan-500/90 text-white backdrop-blur-md border border-cyan-400/30 shadow-sm dark:bg-cyan-600/80",
  "پیشنهاد ویژه": "bg-gradient-to-r from-fuchsia-500/90 to-purple-600/90 text-white backdrop-blur-md border border-white/20 shadow-lg shadow-fuchsia-500/20",
};

const normalizedBadgeStyles = Object.fromEntries(
  Object.entries(badgeStyles).map(([key, value]) => [normalizeText(key), value])
) as Record<string, string>;

export function getBadgeStyle(badgeName: string | null | undefined): string {
  if (!badgeName) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }

  const normalizedName = normalizeText(badgeName);

  return (
    normalizedBadgeStyles[normalizedName] ||
    "bg-gray-200/80 text-gray-700 backdrop-blur-md border border-gray-300/30 shadow-sm dark:bg-gray-700/80 dark:text-gray-200"
  );
}

// ============================================================
// 5. GENERAL HELPERS
// ============================================================

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers or insecure contexts
    const textArea = window.document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999rem";
    window.document.body.appendChild(textArea);
    textArea.select();
    try {
      window.document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      window.document.body.removeChild(textArea);
    }
  }
}