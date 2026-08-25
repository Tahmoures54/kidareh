export interface StoreItem {
  id: number;
  name: string;
  category: string;
  city: string;
  province?: string;
  image_url?: string | null;
  avg_rating?: number;
  review_count?: number;
  product_count?: number;
  blue_tick_expires_at?: string | null;
}

export type FilterKey = "all" | "verified" | "top" | "active";
export type SortKey = "default" | "rating" | "products" | "name";

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "default",  label: "پیش‌فرض" },
  { id: "rating",   label: "بالاترین امتیاز" },
  { id: "products", label: "بیشترین کالا" },
  { id: "name",     label: "نام فروشگاه (الفبا)" },
];