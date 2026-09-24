export const BUYABLE_PRODUCT_STATUSES = ["موجود", "فقط ۱ عدد"] as const;

export function isProductAvailable(status: unknown): boolean {
  if (typeof status !== "string") return false;
  const normalized = status.trim().toLowerCase();
  return normalized === "موجود" || normalized === "فقط ۱ عدد" || normalized === "available";
}

export function productStatusLabel(status: unknown): string {
  if (typeof status !== "string" || !status.trim()) return "ناموجود";
  return status.trim();
}
