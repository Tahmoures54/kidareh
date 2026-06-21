/**
 * Products Search Service (SQLite / better-sqlite3)
 * هماهنگ با products.ts و db.ts
 * @location /server/services/products.search.service.ts
 */

import db from "../db.js";

// ---- Types ----
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
  sort?: "newest" | "cheapest" | "nearest";
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
}

/**
 * Schema reference (from db.ts):
 *
 * products: id, store_id, name, price, status, badge, moderation_status,
 *           rejection_reason, image_url, description, category, views,
 *           clicks, saves, city, province, is_featured, featured_until,
 *           created_at, updated_at
 *
 * stores:   id, user_id, name, category, address, image_url, lat, lng,
 *           city, province, has_business_license, phone, description,
 *           is_verified, total_products, total_views, created_at, updated_at
 *
 * ⚠️ مختصات فقط روی stores است (lat/lng)، نه products
 * ⚠️ ستون rating در stores وجود ندارد — فعلاً مقدار پیش‌فرض ۴.۵
 */
export async function searchProductsService(
  params: SearchParams
): Promise<SearchResult> {
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

  // فقط محصولات تاییدشده
  where.push(`p.moderation_status = 'approved'`);

  // جستجوی متنی
  if (q) {
    const like = `%${q}%`;
    whereValues.push(like, like, like);
    where.push(
      `(p.name LIKE ? COLLATE NOCASE OR p.description LIKE ? COLLATE NOCASE OR s.name LIKE ? COLLATE NOCASE)`
    );
  }

  // فیلتر دسته‌بندی
  if (category) {
    whereValues.push(category);
    where.push(`p.category = ?`);
  }

  // فیلتر جغرافیایی (از ستون‌های خود products که ایندکس دارند)
  if (scope === "city" && city) {
    whereValues.push(city);
    where.push(`p.city = ?`);
  }

  if (scope === "province" && province) {
    whereValues.push(province);
    where.push(`p.province = ?`);
  }

  // فقط کالاهای موجود
  if (onlyAvailable) {
    where.push(`p.status IN ('موجود', 'فقط ۱ عدد')`);
  }

  // فیلتر قیمت
  if (minPrice != null) {
    whereValues.push(minPrice);
    where.push(`p.price >= ?`);
  }

  if (maxPrice != null) {
    whereValues.push(maxPrice);
    where.push(`p.price <= ?`);
  }

  // cursor pagination
  if (cursor?.id != null) {
    whereValues.push(cursor.id);
    where.push(`p.id < ?`);
  }

  // ---- فاصله (Haversine) بر اساس مختصات فروشگاه ----
  const hasCoords = lat != null && lng != null;

  // 6371000 = شعاع زمین (متر)، 0.017453292519943295 = PI/180
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

  // فیلتر شعاع
  let radiusClause = "";
  const radiusValues: number[] = [];
  if (radiusKm != null && hasCoords) {
    radiusClause = `${distanceExpr} <= ?`;
    radiusValues.push(
      lat as number,
      lng as number,
      lat as number,
      radiusKm * 1000
    );
  }

  // ---- ORDER BY ----
  let orderBy = `CASE WHEN p.badge IS NOT NULL THEN 0 ELSE 1 END, p.created_at DESC`;
  if (sort === "cheapest") {
    orderBy = `p.price ASC, p.created_at DESC`;
  } else if (sort === "nearest" && hasCoords) {
    orderBy = `(distance IS NULL), distance ASC, p.created_at DESC`;
  }

  // ---- ساخت WHERE نهایی ----
  const finalWhere = [...where];
  if (radiusClause) finalWhere.push(radiusClause);
  const whereClause = finalWhere.length
    ? `WHERE ${finalWhere.join(" AND ")}`
    : "";

  // ---- پارامترها به ترتیب ----
  const sqlParams: unknown[] = [
    ...selectDistanceValues,
    ...whereValues,
    ...radiusValues,
  ];

  const limitPlusOne = limit + 1;

  // ⚠️ هماهنگ با products.ts: LEFT JOIN + همه ستون‌های محصول
  const sql = `
    SELECT
      p.id,
      p.name,
      p.price,
      p.status,
      p.badge,
      p.image_url,
      p.created_at,
      p.updated_at,
      p.store_id,
      s.lat,
      s.lng,
      p.category,
      p.views,
      p.city,
      p.province,
      p.description,
      p.moderation_status,
      p.rejection_reason,
      p.clicks,
      p.saves,
      p.is_featured,
      p.featured_until,
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

  // better-sqlite3: سینکرون
  const rows = db.prepare(sql).all(...sqlParams) as ProductRow[];

  // ---- total (اختیاری) ----
  let total: number | null = null;
  try {
    const countValues: unknown[] = [...whereValues, ...radiusValues];
    const countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN stores s ON s.id = p.store_id
      ${whereClause}
    `;
    const c = db.prepare(countSql).get(...countValues) as
      | { total: number }
      | undefined;
    total = c?.total ?? null;
  } catch {
    total = null;
  }

  return { rows, total };
}