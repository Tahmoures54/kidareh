import type { Transition } from "framer-motion";

/**
 * تنظیمات کلی صفحه اصلی
 * استفاده از as const باعث می‌شود تمام مقادیر Readonly شوند
 */
export const HOME_CONFIG = {
  /** تعداد دسته‌بندی‌های نمایش داده‌شده در اسلایدر */
  CATEGORIES_DISPLAY_COUNT: 12,
  /** تعداد محصولات در هر صفحه (برای infinite scroll) */
  PRODUCTS_PER_PAGE: 20,
  /** تاخیر بین انیمیشن‌های staggered */
  ANIMATION_STAGGER: 0.05,
  /** تعداد اسکلتون‌های نمایش داده‌شده هنگام بارگذاری */
  SKELETON_COUNT: 8,
  /** تاخیر debounce برای جستجو (میلی‌ثانیه) */
  SEARCH_DEBOUNCE_MS: 500,
  /** حداکثر عرض نام شهر در هدر (پیکسل) */
  HEADER_CITY_MAX_WIDTH: 100,
} as const;

/**
 * تنظیمات انیمیشن‌های Framer Motion
 * استفاده از satisfies برای اطمینان از سازگاری با تایپ Transition
 */
export const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 24,
} as const satisfies Transition;

/**
 * گزینه‌های مرتب‌سازی
 */
export const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
] as const;

// استخراج خودکار تایپ‌ها از روی مقادیر (TypeScript Magic)
export type SortType = (typeof SORT_OPTIONS)[number]["value"];

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

/**
 * موقعیت مکانی دستی ذخیره‌شده در localStorage
 */
export interface ManualLocation {
  city: string;
  display: string;
  province: string;
}
