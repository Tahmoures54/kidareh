/**
 * Maps store guild names to catalog category values.
 */

import {
  getAllFlatCategories,
  resolveCategoryRef,
  searchCategories,
} from "../data/processed/categories";

export type StoreCategoryKey = string;
export type ProductCategory = string;

export function getProductCategoryFromStoreCategory(
  storeCategory: string | undefined | null
): ProductCategory {
  if (!storeCategory?.trim()) return "other";

  const resolved = resolveCategoryRef(storeCategory);
  if (resolved?.type) return resolved.type.value;
  if (resolved?.kind === "group") return resolved.group.slug;

  const hits = searchCategories(storeCategory, 5);
  return hits[0]?.value ?? "other";
}

export function getAvailableProductCategories(): ProductCategory[] {
  return getAllFlatCategories().map((item) => item.value);
}

export function getAllStoreCategories(): StoreCategoryKey[] {
  return getAllFlatCategories().map((item) => item.text);
}

export default {
  getProductCategoryFromStoreCategory,
  getAvailableProductCategories,
  getAllStoreCategories,
};
