// src/pages/SellerPanel/components/constants.ts
import { ProductStatus } from "../types";

export const FALLBACK_IMAGE = "https://placehold.co/300x300/1f2937/a1a1aa?text=No+Image";

export const STATUS_STYLE: Record<ProductStatus, string> = {
  "ãæÌæÏ":
    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  "ãæÌæÏí ˜ã":
    "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  "İŞØ ? ÚÏÏ":
    "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
  "äÇãæÌæÏ":
    "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-light)]",
};