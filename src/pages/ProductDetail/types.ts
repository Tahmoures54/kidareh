export interface ProductData {
  id: number;
  name: string;
  price: number | string;
  status: string;
  badge?: string;
  image_url?: string;
  images?: string[];
  description?: string;
  category?: string;
  views?: number;
  saves?: number;
  created_at: string;
  store_id: number;
  store_name?: string;
  store_phone?: string;
  store_city?: string;
  has_business_license?: boolean;
  lat?: number;
  lng?: number;
  address?: string;
  blue_tick_expires_at?: string | null;
}

export interface Review {
  id: number;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
}