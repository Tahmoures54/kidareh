import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchProductsPage, type FetchProductsParams } from "../services/products.service";

/* ====================== TYPES ====================== */

export interface Product {
  id: string;
  name: string;
  price?: number;
  image_url?: string;
  badge?: string;
  store_name?: string;
  status?: "موجود" | "ناموجود";
  city?: string;
  views?: number; // اضافه شده بر اساس کدهای قبلی شما
  // Pro Tip: بجای any، از unknown یا Record استفاده کنید تا Type Safety حفظ شود
  metadata?: Record<string, unknown>; 
}

export interface ProductsPageResponse {
  products: Product[];
  hasMore: boolean;
  nextCursor?: string | null;
  total?: number;
}

export interface UseInfiniteProductsInput {
  enabled?: boolean;
  limit?: number;
  q?: string;
  category?: string | null;
  city?: string;
  province?: string;
  scope?: "all" | "city" | "province";
  sort?: "newest" | "cheapest" | "nearest" | "popular";
  onlyAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  radiusKm?: number;
  lat?: number;
  lng?: number;
  storeId?: string;
  userId?: string;
}

/* ====================== CONSTANTS ====================== */

const DEFAULT_LIMIT = 20;
const STALE_TIME = 2 * 60 * 1000; // ۲ دقیقه - دیتای تازه
const CACHE_TIME = 10 * 60 * 1000; // ۱۰ دقیقه - ماندگاری در مموری
const RETRY_ATTEMPTS = 2;

/* ====================== QUERY KEYS FACTORY ====================== */
// Pro Tip: معماری متمرکز کلیدهای کش. برای Invalidate کردن در زمان لایک یا ویرایش بسیار مفید است.
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  infinite: (filters: Omit<FetchProductsParams, "cursor">) => 
    [...productKeys.lists(), "infinite", filters] as const,
};

/* ====================== HOOK ====================== */

export function useInfiniteProducts(input: UseInfiniteProductsInput = {}) {
  const {
    enabled = true,
    limit = DEFAULT_LIMIT,
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
    storeId,
    userId,
  } = input;

  const normalizedParams = useMemo<Omit<FetchProductsParams, "cursor">>(() => {
    return {
      limit,
      q: q?.trim() || undefined,
      category: category || undefined,
      city: scope === "city" && city ? city : undefined,
      province: scope === "province" && province ? province : undefined,
      scope,
      sort,
      onlyAvailable: onlyAvailable || undefined,
      minPrice,
      maxPrice,
      radiusKm,
      lat,
      lng,
      storeId,
      userId,
    };
  }, [
    limit, q, category, city, province, scope, sort, onlyAvailable,
    minPrice, maxPrice, radiusKm, lat, lng, storeId, userId
  ]);

  const query = useInfiniteQuery<
    ProductsPageResponse,
    Error,
    InfiniteData<ProductsPageResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: productKeys.infinite(normalizedParams), // استفاده از Factory
    queryFn: async ({ pageParam }) => {
      return fetchProductsPage({
        ...normalizedParams,
        cursor: pageParam ?? null,
      });
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined;
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: RETRY_ATTEMPTS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Pro Tip: انجام محاسبات سنگین در داخل هوک با useMemo
  // این کار باعث می‌شود کامپوننت Home نیازی به محاسبه مجدد flatMap نداشته باشد
  const flatProducts = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.products) ?? [];
  }, [query.data]);

  const totalCount = useMemo(() => {
    return query.data?.pages[0]?.total ?? 0;
  }, [query.data]);

  // برگرداندن شیء غنی‌تر به کامپوننت
  return {
    ...query,
    flatProducts,
    totalCount
  };
}
