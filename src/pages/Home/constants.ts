export const HOME_CONFIG = {
  CATEGORIES_DISPLAY_COUNT: 12,
  PRODUCTS_PER_PAGE: 20,
  ANIMATION_STAGGER: 0.05,
  SKELETON_COUNT: 8,
  SEARCH_DEBOUNCE_MS: 500,
} as const;

export const SPRING_TRANSITION = { 
  type: "spring" as const, 
  stiffness: 300, 
  damping: 24 
};

export const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
] as const;

export type SortType = typeof SORT_OPTIONS[number]["value"];

export interface AppUser {
  id: string;
  role: "buyer" | "seller" | "admin" | "support" | "referrer";
  name?: string;
  phone?: string;
  avatar_url?: string;
}
