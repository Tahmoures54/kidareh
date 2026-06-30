// server/routes/stores.ts
import { Router, type Response } from "express";
import { z } from "zod";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";

const router = Router();

/* =========================================================
 * Schemas
 * =======================================================*/
const storeSchema = z.object({
  name: z.string().trim().min(2, "نام فروشگاه الزامی است").max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  address: z.string().trim().min(5, "آدرس الزامی است").max(500),
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

/* =========================================================
 * Helpers
 * =======================================================*/
function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

/* =========================================================
 * 0) آمار عمومی فروشگاه‌ها (Public)
 * =======================================================*/
router.get("/stats", (_req, res: Response): void => {
  try {
    const storesRow = db
      .prepare("SELECT COUNT(*) as count FROM stores")
      .get() as { count: number } | undefined;

    const productsRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM products WHERE moderation_status = 'approved'"
      )
      .get() as { count: number } | undefined;

    const citiesRow = db
      .prepare(
        "SELECT COUNT(DISTINCT city) as count FROM stores WHERE city IS NOT NULL AND city != ''"
      )
      .get() as { count: number } | undefined;

    const verifiedRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM stores WHERE COALESCE(is_verified, 0) = 1 OR COALESCE(has_business_license, 0) = 1"
      )
      .get() as { count: number } | undefined;

    res.json({
      storesCount: Number(storesRow?.count ?? 0),
      productsCount: Number(productsRow?.count ?? 0),
      citiesCount: Number(citiesRow?.count ?? 0),
      verifiedCount: Number(verifiedRow?.count ?? 0),
    });
  } catch (err) {
    logger.error("Store Stats Error:", err);
    res.status(500).json({ error: "خطا در دریافت آمار فروشگاه‌ها" });
  }
});

/* =========================================================
 * 1) Get My Store (Seller/Admin)
 *    ✅ حتماً باید قبل از روت /:id باشد
 * =======================================================*/
router.get("/my/store", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    
    // گرفتن اطلاعات فروشگاه
    const store = db.prepare(`
      SELECT * FROM stores WHERE user_id = ?
    `).get(userId) as any;

    if (!store) {
      // استفاده از return برای جلوگیری از ادامه اجرای کد
      res.status(404).json({ error: "شما هنوز فروشگاهی ثبت نکرده‌اید", action: "complete_profile" });
      return;
    }

    // گرفتن تعداد کالاها برای دشبورد
    const countRow = db.prepare("SELECT COUNT(*) as total FROM products WHERE store_id = ?").get(store.id) as any;
    
    // فرستادن جواب به فرانت‌اند
    res.json({
      ...store,
      total_products: countRow ? Number(countRow.total) : 0,
      lat: toNumberOrNull(store.lat),
      lng: toNumberOrNull(store.lng)
    });
  } catch (error: any) {
    logger.error("Error fetching my store:", error.message);
    res.status(500).json({ error: "خطا در دریافت اطلاعات فروشگاه" });
  }
});

/* =========================================================
 * 2) Get Store Details (Public)
 * =======================================================*/
router.get("/:id(\\d+)", (req: AuthRequest, res: Response): void => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "شناسه فروشگاه نامعتبر است." });
      return;
    }

    const store = db
      .prepare(
        `
      SELECT
        s.*,
        u.name as owner_name,
        u.phone as owner_phone,
        COUNT(DISTINCT p.id) as total_products,
        AVG(r.rating) as avg_rating,
        COUNT(DISTINCT r.id) as review_count,
        COALESCE(strftime('%Y/%m', s.created_at), '') as joined
      FROM stores s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN products p
        ON s.id = p.store_id
       AND p.moderation_status = 'approved'
      LEFT JOIN reviews r
        ON p.id = r.product_id
       AND r.status = 'approved'
      WHERE s.id = ?
      GROUP BY s.id
    `
      )
      .get(id) as any;

    if (!store) {
      res.status(404).json({ error: "فروشگاه مورد نظر یافت نشد." });
      return;
    }

    const products = db
      .prepare(
        `
      SELECT
        p.id, p.name, p.price, p.status,
        p.badge, p.views, p.image_url, p.created_at
      FROM products p
      WHERE p.store_id = ?
        AND p.moderation_status = 'approved'
      ORDER BY
        CASE WHEN p.badge IS NOT NULL AND p.badge <> '' THEN 0 ELSE 1 END,
        p.created_at DESC,
        p.id DESC
      LIMIT 50
    `
      )
      .all(id) as any[];

    const response = normalizeStoreForDetail(store, products);
    res.json(response);
  } catch (err) {
    logger.error("Fetch Store Error:", err);
    res.status(500).json({ error: "خطا در دریافت اطلاعات فروشگاه." });
  }
});

/* =========================================================
 * 3) Search Stores (Public)
 * =======================================================*/
router.get("/", (req: AuthRequest, res: Response): void => {
  try {
    const parsed = searchSchema.parse(req.query);
    const { q, category, city, province, verified, page, limit } = parsed;
    const offset = (page - 1) * limit;

    let countSql = "SELECT COUNT(DISTINCT s.id) as total FROM stores s WHERE 1=1";
    const countParams: any[] = [];

    if (q) {
      countSql += " AND s.name LIKE ?";
      countParams.push(`%${q}%`);
    }
    if (category) {
      countSql += " AND s.category = ?";
      countParams.push(category);
    }
    if (city) {
      countSql += " AND s.city = ?";
      countParams.push(city);
    }
    if (province) {
      countSql += " AND s.province = ?";
      countParams.push(province);
    }
    if (verified === "true") {
      countSql += " AND (COALESCE(s.has_business_license, 0) = 1 OR COALESCE(s.is_verified, 0) = 1)";
    }

    const totalRow = db.prepare(countSql).get(...countParams) as { total: number } | undefined;
    const total = Number(totalRow?.total ?? 0);

    let sql = `
      SELECT
        s.id, s.name, s.category, s.image_url,
        s.address, s.lat, s.lng,
        s.has_business_license, s.is_verified,
        s.city, s.province, s.blue_tick_expires_at,
        COUNT(DISTINCT p.id) as product_count,
        AVG(r.rating) as avg_rating
      FROM stores s
      LEFT JOIN products p
        ON s.id = p.store_id
       AND p.moderation_status = 'approved'
      LEFT JOIN reviews r
        ON p.id = r.product_id
       AND r.status = 'approved'
      WHERE 1=1
    `;
    const params: any[] = [];

    if (q) {
      sql += " AND s.name LIKE ?";
      params.push(`%${q}%`);
    }
    if (category) {
      sql += " AND s.category = ?";
      params.push(category);
    }
    if (city) {
      sql += " AND s.city = ?";
      params.push(city);
    }
    if (province) {
      sql += " AND s.province = ?";
      params.push(province);
    }
    if (verified === "true") {
      sql += " AND (COALESCE(s.has_business_license, 0) = 1 OR COALESCE(s.is_verified, 0) = 1)";
    }

    sql += " GROUP BY s.id";
    sql += " ORDER BY COALESCE(s.is_verified,0) DESC, COALESCE(s.has_business_license,0) DESC, s.created_at DESC";
    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stores = db.prepare(sql).all(...params) as any[];

    res.json({
      stores: stores.map((s) => ({
        ...s,
        product_count: Number(s.product_count ?? 0),
        avg_rating: s.avg_rating != null ? Number(s.avg_rating).toFixed(1) : null,
        lat: toNumberOrNull(s.lat),
        lng: toNumberOrNull(s.lng),
        blue_tick_expires_at: s.blue_tick_expires_at ?? null,
      })),
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: stores.length === limit,
      },
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "پارامترهای جستجو نامعتبر است.", details: err.issues });
      return;
    }
    logger.error("Search Stores Error:", err);
    res.status(500).json({ error: "خطا در جستجوی فروشگاه‌ها." });
  }
});

/* =========================================================
 * 4) Create/Update Store (Seller/Admin)
 * =======================================================*/
router.post(
  "/",
  requireAuth,
  requireRole(["seller", "admin"]),
  (req: AuthRequest, res: Response): void => {
    try {
      const userId = req.user!.id;

      const payload = {
        ...req.body,
        lat:
          req.body?.lat === "" || req.body?.lat === null || req.body?.lat === undefined
            ? null
            : Number(req.body.lat),
        lng:
          req.body?.lng === "" || req.body?.lng === null || req.body?.lng === undefined
            ? null
            : Number(req.body.lng),
      };

      const validated = storeSchema.parse(payload);

      const {
        name,
        description = null,
        address,
        phone,
        category = null,
        image_url = null,
        lat = null,
        lng = null,
        city = null,
        province = null,
      } = validated;

      const existingStore = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(userId) as any;

      if (existingStore) {
        db.prepare(
          `
          UPDATE stores SET
            name = ?, description = ?, address = ?, phone = ?,
            category = ?, image_url = ?, lat = ?, lng = ?,
            city = ?, province = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `
        ).run(
          name,
          description,
          address,
          phone,
          category,
          image_url || null,
          lat,
          lng,
          city,
          province,
          userId
        );

        logger.info(`✅ Store updated: ${existingStore.id} by user ${userId}`);
        res.json({
          success: true,
          message: "اطلاعات فروشگاه با موفقیت بروزرسانی شد.",
          storeId: Number(existingStore.id),
        });
        return;
      }

      const result = db
        .prepare(
          `
        INSERT INTO stores (
          user_id, name, description, address, phone,
          category, image_url, lat, lng, city, province,
          has_business_license, is_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
        )
        .run(
          userId,
          name,
          description,
          address,
          phone,
          category,
          image_url || null,
          lat,
          lng,
          city,
          province
        );

      logger.info(`✨ New store created: ${result.lastInsertRowid} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: "فروشگاه شما با موفقیت ثبت شد.",
        storeId: Number(result.lastInsertRowid),
      });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        const first = err.issues?.[0];
        res.status(400).json({
          error: first?.message || "داده‌های ورودی نامعتبر است",
          field: first?.path?.[0],
          details: err.issues,
        });
        return;
      }

      logger.error("Create/Update Store Error:", err);
      res.status(500).json({ error: "خطا در ثبت یا بروزرسانی فروشگاه." });
    }
  }
);

/* =========================================================
 * 5) Delete Store (Seller/Admin)
 * =======================================================*/
router.delete("/:id(\\d+)", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const id = Number(req.params.id);
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

    logger.info(`🗑️ Store deleted: ${id} by user ${userId}`);
    res.json({ success: true, message: "فروشگاه با موفقیت حذف شد" });
  } catch (err) {
    logger.error("Delete Store Error:", err);
    res.status(500).json({ error: "خطا در حذف فروشگاه" });
  }
});

/* =========================================================
 * 6) Follow / Unfollow Store
 * =======================================================*/
router.post("/:id(\\d+)/follow", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const storeId = Number(req.params.id);
    const userId = req.user!.id;

    const store = db.prepare("SELECT id FROM stores WHERE id = ?").get(storeId) as any;
    if (!store) {
      return res.status(404).json({ error: "فروشگاه یافت نشد" });
    }

    const existing = db.prepare(
      "SELECT id FROM store_followers WHERE user_id = ? AND store_id = ?"
    ).get(userId, storeId) as any;

    if (existing) {
      db.prepare("DELETE FROM store_followers WHERE id = ?").run(existing.id);
      return res.json({ following: false, message: "دیگر دنبال نمی‌کنید" });
    } else {
      db.prepare(
        "INSERT INTO store_followers (user_id, store_id) VALUES (?, ?)"
      ).run(userId, storeId);
      return res.json({ following: true, message: "فروشگاه دنبال شد" });
    }
  } catch (error) {
    logger.error("Follow error:", error);
    return res.status(500).json({ error: "خطا در انجام عملیات" });
  }
});

/* =========================================================
 * 7) Follow Status
 * =======================================================*/
router.get("/:id(\\d+)/follow-status", requireAuth, (req: AuthRequest, res: Response) => {
  const storeId = Number(req.params.id);
  const userId = req.user!.id;

  const follow = db.prepare(
    "SELECT id FROM store_followers WHERE user_id = ? AND store_id = ?"
  ).get(userId, storeId);

  return res.json({ following: !!follow });
});

/* =========================================================
 * 8) Followers Count
 * =======================================================*/
router.get("/:id(\\d+)/followers/count", (req, res) => {
  const storeId = Number(req.params.id);
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM store_followers WHERE store_id = ?"
  ).get(storeId) as any;

  return res.json({ count: Number(row?.count ?? 0) });
});

/* =========================================================
 * 9) My Followers List
 * =======================================================*/
router.get("/my/followers", requireAuth, requireRole(["seller", "admin"]), (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const store = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(userId) as any;
    if (!store) return res.status(404).json({ error: "فروشگاهی یافت نشد" });

    const followers = db.prepare(`
      SELECT u.id, u.name, u.phone, sf.created_at as followed_at
      FROM store_followers sf
      JOIN users u ON u.id = sf.user_id
      WHERE sf.store_id = ?
      ORDER BY sf.created_at DESC
      LIMIT 50
    `).all(store.id);

    return res.json(followers);
  } catch (error) {
    logger.error("Get followers error:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست فالوورها" });
  }
});

export default router;