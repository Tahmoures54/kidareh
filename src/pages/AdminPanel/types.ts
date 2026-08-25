export type Tab = "support" | "users" | "products" | "reports" | "settings" | "stores";

export interface PendingProduct {
  id: number | string;
  name: string;
  image_url?: string | null;
  store_id: number | string;
  price?: number | null;
}

export interface ReportItem {
  id: number;
  product_id: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface UserItem {
  id: number;
  name?: string | null;
  phone: string;
  role: string;
  is_banned: number;
  has_business_license: number;
  store_name?: string | null;
}

export interface StoreItem {
  id: number;
  name: string;
  owner_name: string;
  owner_phone: string;
  city: string;
  follower_count: number;
  has_blue_tick: boolean;
  blue_tick_expires_at: string | null;
}

export type BadgeConfig = { price: number; duration: number };
export type BadgeConfigs = Record<string, BadgeConfig>;