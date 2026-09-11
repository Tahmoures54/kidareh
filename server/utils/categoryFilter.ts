import { getCategoryFilterValues } from "../../src/data/processed/categories.js";

export function applyProductCategoryFilter(category: string | undefined | null): {
  sql: string;
  params: string[];
} {
  const tokens = getCategoryFilterValues(category);
  if (!tokens.length) return { sql: "", params: [] };
  const placeholders = tokens.map(() => "?").join(",");
  return {
    sql: `(p.category IN (${placeholders}) OR s.category IN (${placeholders}))`,
    params: [...tokens, ...tokens],
  };
}

export function applyStoreCategoryFilter(category: string | undefined | null): {
  sql: string;
  params: string[];
} {
  const tokens = getCategoryFilterValues(category);
  if (!tokens.length) return { sql: "", params: [] };
  const placeholders = tokens.map(() => "?").join(",");
  return {
    sql: `s.category IN (${placeholders})`,
    params: tokens,
  };
}
