import { apiRequest } from "../utils/api"; 
import type { ProductsPageResponse } from "../types/product";

/* ====================== TYPES ====================== */

export interface FetchProductsParams {
  limit?: number;
  cursor?: string | null;
  q?: string;
  category?: string;
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
}

export interface CreateProductPayload {
  name: string;
  price: number;
  status: string;
  category?: string;
  description?: string;
  image_url?: string;
}

/* ====================== HELPERS ====================== */

// Pro Tip: Generic کردن و امن‌تر کردن ساخت Query String
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    // جلوگیری از ارسال مقادیر بی‌معنی به سرور لیارا
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  
  return searchParams.toString();
}

/* ====================== PUBLIC APIs ====================== */

export async function fetchProductsPage(
  params: FetchProductsParams,
  signal?: AbortSignal // 🌟 Pro Tip: اضافه شدن سیگنال لغو درخواست
): Promise<ProductsPageResponse> {
  const query = buildQueryString(params);
  const path = `/api/products/search${query ? `?${query}` : ""}`;
  
  // ارسال سیگنال به تابع اصلی apiRequest
  return apiRequest<ProductsPageResponse>(path, { method: "GET", signal });
}

/* ====================== SELLER APIs ====================== */

export async function fetchSellerProducts(signal?: AbortSignal): Promise<ProductsPageResponse> {
  return apiRequest<ProductsPageResponse>("/api/seller/products", { 
    method: "GET", 
    auth: true,
    signal 
  });
}

export async function createProduct(payload: CreateProductPayload) {
  return apiRequest("/api/seller/products", { 
    method: "POST", 
    body: payload, 
    auth: true 
  });
}

// Pro Tip: در پروژه‌های مدرن آیدی می‌تواند string (مثل UUID) باشد، پس type آن را ایمن‌تر کردیم
export async function updateProduct(id: number | string, payload: Partial<CreateProductPayload>) {
  return apiRequest(`/api/seller/products/${id}`, { 
    method: "PUT", 
    body: payload, 
    auth: true 
  });
}

export async function deleteProduct(id: number | string) {
  return apiRequest(`/api/seller/products/${id}`, { 
    method: "DELETE", 
    auth: true 
  });
}
