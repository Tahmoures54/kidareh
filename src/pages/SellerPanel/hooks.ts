import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../utils/api";
import { Product, StoreInfo, ChartData, ProductStatus, StoreFormValues } from "./types";

export const useSellerProducts = (enabled: boolean) => {
  return useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const data = await apiRequest<any[]>("/api/products/seller", { method: "GET", auth: true });
      return data.map(p => ({
        ...p,
        status: (p.status || "ناموجود").trim() as ProductStatus,
        price: typeof p.price === "number" ? p.price : Number(String(p.price).replace(/[^\d]/g, "")) || 0
      })) as Product[];
    },
    enabled
  });
};

export const useStoreInfo = (enabled: boolean) => {
  return useQuery({
    queryKey: ["store-info"],
    queryFn: () => apiRequest<StoreInfo>("/api/stores/my/store", { method: "GET", auth: true }),
    enabled
  });
};

export const useStoreStats = (period: "weekly" | "monthly", enabled: boolean) => {
  return useQuery({
    queryKey: ["store-stats", period],
    queryFn: () => apiRequest<ChartData[]>(`/api/stores/my/stats?period=${period}`, { method: "GET", auth: true }),
    enabled,
    initialData: period === "weekly" 
      ? [{ name: "ش", views: 80 }, { name: "ی", views: 120 }, { name: "د", views: 150 }, { name: "س", views: 110 }, { name: "چ", views: 190 }, { name: "پ", views: 240 }, { name: "ج", views: 300 }]
      : [{ name: "هفته ۱", views: 850 }, { name: "هفته ۲", views: 1200 }, { name: "هفته ۳", views: 980 }, { name: "هفته ۴", views: 1400 }]
  });
};

export const useContactsCount = (enabled: boolean) => {
  return useQuery({
    queryKey: ["contacts-count"],
    queryFn: () => apiRequest<{ count: number }>("/api/stores/my/contacts/count", { method: "GET", auth: true }),
    enabled,
    initialData: { count: 84 }
  });
};

export const useFollowersCount = (enabled: boolean) => {
  return useQuery({
    queryKey: ["followers-count"],
    queryFn: () => apiRequest<{ count: number }>("/api/stores/my/followers", { method: "GET", auth: true }),
    enabled,
    initialData: { count: 0 }
  });
};

// Optimistic Mutations
export const useUpdateProductStatus = (onSuccessCb: (msg: string) => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProductStatus }) => apiRequest(`/api/products/${id}/status`, { method: "PUT", auth: true, body: { status } }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["seller-products"] });
      const prev = queryClient.getQueryData<Product[]>(["seller-products"]);
      queryClient.setQueryData<Product[]>(["seller-products"], old => old?.map(p => p.id === id ? { ...p, status } : p));
      return { prev };
    },
    onError: (err, vars, ctx) => queryClient.setQueryData(["seller-products"], ctx?.prev),
    onSuccess: (data, vars) => onSuccessCb(`وضعیت به "${vars.status}" تغییر یافت`)
  });
};

export const useToggleProductVisibility = (onSuccessCb: (msg: string) => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: number; isPublic: boolean }) => apiRequest(`/api/products/${id}/visibility`, { method: "PUT", auth: true, body: { isPublic } }),
    onMutate: async ({ id, isPublic }) => {
      await queryClient.cancelQueries({ queryKey: ["seller-products"] });
      const prev = queryClient.getQueryData<Product[]>(["seller-products"]);
      queryClient.setQueryData<Product[]>(["seller-products"], old => old?.map(p => p.id === id ? { ...p, isPublic } : p));
      return { prev };
    },
    onError: (err, vars, ctx) => queryClient.setQueryData(["seller-products"], ctx?.prev),
    onSuccess: (data, vars) => onSuccessCb(vars.isPublic ? "کالا منتشر شد" : "کالا پیش‌نویس شد")
  });
};

export const useDeleteProduct = (onSuccessCb: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/api/products/${id}`, { method: "DELETE", auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      onSuccessCb();
    }
  });
};

export const useUpdateStore = (onSuccessCb: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StoreFormValues) => apiRequest("/api/stores", { method: "POST", auth: true, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-info"] });
      onSuccessCb();
    }
  });
};