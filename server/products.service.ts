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

/**
 * حذف پارامترهای undefined/null/تهی از یک شیء
 */
function cleanParams(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) =>
        v !== undefined &&
        v !== null &&
        v !== "" &&
        !(typeof v === "number" && Number.isNaN(v))
    )
  );
}

/**
 * ساخت query string از یک شیء (با رمزنگاری خودکار)
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  const cleaned = cleanParams(params);
  for (const [key, value] of Object.entries(cleaned)) {
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

/**
 * دریافت یک صفحه از محصولات با پارامترهای جستجو
 */
export async function fetchProductsPage(
  params: FetchProductsParams
): Promise<ProductsPageResponse> {
  const query = buildQueryString({
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
    `/api/products/search${query ? `?${query}` : ""}`,
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