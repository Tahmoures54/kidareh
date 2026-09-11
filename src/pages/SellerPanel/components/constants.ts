import { ProductStatus } from "../types";

export const FALLBACK_IMAGE = "https://placehold.co/300x300/e8f7f6/00A693?text=%D8%A8%D8%AF%D9%88%D9%86+%D8%B9%DA%A9%D8%B3";

const inStock = "bg-emerald-50 text-emerald-700 border-emerald-200";
const low = "bg-amber-50 text-amber-700 border-amber-200";
const last = "bg-orange-50 text-orange-700 border-orange-200";
const out = "bg-rose-50 text-rose-700 border-rose-200";

export const STATUS_STYLE: Record<ProductStatus, string> = {
  "موجود": inStock,
  "موجودی کم": low,
  "فقط ۱ عدد": last,
  "ناموجود": out,
};

export const STATUS_STYLE_ANY: Record<string, string> = {
  ...STATUS_STYLE,
  "فقط ۳ عدد": last,
};
