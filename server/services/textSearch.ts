/**
 * Shared text-search filter builders (FTS5 with LIKE fallback)
 */
import { searchProductIdsFts, searchStoreIdsFts, isFtsReady } from "./fts.js";
import { buildLikePattern } from "./persianText.js";

export function applyProductTextSearch(
  q: string,
  baseConditions: string,
  params: unknown[],
  countParams: unknown[]
): { baseConditions: string; engine: "fts5" | "like" } {
  if (!q?.trim()) return { baseConditions, engine: "like" };

  if (isFtsReady()) {
    const ids = searchProductIdsFts(q, 1000);
    if (ids.length > 0) {
      const ph = ids.map(() => "?").join(",");
      baseConditions += ` AND p.id IN (${ph})`;
      params.push(...ids);
      countParams.push(...ids);
      return { baseConditions, engine: "fts5" };
    }
  }

  const searchTerm = buildLikePattern(q);
  baseConditions +=
    " AND (p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\')";
  params.push(searchTerm, searchTerm, searchTerm);
  countParams.push(searchTerm, searchTerm, searchTerm);
  return { baseConditions, engine: "like" };
}

export function applyStoreTextSearch(q: string): {
  sqlFragment: string;
  params: unknown[];
  engine: "fts5" | "like";
} {
  if (!q?.trim()) return { sqlFragment: "", params: [], engine: "like" };

  if (isFtsReady()) {
    const ids = searchStoreIdsFts(q, 1000);
    if (ids.length > 0) {
      const ph = ids.map(() => "?").join(",");
      return { sqlFragment: ` AND s.id IN (${ph})`, params: ids, engine: "fts5" };
    }
  }

  return {
    sqlFragment: " AND s.name LIKE ? ESCAPE '\\'",
    params: [buildLikePattern(q)],
    engine: "like",
  };
}
