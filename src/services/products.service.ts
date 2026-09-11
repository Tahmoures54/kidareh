import { apiRequest, ApiError } from "../utils/api";
import type { ProductApiItem, ProductsPageResponse } from "../types/product";

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
  image?: File;
}

function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export function normalizeSellerProductsResponse(data: unknown): ProductsPageResponse {
  if (Array.isArray(data)) {
    return { products: data as ProductApiItem[], nextCursor: null, hasMore: false, total: data.length };
  }
  const products = ((data as { products?: ProductApiItem[] } | null)?.products ?? []) as ProductApiItem[];
  return { products, nextCursor: null, hasMore: false, total: products.length };
}

function getBaseUrl() {
  const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  return (envBase || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
}

async function sendProductPayload(
  path: string,
  method: "POST" | "PUT",
  payload: Partial<CreateProductPayload>
) {
  const { image, ...rest } = payload;
  if (image instanceof File) {
    const form = new FormData();
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        form.append(key, String(value));
      }
    });
    form.append("image", image);
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method,
      credentials: "include",
      body: form,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      throw new ApiError(data?.error || `خطا (${res.status})`, res.status, data);
    }
    return data;
  }
  return apiRequest(path, { method, body: rest, auth: true });
}

export async function fetchProductsPage(
  params: FetchProductsParams,
  signal?: AbortSignal
): Promise<ProductsPageResponse> {
  const query = buildQueryString(params);
  const path = `/api/products/search${query ? `?${query}` : ""}`;
  return apiRequest<ProductsPageResponse>(path, { method: "GET", signal });
}

export async function fetchSellerProducts(signal?: AbortSignal): Promise<ProductsPageResponse> {
  const data = await apiRequest<unknown>("/api/products/seller", {
    method: "GET",
    auth: true,
    signal,
  });
  return normalizeSellerProductsResponse(data);
}

export async function createProduct(payload: CreateProductPayload) {
  return sendProductPayload("/api/products", "POST", payload);
}

export async function updateProductStatus(id: number | string, status: string) {
  return apiRequest(`/api/products/${id}/status`, {
    method: "PUT",
    body: { status },
    auth: true,
  });
}

export async function updateProduct(id: number | string, payload: Partial<CreateProductPayload>) {
  const keys = Object.keys(payload).filter((key) => (payload as Record<string, unknown>)[key] !== undefined);
  if (keys.length === 1 && keys[0] === "status" && payload.status) {
    return updateProductStatus(id, payload.status);
  }
  return sendProductPayload(`/api/products/${id}`, "PUT", payload);
}

export async function deleteProduct(id: number | string) {
  return apiRequest(`/api/products/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
