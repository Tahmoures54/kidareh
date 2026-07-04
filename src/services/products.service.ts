import { apiRequest } from "../utils/api"; // مسیر را بر اساس پروژه خود اصلاح کنید
import type { ProductsPageResponse } from "../types/product";

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

export interface CreateProductPayload {
  name: string;
  price: number;
  status: string;
  category?: string;
  description?: string;
  image_url?: string;
}

function buildQueryString(params: FetchProductsParams): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

export async function fetchProductsPage(params: FetchProductsParams): Promise<ProductsPageResponse> {
  const query = buildQueryString(params);
  const path = `/api/products/search${query ? `?${query}` : ""}`;
  return apiRequest<ProductsPageResponse>(path, { method: "GET" });
}

// --- Seller Panel APIs ---

export async function fetchSellerProducts(): Promise<ProductsPageResponse> {
  return apiRequest<ProductsPageResponse>("/api/seller/products", { method: "GET", auth: true });
}

export async function createProduct(payload: CreateProductPayload) {
  return apiRequest("/api/seller/products", { 
    method: "POST", 
    body: payload, 
    auth: true 
  });
}

export async function updateProduct(id: number, payload: Partial<CreateProductPayload>) {
  return apiRequest(`/api/seller/products/${id}`, { 
    method: "PUT", 
    body: payload, 
    auth: true 
  });
}

export async function deleteProduct(id: number) {
  return apiRequest(`/api/seller/products/${id}`, { 
    method: "DELETE", 
    auth: true 
  });
}