import { z } from "zod";

export type ProductStatus = "موجود" | "فقط ۱ عدد" | "ناموجود";
export type ChartPeriod = "weekly" | "monthly";
export type FilterType = ProductStatus | "all";

export interface Product {
  id: number;
  name: string;
  price: number;
  status: ProductStatus;
  views: number;
  isPublic: boolean;
  badge?: string | null;
  image?: string | null;
  image_url?: string | null;
}

export interface StoreInfo {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  category: string;
  city?: string;
  province?: string;
  lat?: number | null;
  lng?: number | null;
  opening_hours?: string | null;
  image?: string;
  blue_tick_expires_at?: string | null;
  total_products?: number;
  follower_count?: number;
  total_views?: number;
}

export interface ChartData {
  name: string;
  views: number;
}

export const storeFormSchema = z.object({
  name: z.string().min(2, "نام فروشگاه باید حداقل ۲ حرف باشد"),
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل نامعتبر است (مثال: 0912...)"),
  category: z.string().min(2, "دسته‌بندی الزامی است"),
  description: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  opening_hours: z.string().max(5000).nullable().optional(),
});

export type StoreFormValues = z.infer<typeof storeFormSchema>;
