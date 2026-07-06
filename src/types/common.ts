// نوع‌های مشترک بین Home و Search
export type SortType = "newest" | "nearest" | "cheapest" | "expensive";

export type ViewMode = "list" | "map";

export type LocationScopeType = "city" | "province" | "country";

export interface LocationScope {
  type: LocationScopeType;
  id?: string;
  name?: string;
}

export interface BaseProduct {
  id: string | number;
  name: string;
  price: number | string;
  image_url?: string;
  city?: string;
  store_name?: string;
  badge?: string | null;
  views?: number;
  lat?: number;
  lng?: number;
  status?: string;
  updated?: string;
  updated_at?: string;
  rating?: number;
  distanceMeters?: number;
  distance?: string;
}
