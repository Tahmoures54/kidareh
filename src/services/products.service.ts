// src/services/products.service.ts
import { apiRequest } from "@/utils/api";
import type { ProductsPageResponse } from "@/types/product";

export interface FetchProductsParams {
  limit?: number;
  cursor?: string | null;
  q?: string;
  category?: string;
  city?: string;
  province?: string;
  scope?: "all" | "city" | "province";
  sort?: "newest" | "cheapest" | "nearest";
  onlyAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  radiusKm?: number;
  lat?: number;
  lng?: number;
}

/**
 * Convert FetchProductsParams to URL query string.
 * Only non‑empty values are included.
 */
function buildQueryString(params: FetchProductsParams): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

/**
 * Fetch a single page of products from the search API.
 */
export async function fetchProductsPage(
  params: FetchProductsParams
): Promise<ProductsPageResponse> {
  const query = buildQueryString(params);
  const path = `/api/products/search${query ? `?${query}` : ""}`;
  return apiRequest<ProductsPageResponse>(path, { method: "GET" });
}