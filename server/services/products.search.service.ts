/**
 * Products Search Service
 * FTS5 (Persian) + filters + Redis cache + featured rank boost
 */

import db from "../db.js";
import {
  cacheGet,
  cacheSet,
  hashParams,
  CacheKeys,
  CacheTTL,
} from "./cache.js";
import { searchProductIdsFts, isFtsReady } from "./fts.js";
import { buildLikePattern, normalizePersian } from "./persianText.js";

export interface SearchCursor {
  id: number;
}

export interface SearchParams {
  limit: number;
  cursor?: SearchCursor | null;
  q?: string;
  category?: string;
  city?: string;
  province?: string;
  scope?: "all" | "city" | "province";
  sort?: "newest" | "cheapest" | "nearest" | "relevance";
  onlyAvailable?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  radiusKm?: number | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ProductRow {
  id: number;
  name: string;
  price: number;
  status: string;
  badge: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  store_id: number;
  lat: number | null;
  lng: number | null;
  category: string | null;
  views: number;
  city: string;
  province: string;
  store_name: string;
  store_city: string;
  store_province: string;
  store_image_url: string | null;
  has_business_license: boolean;
  rating: number;
  distance: number | null;
}

export interface SearchResult {
  rows: ProductRow[];
  total: number | null;
  cached?: boolean;
  engine?: "fts5" | "like" | "none";
}

export async function searchProductsService(
  params: SearchParams
): Promise<SearchResult> {
  const cacheKey = CacheKeys.search(
    hashParams({
      limit: params.limit,
      cursor: params.cursor?.id ?? "",
      q: normalizePersian(params.q ?? ""),
      category: params.category ?? "",
      city: params.city ?? "",
      province: params.province ?? "",
      scope: params.scope ?? "",
      sort: params.sort ?? "",
      onlyAvailable: params.onlyAvailable ?? false,
      minPrice: params.minPrice ?? "",
      maxPrice: params.maxPrice ?? "",
      radiusKm: params.radiusKm ?? "",
      lat: params.lat != null ? Math.round(params.lat * 1000) / 1000 : "",
      lng: params.lng != null ? Math.round(params.lng * 1000) / 1000 : "",
      v: "fts2-featured",
    })
  );

  const cached = await cacheGet<SearchResult>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const result = searchProductsFromDb(params);
  await cacheSet(cacheKey, result, CacheTTL.SEARCH);
  return { ...result, cached: false };
}

function searchProductsFromDb(params: SearchParams): SearchResult {
  const {
    limit,
    cursor,
    q,
    category,
    city,
    province,
    scope,
    sort,
    onlyAvailable,
    minPrice,
    maxPrice,
    radiusKm,
    lat,
    lng,
  } = params;

  const where: string[] = [];
  const whereValues: unknown[] = [];
  let engine: SearchResult["engine"] = "none";

  where.push(`p.moderation_status = 'approved'`);

  if (q && q.trim()) {
    let usedFts = false;
    if (isFtsReady()) {
      const ids = searchProductIdsFts(q, 1000);
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        where.push(`p.id IN (${placeholders})`);
        whereValues.push(...ids);
        engine = "fts5";
        usedFts = true;
      }
    }

    if (!usedFts) {
      const like = buildLikePattern(q);
      whereValues.push(like, like, like);
      where.push(
        `(p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\')`
      );
      engine = "like";
    }
  }

  if (category) {
    whereValues.push(category);
    where.push(`p.category = ?`);
  }

  if (scope === "city" && city) {
    whereValues.push(city);
    where.push(`p.city = ?`);
  }

  if (scope === "province" && province) {
    whereValues.push(province);
    where.push(`p.province = ?`);
  }

  if (onlyAvailable) {
    where.push(`p.status IN ('موجود', 'فقط ۱ عدد')`);
  }

  if (minPrice != null) {
    whereValues.push(minPrice);
    where.push(`p.price >= ?`);
  }

  if (maxPrice != null) {
    whereValues.push(maxPrice);
    where.push(`p.price <= ?`);
  }

  if (cursor?.id != null) {
    whereValues.push(cursor.id);
    where.push(`p.id < ?`);
  }

  const hasCoords = lat != null && lng != null;

  const distanceExpr = hasCoords
    ? `(
        6371000 * acos(
          MIN(1.0, MAX(-1.0,
            cos(? * 0.017453292519943295) * cos(s.lat * 0.017453292519943295) *
            cos((s.lng - ?) * 0.017453292519943295) +
            sin(? * 0.017453292519943295) * sin(s.lat * 0.017453292519943295)
          ))
        )
      )`
    : `NULL`;

  const selectDistanceValues: number[] = hasCoords
    ? [lat as number, lng as number, lat as number]
    : [];

  let radiusClause = "";
  const radiusValues: number[] = [];
  if (radiusKm != null && hasCoords) {
    radiusClause = `${distanceExpr} <= ?`;
    radiusValues.push(lat as number, lng as number, lat as number, radiusKm * 1000);
  }

  // Paid promotions (is_featured) rank first — psych: badge must affect visibility
  const featuredFirst = `CASE WHEN COALESCE(p.is_featured,0) = 1 AND (p.featured_until IS NULL OR p.featured_until > datetime('now')) THEN 0 ELSE 1 END`;

  let orderBy = `${featuredFirst}, CASE WHEN p.badge IS NOT NULL THEN 0 ELSE 1 END, p.created_at DESC`;
  if (sort === "cheapest") {
    orderBy = `p.price ASC, p.created_at DESC`;
  } else if (sort === "nearest" && hasCoords) {
    orderBy = `(distance IS NULL), distance ASC, p.created_at DESC`;
  } else if (engine === "fts5" && (sort === "relevance" || !sort)) {
    const ids = searchProductIdsFts(q!, 1000);
    if (ids.length) {
      orderBy =
        `${featuredFirst}, CASE p.id ${ids.map((id, i) => `WHEN ${id} THEN ${i}`).join(" ")} ELSE 9999 END, p.created_at DESC`;
    }
  }

  const finalWhere = [...where];
  if (radiusClause) finalWhere.push(radiusClause);
  const whereClause = finalWhere.length ? `WHERE ${finalWhere.join(" AND ")}` : "";

  const sqlParams: unknown[] = [
    ...selectDistanceValues,
    ...whereValues,
    ...radiusValues,
  ];

  const limitPlusOne = limit + 1;

  const sql = `
    SELECT
      p.id, p.name, p.price, p.status, p.badge, p.image_url,
      p.created_at, p.updated_at, p.store_id,
      s.lat, s.lng, p.category, p.views, p.city, p.province,
      p.description, p.moderation_status, p.rejection_reason,
      p.clicks, p.saves, p.is_featured, p.featured_until,
      s.name AS store_name,
      s.city AS store_city,
      s.province AS store_province,
      s.image_url AS store_image_url,
      s.has_business_license,
      4.5 AS rating,
      ${distanceExpr} AS distance
    FROM products p
    LEFT JOIN stores s ON s.id = p.store_id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ?
  `;

  sqlParams.push(limitPlusOne);

  const rows = db.prepare(sql).all(...sqlParams) as ProductRow[];

  let total: number | null = null;
  try {
    const countValues: unknown[] = [...whereValues, ...radiusValues];
    const countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN stores s ON s.id = p.store_id
      ${whereClause}
    `;
    const c = db.prepare(countSql).get(...countValues) as { total: number } | undefined;
    total = c?.total ?? null;
  } catch {
    total = null;
  }

  return { rows, total, engine };
}
