/**
 * Cached product list + detail helpers
 */
import db from "../db.js";
import {
  cacheGet,
  cacheSet,
  cacheGetOrSet,
  hashParams,
  CacheKeys,
  CacheTTL,
  invalidateProductCache,
  invalidateSearchCache,
} from "./cache.js";

export async function getCachedProductList(query: {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  scope?: string;
  city?: string;
  page?: string;
  limit?: string;
}) {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    scope = "city",
    city = "تهران",
    page = "1",
    limit = "20",
  } = query;

  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
  const offset = (pageNum - 1) * limitNum;

  const listCacheKey = CacheKeys.search(
    hashParams({
      route: "list",
      q: q ?? "",
      category: category ?? "",
      minPrice: minPrice ?? "",
      maxPrice: maxPrice ?? "",
      scope,
      city,
      page: pageNum,
      limit: limitNum,
    })
  );

  const cachedList = await cacheGet<any>(listCacheKey);
  if (cachedList) return { payload: cachedList, cache: "HIT" as const, pageNum, limitNum, offset, listCacheKey };

  return { listCacheKey, pageNum, limitNum, offset, cache: "MISS" as const };
}

export async function storeCachedProductList(key: string, payload: unknown) {
  await cacheSet(key, payload, CacheTTL.SEARCH);
}

export async function getCachedProductDetail(id: string | number) {
  return cacheGetOrSet(CacheKeys.product(id), CacheTTL.PRODUCT, () => {
    return (
      db
        .prepare(
          `
      SELECT 
        p.*,
        s.name as store_name,
        s.has_business_license,
        s.lat,
        s.lng,
        s.address,
        s.city as store_city,
        s.province as store_province,
        u.phone as store_phone
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE p.id = ?
    `
        )
        .get(id) ?? null
    );
  });
}

export { invalidateProductCache, invalidateSearchCache };
