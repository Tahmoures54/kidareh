// src/types/product.ts

export interface ProductApiItem {
  id: number;
  name: string;
  price: number | string;
  status: string;
  badge?: string | null;
  image_url?: string | null;
  description?: string;
  category?: string;
  views?: number;
  created_at: string;
  updated_at?: string;
  store_id: number;
  store_name?: string;
  store_phone?: string;
  city?: string;
  province?: string;
  lat?: number;
  lng?: number;
  rating?: number;
}

export interface ProductsPageResponse {
  products: ProductApiItem[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}