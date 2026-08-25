/**
 * تنظیمات کلی صفحه اصلی
 * استفاده از as const باعث می‌شود تمام مقادیر Readonly شوند
 */
export const HOME_CONFIG = {
  CATEGORIES_DISPLAY_COUNT: 12,
  PRODUCTS_PER_PAGE: 20,
  ANIMATION_STAGGER: 0.05,
  SKELETON_COUNT: 8,
  SEARCH_DEBOUNCE_MS: 500,
} as const;

/**
 * تنظیمات انیمیشن‌های Framer Motion
 */
export const SPRING_TRANSITION = { 
  type: "spring", 
  stiffness: 300, 
  damping: 24 
} as const;

/**
 * گزینه‌های مرتب‌سازی
 */
export const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
] as const;

// استخراج خودکار تایپ‌ها از روی مقادیر (TypeScript Magic)
export type SortType = typeof SORT_OPTIONS[number]["value"];

/**
 * مدل داده‌ای کاربر
 */
export interface AppUser {
  id: string;
  role: "buyer" | "seller" | "admin" | "support" | "referrer";
  name?: string;
  phone?: string;
  avatar_url?: string;
}
