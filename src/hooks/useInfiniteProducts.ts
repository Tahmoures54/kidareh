// src/hooks/useInfiniteProducts.ts
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import {
  fetchProductsPage,
  type FetchProductsParams,
} from "@/services/products.service";
import type { ProductsPageResponse } from "@/types/product";

export interface UseInfiniteProductsInput {
  enabled?: boolean;
  limit?: number;
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

export function useInfiniteProducts(input: UseInfiniteProductsInput = {}) {
  const {
    enabled = true,
    limit = 20,
    q,
    category,
    city,
    province,
    scope = "all",
    sort = "newest",
    onlyAvailable,
    minPrice,
    maxPrice,
    radiusKm,
    lat,
    lng,
  } = input;

  const normalizedParams: Omit<FetchProductsParams, "cursor"> = {
    limit,
    q: q?.trim() || undefined,
    category: category || undefined,
    city: city || undefined,
    province: province || undefined,
    scope,
    sort,
    onlyAvailable,
    minPrice,
    maxPrice,
    radiusKm,
    lat,
    lng,
  };

  return useInfiniteQuery<
    ProductsPageResponse,
    Error,
    InfiniteData<ProductsPageResponse>,
    readonly [string, Omit<FetchProductsParams, "cursor">],
    string | null
  >({
    queryKey: ["products-infinite", normalizedParams] as const,
    queryFn: ({ pageParam }) =>
      fetchProductsPage({
        ...normalizedParams,
        cursor: pageParam ?? null,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? null : undefined,
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}