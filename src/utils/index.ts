// src/utils/index.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export * from "./formatPrice";
export * from "./imageCompression";
export * from "./lazyLoad";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BadgeType =
  | "\u062A\u062E\u0641\u06CC\u0641 \u0648\u06CC\u0698\u0647"
  | "\u0641\u0631\u0648\u0634 \u0648\u06CC\u0698\u0647"
  | "\u062D\u0631\u0627\u062C"
  | "\u0642\u06CC\u0645\u062A \u0642\u062F\u06CC\u0645"
  | "\u0627\u0631\u0633\u0627\u0644 \u0631\u0627\u06CC\u06AF\u0627\u0646"
  | "\u06AF\u0627\u0631\u0627\u0646\u062A\u06CC \u0637\u0644\u0627\u06CC\u06CC"
  | "\u0628\u0644\u06A9 \u0641\u0631\u0627\u06CC\u062F\u06CC"
  | "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u0628\u0647\u0627\u0631\u06CC"
  | "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u0646\u0648\u0631\u0648\u0632\u06CC"
  | "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u06CC\u0644\u062F\u0627"
  | "\u062D\u0631\u0627\u062C \u0622\u062E\u0631 \u0641\u0635\u0644"
  | "\u067E\u0631\u0641\u0631\u0648\u0634\u200C\u062A\u0631\u06CC\u0646"
  | "\u0645\u0648\u062C\u0648\u062F \u0634\u062F"
  | "\u062A\u062E\u0641\u06CC\u0641 \u062F\u0627\u0646\u0634\u062C\u0648\u06CC\u06CC"
  | "\u062E\u0631\u06CC\u062F \u0639\u0645\u062F\u0647"
  | "\u062C\u062F\u06CC\u062F"
  | "\u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0648\u06CC\u0698\u0647";

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
  "\u062A\u062E\u0641\u06CC\u0641 \u0648\u06CC\u0698\u0647": "bg-rose-500 text-white",
  "\u0641\u0631\u0648\u0634 \u0648\u06CC\u0698\u0647": "bg-amber-500 text-white",
  "\u062D\u0631\u0627\u062C": "bg-purple-600 text-white",
  "\u0642\u06CC\u0645\u062A \u0642\u062F\u06CC\u0645": "bg-blue-500 text-white",
  "\u0627\u0631\u0633\u0627\u0644 \u0631\u0627\u06CC\u06AF\u0627\u0646": "bg-emerald-500 text-white",
  "\u06AF\u0627\u0631\u0627\u0646\u062A\u06CC \u0637\u0644\u0627\u06CC\u06CC": "bg-yellow-500 text-white",
  "\u0628\u0644\u06A9 \u0641\u0631\u0627\u06CC\u062F\u06CC": "bg-black text-white hover:bg-gray-900 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse",
  "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u0628\u0647\u0627\u0631\u06CC": "bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg shadow-pink-200",
  "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u0646\u0648\u0631\u0648\u0632\u06CC": "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-2 border-yellow-400 shadow-lg shadow-green-200 animate-bounce",
  "\u062C\u0634\u0646\u0648\u0627\u0631\u0647 \u06CC\u0644\u062F\u0627": "bg-gradient-to-r from-red-600 to-red-800 text-white border-2 border-emerald-500 shadow-lg shadow-red-200",
  "\u062D\u0631\u0627\u062C \u0622\u062E\u0631 \u0641\u0635\u0644": "bg-gradient-to-r from-orange-400 to-orange-600 text-white border border-amber-300 shadow-md",
  "\u067E\u0631\u0641\u0631\u0648\u0634\u200C\u062A\u0631\u06CC\u0646": "bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950 font-black border-2 border-amber-200 shadow-lg",
  "\u0645\u0648\u062C\u0648\u062F \u0634\u062F": "bg-teal-500 text-white animate-pulse",
  "\u062A\u062E\u0641\u06CC\u0641 \u062F\u0627\u0646\u0634\u062C\u0648\u06CC\u06CC": "bg-indigo-500 text-white border border-indigo-300",
  "\u062E\u0631\u06CC\u062F \u0639\u0645\u062F\u0647": "bg-slate-700 text-white shadow-sm",
  "\u062C\u062F\u06CC\u062F": "bg-cyan-500 text-white border border-cyan-200",
  "\u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0648\u06CC\u0698\u0647": "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-200",
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