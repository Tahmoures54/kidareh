// src/hooks/useInfiniteProducts.ts
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchProductsPage, type FetchProductsParams } from "../services/products.service";

/* ====================== TYPES ====================== */

// توجه: ایمپورت Product حذف شد تا با این اینترفیس تداخل نداشته باشد.
// اگر در پروژه تایپ مرجع دارید، می‌توانید این را پاک کنید و فقط ایمپورت کنید.
export interface Product {
  id: string;
  name: string;
  price?: number;
  image_url?: string;
  badge?: string;
  store_name?: string;
  status?: "موجود" | "ناموجود";
  city?: string;
  [key: string]: any;
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
  category?: string | null; // اجازه دادن به null برای حالت "همه آگهی‌ها"
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
const STALE_TIME = 2 * 60 * 1000; // ۲ دقیقه - برای فروشگاه زمان بهتری است
const CACHE_TIME = 10 * 60 * 1000; // ۱0 دقیقه
const RETRY_ATTEMPTS = 2; // در صورت قطعی لحظه‌ای اینترنت، ۲ بار تلاش کند

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

  // نرمال‌سازی پارامترها و پایدار کردن آن‌ها با useMemo
  // این کار باعث می‌شود React Query دسته‌بندی‌ها را دقیقاً رصد کند
  const normalizedParams = useMemo<Omit<FetchProductsParams, "cursor">>(() => {
    return {
      limit,
      q: q?.trim() || undefined,
      category: category || undefined, // اگر null یا خالی باشد، undefined می‌فرستد
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

  return useInfiniteQuery<
    ProductsPageResponse,
    Error,
    InfiniteData<ProductsPageResponse>,
    readonly [string, Omit<FetchProductsParams, "cursor">],
    string | null
  >({
    queryKey: ["products-infinite", normalizedParams] as const,
    queryFn: async ({ pageParam }) => {
      return fetchProductsPage({
        ...normalizedParams,
        cursor: pageParam ?? null,
      });
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      // اگر صفحه بعدی وجود داشت، کرسر آن را بده، در غیر این صورت undefined
      return lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined;
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME, // gcTime جایگزین cacheTime در نسخه‌های جدید React Query است
    retry: RETRY_ATTEMPTS,
    refetchOnWindowFocus: false, // جلوگیری از رفرش بی‌دلیل وقتی کاربر بین تب‌ها جابجا می‌شود
    refetchOnMount: false,
  });
}