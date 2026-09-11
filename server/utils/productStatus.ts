/** Must match products.status CHECK in db.ts */
export const PRODUCT_STATUSES = ["موجود", "فقط ۱ عدد", "ناموجود", "به‌زودی"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export function normalizeProductStatus(raw: unknown): ProductStatus | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if ((PRODUCT_STATUSES as readonly string[]).includes(t)) return t as ProductStatus;
  if (t === "موجودی کم" || t === "فقط ۳ عدد") return "فقط ۱ عدد";
  if (t === "به زودی" || t === "بزودی") return "به‌زودی";
  return null;
}
