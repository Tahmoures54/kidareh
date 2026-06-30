import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export * from "./formatPrice";
export * from "./imageCompression";
export * from "./lazyLoad";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

function normalizeText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\u064A/g, "\u06CC")
    .replace(/\u0649/g, "\u06CC")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u0623\u0625]/g, "\u0627")
    .replace(/\s*\u200C\s*/g, "\u200C")
    .replace(/\s+/g, " ")
    .trim();
}

const badgeStyles: Record<BadgeType, string> = {
  "تخفیف ویژه": "bg-rose-500 text-white",
  "فروش ویژه": "bg-amber-500 text-white",
  "حراج": "bg-purple-600 text-white",
  "قیمت قدیم": "bg-blue-500 text-white",
  "ارسال رایگان": "bg-emerald-500 text-white",
  "گارانتی طلایی": "bg-yellow-500 text-white",
  "بلک فرایدی":
    "bg-black text-white hover:bg-gray-900 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse",
  "جشنواره بهاری":
    "bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg shadow-pink-200",
  "جشنواره نوروزی":
    "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-2 border-yellow-400 shadow-lg shadow-green-200 animate-bounce",
  "جشنواره یلدا":
    "bg-gradient-to-r from-red-600 to-red-800 text-white border-2 border-emerald-500 shadow-lg shadow-red-200",
  "حراج آخر فصل":
    "bg-gradient-to-r from-orange-400 to-orange-600 text-white border border-amber-300 shadow-md",
  "پرفروش‌ترین":
    "bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950 font-black border-2 border-amber-200 shadow-lg",
  "موجود شد": "bg-teal-500 text-white animate-pulse",
  "تخفیف دانشجویی": "bg-indigo-500 text-white border border-indigo-300",
  "خرید عمده": "bg-slate-700 text-white shadow-sm",
  "جدید": "bg-cyan-500 text-white border border-cyan-200",
  "پیشنهاد ویژه":
    "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-200",
};

const normalizedBadgeStyles = Object.fromEntries(
  Object.entries(badgeStyles).map(([key, value]) => [normalizeText(key), value])
) as Record<string, string>;

export function getBadgeStyle(badgeName: string | null | undefined): string {
  if (!badgeName) {
    return "bg-gray-100 text-gray-600";
  }

  const normalizedName = normalizeText(badgeName);

  return (
    normalizedBadgeStyles[normalizedName] ||
    "bg-gray-200 text-gray-700 border border-gray-300 shadow-sm"
  );
}

export function truncateText(text: string, maxLength: number = 40): string {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}