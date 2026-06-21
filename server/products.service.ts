// src/services/products.service.ts
import { apiRequest } from "../utils/api";
import type { ProductsPageResponse } from "../types/product";

export type ProductsScope = "all" | "city" | "province";
export type ProductsSort = "newest" | "cheapest" | "nearest";

export interface FetchProductsParams {
  limit?: number;
  cursor?: string | null;
  q?: string;
  category?: string;
  city?: string;
  province?: string;
  scope?: ProductsScope;
  sort?: ProductsSort;
  onlyAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  radiusKm?: number;
  lat?: number;
  lng?: number;
}

const clean = (obj: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) =>
        v !== undefined &&
        v !== null &&
        v !== "" &&
        !(typeof v === "number" && Number.isNaN(v))
    )
  );

const qs = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  Object.entries(clean(params)).forEach(([k, v]) => sp.set(k, String(v)));
  return sp.toString();
};

export async function fetchProductsPage(
  params: FetchProductsParams
): Promise<ProductsPageResponse> {
  const query = qs({
    limit: params.limit ?? 20,
    cursor: params.cursor ?? undefined,
    q: params.q,
    category: params.category,
    city: params.city,
    province: params.province,
    scope: params.scope ?? "all",
    sort: params.sort ?? "newest",
    onlyAvailable: params.onlyAvailable ? 1 : undefined,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    radiusKm: params.radiusKm,
    lat: params.lat,
    lng: params.lng,
  });

  const data = await apiRequest<ProductsPageResponse>(
    `/api/products/search?${query}`,
    {
      method: "GET",
      auth: false,
    }
  );

  return {
    products: Array.isArray(data?.products) ? data.products : [],
    nextCursor: data?.nextCursor ?? null,
    hasMore: !!data?.hasMore,
    total: data?.total,
  };
}