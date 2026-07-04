export const HOME_CONFIG = {
  CATEGORIES_DISPLAY_COUNT: 10,
  PRODUCTS_PER_PAGE: 20,
  ANIMATION_STAGGER: 0.06,
  SKELETON_COUNT: 4,
} as const;

export const SPRING_TRANSITION = { 
  type: "spring" as const, 
  stiffness: 300, 
  damping: 24 
};

export interface AppUser {
  id: string;
  role: "buyer" | "seller" | "admin" | "support" | "referrer";
  name?: string;
  phone?: string;
  avatar_url?: string;
}