// server/routes/stores.ts
import { Router, type Response } from "express";
import { z } from "zod";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import {
  cacheGet,
  cacheSet,
  hashParams,
  CacheKeys,
  CacheTTL,
  invalidateStoreCache,
} from "../services/cache.js";
import { applyStoreTextSearch } from "../services/textSearch.js";
import { applyStoreCategoryFilter } from "../utils/categoryFilter.js";

const router = Router();

const storeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  address: z.string().trim().min(5).max(500),
  phone: z.string().trim().regex(/^09\d{9}$/, "شماره تماس معتبر نیست"),
  category: z.string().trim().max(100).optional().nullable(),
  image_url: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  province: z.string().trim().max(100).optional().nullable(),
});

const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  verified: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numericRouteId(params: Record<string, string | undefined>): number {
  return Number(params.id ?? params["id(\\d+)"]);
}

function normalizeStoreForDetail(store: any, products: any[]) {
  return {
    id: Number(store.id),
    name: store.name ?? "",
    category: store.category ?? "عمومی",
    address: store.address ?? "",
    phone: store.phone ?? "",
    rating: Number(store.avg_rating ?? store.rating ?? 0),
    reviews: Number(store.review_count ?? store.reviews_count ?? 0),
    joined: store.joined ?? "",
    image: store.image_url ?? null,
    verified: Boolean(store.is_verified || store.has_business_license),
    description: store.description ?? "",
    city: store.city ?? "",
    province: store.province ?? "",
    latitude: toNumberOrNull(store.lat),
    longitude: toNumberOrNull(store.lng),
    blue_tick_expires_at: store.blue_tick_expires_at ?? null,
    owner_id: Number(store.user_id ?? 0),
    follower_count: Number(store.follower_count ?? store.total_followers ?? 0),
    products: products.map((p) => ({
      id: Number(p.id),
      name: p.name,
      price: typeof p.price === "number" ? p.price : Number(p.price),
      status: p.status ?? "ناموجود",
      views: Number(p.views ?? 0),
      badge: p.badge ?? null,
      image_url: p.image_url ?? null,
    })),
  };
}

router.get("/stats", async (_req, res: Response): Promise<void> => {
  try {
    const statsKey = CacheKeys.stats();
    const cached = await cacheGet<any>(statsKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }
    res.setHeader("X-Cache", "MISS");
    const storesRow = db.prepare("SELECT COUNT(*) as count FROM stores").get() as { count: number } | undefined;
    const productsRow = db.prepare("SELECT COUNT(*) as count FROM products WHERE moderation_status = 'approved'").get() as { count: number } | undefined;
    const citiesRow = db.prepare("SELECT COUNT(DISTINCT city) as count FROM stores WHERE city IS NOT NULL AND city != ''").get() as { count: number } | undefined;
    const verifiedRow = db.prepare("SELECT COUNT(*) as count FROM stores WHERE COALESCE(is_verified, 0) = 1 OR COALESCE(has_business_license, 0) = 1").get() as { count: number } | undefined;
    const payload = {
      storesCount: Number(storesRow?.count ?? 0),
      productsCount: Number(productsRow?.count ?? 0),
      citiesCount: Number(citiesRow?.count ?? 0),
      verifiedCount: Number(verifiedRow?.count ?? 0),
    };
    await cacheSet(statsKey, payload, CacheTTL.STATS);
    res.json(payload);
  } catch (err) {
    logger.error("Store Stats Error:", err);
    res.status(500).json({ error: "خطا در دریافت آمار فروشگاه‌ها" });
  }
});

router.get("/my/store", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const store = db.prepare(`SELECT * FROM stores WHERE user_id = ?`).get(req.user!.id) as any;
    if (!store) {
      res.status(404).json({ error: "شما هنوز فروشگاهی ثبت نکرده‌اید", action: "complete_profile" });
      return;
    }
    const countRow = db.prepare("SELECT COUNT(*) as total FROM products WHERE store_id = ?").get(store.id) as any;
    const followersRow = db.prepare("SELECT COUNT(*) as count FROM store_followers WHERE store_id = ?").get(store.id) as any;
    const viewsRow = db.prepare("SELECT COALESCE(SUM(views), 0) as total FROM products WHERE store_id = ?").get(store.id) as any;
    res.json({
      ...store,
      total_products: countRow ? Number(countRow.total) : 0,
      follower_count: Number(followersRow?.count ?? store.total_followers ?? 0),
      total_views: Number(viewsRow?.total ?? store.total_views ?? 0),
      lat: toNumberOrNull(store.lat),
      lng: toNumberOrNull(store.lng),
    });
  } catch (error: any) {
    logger.error("Error fetching my store:", error.message);
    res.status(500).json({ error: "خطا در دریافت اطلاعات فروشگاه" });
  }
});

router.get("/my/stats", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const store = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!store) {
      res.status(404).json({ error: "فروشگاهی یافت نشد" });
      return;
    }
    const productsRow = db.prepare(`
      SELECT COUNT(*) as product_count,
        COALESCE(SUM(views), 0) as total_views,
        SUM(CASE WHEN moderation_status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM products WHERE store_id = ?`).get(store.id) as any;
    const followersRow = db.prepare("SELECT COUNT(*) as count FROM store_followers WHERE store_id = ?").get(store.id) as any;
    res.json({
      store_id: Number(store.id),
      follower_count: Number(followersRow?.count ?? 0),
      product_count: Number(productsRow?.product_count ?? 0),
      total_views: Number(productsRow?.total_views ?? 0),
      pending_count: Number(productsRow?.pending_count ?? 0),
    });
  } catch (error: any) {
    logger.error("Error fetching my store stats:", error.message);
    res.status(500).json({ error: "خطا در دریافت آمار فروشگاه" });
  }
});

router.put("/my/store", requireAuth, requireRole(["seller", "admin"]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = db.prepare("SELECT * FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!store) {
      res.status(404).json({ error: "شما هنوز فروشگاهی ثبت نکرده‌اید", action: "complete_profile" });
      return;
    }
    const patchSchema = z.object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(1000).optional().nullable(),
      address: z.string().trim().min(5).max(500).optional(),
      phone: z.string().trim().regex(/^09\d{9}$/, "شماره تماس معتبر نیست").optional(),
      category: z.string().trim().max(100).optional(),
      city: z.string().trim().max(100).optional().nullable(),
      province: z.string().trim().max(100).optional().nullable(),
    });
    const patch = patchSchema.parse(req.body || {});
    db.prepare(`UPDATE stores SET
      name = ?, description = ?, address = ?, phone = ?, category = ?, city = ?, province = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).run(
      patch.name ?? store.name,
      patch.description !== undefined ? patch.description : store.description,
      patch.address ?? store.address,
      patch.phone ?? store.phone,
      patch.category ?? store.category,
      patch.city !== undefined ? patch.city : store.city,
      patch.province !== undefined ? patch.province : store.province,
      store.id
    );
    await invalidateStoreCache(store.id);
    const updated = db.prepare("SELECT * FROM stores WHERE id = ?").get(store.id);
    res.json({ success: true, store: updated });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const first = err.issues?.[0];
      res.status(400).json({ error: first?.message || "داده‌های ورودی نامعتبر است", field: first?.path?.[0] });
      return;
    }
    logger.error("Update my store error:", err);
    res.status(500).json({ error: "خطا در بروزرسانی فروشگاه" });
  }
});

router.get("/following", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const stores = db.prepare(`
      SELECT s.id, s.name, s.category, s.image_url, s.city, s.province, s.address,
        s.total_followers, sf.created_at as followed_at,
        COUNT(DISTINCT p.id) as product_count
      FROM store_followers sf
      JOIN stores s ON s.id = sf.store_id
      LEFT JOIN products p ON p.store_id = s.id AND p.moderation_status = 'approved'
      WHERE sf.user_id = ?
      GROUP BY s.id
      ORDER BY sf.created_at DESC`).all(req.user!.id) as any[];
    res.json({
      stores: stores.map((s) => ({
        ...s,
        product_count: Number(s.product_count ?? 0),
        follower_count: Number(s.total_followers ?? 0),
      })),
    });
  } catch (error: any) {
    logger.error("Following stores fetch error:", error.message);
    res.status(500).json({ error: "خطا در دریافت فروشگاه‌های دنبال‌شده" });
  }
});

router.get("/:id(\\d+)", (req: AuthRequest, res: Response): void => {
  try {
    const id = numericRouteId(req.params as Record<string, string | undefined>);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "شناسه فروشگاه نامعتبر است." });
      return;
    }
    const store = db.prepare(`
      SELECT s.*, u.name as owner_name, u.phone as owner_phone,
        COUNT(DISTINCT p.id) as total_products, AVG(r.rating) as avg_rating, COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT sf.id) as follower_count,
        COALESCE(strftime('%Y/%m', s.created_at), '') as joined
      FROM stores s JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON s.id = p.store_id AND p.moderation_status = 'approved'
      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
      LEFT JOIN store_followers sf ON sf.store_id = s.id
      WHERE s.id = ? GROUP BY s.id`).get(id) as any;
    if (!store) {
      res.status(404).json({ error: "فروشگاه مورد نظر یافت نشد." });
      return;
    }
    const products = db.prepare(`
      SELECT p.id, p.name, p.price, p.status, p.badge, p.views, p.image_url, p.created_at
      FROM products p WHERE p.store_id = ? AND p.moderation_status = 'approved'
      ORDER BY CASE WHEN p.badge IS NOT NULL AND p.badge <> '' THEN 0 ELSE 1 END, p.created_at DESC, p.id DESC LIMIT 50`).all(id) as any[];
    res.json(normalizeStoreForDetail(store, products));
  } catch (err) {
    logger.error("Fetch Store Error:", err);
    res.status(500).json({ error: "خطا در دریافت اطلاعات فروشگاه." });
  }
});

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = searchSchema.parse(req.query);
    const { q, category, city, province, verified, page, limit } = parsed;
    const offset = (page - 1) * limit;
    const listKey = CacheKeys.storesList(hashParams({ q: q ?? "", category: category ?? "", city: city ?? "", province: province ?? "", verified: verified ?? "", page, limit }));
    const cachedList = await cacheGet<any>(listKey);
    if (cachedList) {
      res.setHeader("X-Cache", "HIT");
      res.json(cachedList);
      return;
    }
    res.setHeader("X-Cache", "MISS");

    const text = q ? applyStoreTextSearch(q) : { sqlFragment: "", params: [] as unknown[], engine: "like" as const };
    if (q) res.setHeader("X-Search-Engine", text.engine);

    let countSql = "SELECT COUNT(DISTINCT s.id) as total FROM stores s WHERE 1=1" + text.sqlFragment;
    const countParams: any[] = [...text.params];
    const categoryFilter = applyStoreCategoryFilter(category);
    if (categoryFilter.sql) {
      countSql += ` AND ${categoryFilter.sql}`;
      countParams.push(...categoryFilter.params);
    }
    if (city) { countSql += " AND s.city = ?"; countParams.push(city); }
    if (province) { countSql += " AND s.province = ?"; countParams.push(province); }
    if (verified === "true") countSql += " AND (COALESCE(s.has_business_license, 0) = 1 OR COALESCE(s.is_verified, 0) = 1)";
    const total = Number((db.prepare(countSql).get(...countParams) as any)?.total ?? 0);

    let sql = `
      SELECT s.id, s.name, s.category, s.image_url, s.address, s.lat, s.lng,
        s.has_business_license, s.is_verified, s.city, s.province, s.blue_tick_expires_at,
        COUNT(DISTINCT p.id) as product_count, AVG(r.rating) as avg_rating
      FROM stores s
      LEFT JOIN products p ON s.id = p.store_id AND p.moderation_status = 'approved'
      LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
      WHERE 1=1` + text.sqlFragment;
    const params: any[] = [...text.params];
    const categoryFilterSql = applyStoreCategoryFilter(category);
    if (categoryFilterSql.sql) {
      sql += ` AND ${categoryFilterSql.sql}`;
      params.push(...categoryFilterSql.params);
    }
    if (city) { sql += " AND s.city = ?"; params.push(city); }
    if (province) { sql += " AND s.province = ?"; params.push(province); }
    if (verified === "true") sql += " AND (COALESCE(s.has_business_license, 0) = 1 OR COALESCE(s.is_verified, 0) = 1)";
    sql += " GROUP BY s.id ORDER BY COALESCE(s.is_verified,0) DESC, COALESCE(s.has_business_license,0) DESC, s.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const stores = db.prepare(sql).all(...params) as any[];

    const payload = {
      stores: stores.map((s) => ({
        ...s,
        product_count: Number(s.product_count ?? 0),
        avg_rating: s.avg_rating != null ? Number(s.avg_rating).toFixed(1) : null,
        lat: toNumberOrNull(s.lat),
        lng: toNumberOrNull(s.lng),
        blue_tick_expires_at: s.blue_tick_expires_at ?? null,
      })),
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: stores.length === limit },
    };
    await cacheSet(listKey, payload, CacheTTL.STORES);
    res.json(payload);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "پارامترهای جستجو نامعتبر است.", details: err.issues });
      return;
    }
    logger.error("Search Stores Error:", err);
    res.status(500).json({ error: "خطا در جستجوی فروشگاه‌ها." });
  }
});

router.post("/", requireAuth, requireRole(["seller", "admin"]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const payload = {
      ...req.body,
      lat: req.body?.lat === "" || req.body?.lat == null ? null : Number(req.body.lat),
      lng: req.body?.lng === "" || req.body?.lng == null ? null : Number(req.body.lng),
    };
    const validated = storeSchema.parse(payload);
    const { name, description = null, address, phone, category = null, image_url = null, lat = null, lng = null, city = null, province = null } = validated;
    const existingStore = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(userId) as any;
    if (existingStore) {
      db.prepare(`UPDATE stores SET name = ?, description = ?, address = ?, phone = ?, category = ?, image_url = ?, lat = ?, lng = ?, city = ?, province = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`)
        .run(name, description, address, phone, category, image_url || null, lat, lng, city, province, userId);
      await invalidateStoreCache(existingStore.id);
      res.json({ success: true, message: "اطلاعات فروشگاه با موفقیت بروزرسانی شد.", storeId: Number(existingStore.id) });
      return;
    }
    const result = db.prepare(`INSERT INTO stores (user_id, name, description, address, phone, category, image_url, lat, lng, city, province, has_business_license, is_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .run(userId, name, description, address, phone, category, image_url || null, lat, lng, city, province);
    await invalidateStoreCache(result.lastInsertRowid);
    res.status(201).json({ success: true, message: "فروشگاه شما با موفقیت ثبت شد.", storeId: Number(result.lastInsertRowid) });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const first = err.issues?.[0];
      res.status(400).json({ error: first?.message || "داده‌های ورودی نامعتبر است", field: first?.path?.[0], details: err.issues });
      return;
    }
    logger.error("Create/Update Store Error:", err);
    res.status(500).json({ error: "خطا در ثبت یا بروزرسانی فروشگاه." });
  }
});

router.delete("/:id(\\d+)", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = numericRouteId(req.params as Record<string, string | undefined>);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "شناسه فروشگاه نامعتبر است" });
      return;
    }
    const userId = req.user!.id;
    const isAdmin = req.user!.role === "admin";
    const store = db.prepare("SELECT user_id FROM stores WHERE id = ?").get(id) as any;
    if (!store) {
      res.status(404).json({ error: "فروشگاه یافت نشد" });
      return;
    }
    if (Number(store.user_id) !== Number(userId) && !isAdmin) {
      res.status(403).json({ error: "شما مجاز به حذف این فروشگاه نیستید" });
      return;
    }
    db.prepare("DELETE FROM stores WHERE id = ?").run(id);
    await invalidateStoreCache(id);
    res.json({ success: true, message: "فروشگاه با موفقیت حذف شد" });
  } catch (err) {
    logger.error("Delete Store Error:", err);
    res.status(500).json({ error: "خطا در حذف فروشگاه" });
  }
});

router.post("/:id(\\d+)/follow", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const storeId = numericRouteId(req.params as Record<string, string | undefined>);
    const userId = req.user!.id;
    const store = db.prepare("SELECT id, user_id FROM stores WHERE id = ?").get(storeId) as any;
    if (!store) return res.status(404).json({ error: "فروشگاه یافت نشد" });
    if (Number(store.user_id) === Number(userId)) {
      return res.status(400).json({ error: "فروشگاه خودتان را نمی‌توانید دنبال کنید", following: false });
    }
    const existing = db.prepare("SELECT id FROM store_followers WHERE user_id = ? AND store_id = ?").get(userId, storeId) as any;
    if (existing) {
      db.prepare("DELETE FROM store_followers WHERE id = ?").run(existing.id);
      const count = db.prepare("SELECT COUNT(*) as count FROM store_followers WHERE store_id = ?").get(storeId) as any;
      return res.json({ following: false, follower_count: Number(count?.count ?? 0), message: "دیگر دنبال نمی‌کنید" });
    }
    db.prepare("INSERT INTO store_followers (user_id, store_id) VALUES (?, ?)").run(userId, storeId);
    const count = db.prepare("SELECT COUNT(*) as count FROM store_followers WHERE store_id = ?").get(storeId) as any;
    return res.json({ following: true, follower_count: Number(count?.count ?? 0), message: "فروشگاه دنبال شد" });
  } catch (error) {
    logger.error("Follow error:", error);
    return res.status(500).json({ error: "خطا در انجام عملیات" });
  }
});

router.get("/:id(\\d+)/follow-status", requireAuth, (req: AuthRequest, res: Response) => {
  const storeId = numericRouteId(req.params as Record<string, string | undefined>);
  const follow = db.prepare("SELECT id FROM store_followers WHERE user_id = ? AND store_id = ?").get(req.user!.id, storeId);
  return res.json({ following: !!follow });
});

router.get("/:id(\\d+)/followers/count", (req, res) => {
  const storeId = numericRouteId(req.params as Record<string, string | undefined>);
  const row = db.prepare("SELECT COUNT(*) as count FROM store_followers WHERE store_id = ?").get(storeId) as any;
  return res.json({ count: Number(row?.count ?? 0) });
});

router.get("/my/followers", requireAuth, requireRole(["seller", "admin"]), (req: AuthRequest, res: Response) => {
  try {
    const store = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!store) return res.status(404).json({ error: "فروشگاهی یافت نشد" });
    const followers = db.prepare(`SELECT u.id, u.name, u.phone, sf.created_at as followed_at FROM store_followers sf JOIN users u ON u.id = sf.user_id WHERE sf.store_id = ? ORDER BY sf.created_at DESC LIMIT 50`).all(store.id);
    return res.json(followers);
  } catch (error) {
    logger.error("Get followers error:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست فالوورها" });
  }
});

export default router;
