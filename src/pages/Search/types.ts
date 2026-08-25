export type { SortType, ViewMode, LocationScopeType, LocationScope } from "../../types/common";

export interface ProductResult {
  id: number | string;
  name: string;
  store_name: string;
  distance: string;
  distanceMeters?: number;
  price: number | string;
  status: string;
  updated: string;
  image_url: string;
  rating: number;
  badge: string | null;
  lat?: number;
  lng?: number;
}

export interface SearchFilters {
  minPrice: string;
  maxPrice: string;
  selectedRadius: string;
  onlyAvailable: boolean;
  sortBy: SortType;
  scope: LocationScope;
}
