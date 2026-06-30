export interface Product {
  id: number;
  name: string;
  price: number | string;
  status: string;
  views: number;
  badge?: string | null;
  image_url?: string | null;
}

export interface StoreData {
  id: number;
  name: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviews: number;
  joined: string;
  image?: string | null;
  verified?: boolean;
  description?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  products?: Product[];
  blue_tick_expires_at?: string | null;
}

export type TabMode = "products" | "about";

export interface DistInfo {
  text: string;
  mins: string;
}