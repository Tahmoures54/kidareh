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
    joined: store.joined ?? "", // e.g. 2026/06
    image: store.image_url ?? null,
    verified: Boolean(store.is_verified || store.has_business_license),
    description: store.description ?? "",
    city: store.city ?? "",
    province: store.province ?? "",
    latitude: toNumberOrNull(store.lat),
    longitude: toNumberOrNull(store.lng),
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
 * 1) Get My Store (Seller/Admin)  <-- MUST BE BEFORE /:id
 * =======================================================*/
router.get(
  "/my/store",
  requireAuth,
  requireRole(["seller", "admin"]),
  (req: AuthRequest, res: Response): void => {
    try {
      const userId = req.user!.id;

      const store = db
        .prepare(
          `
        SELECT
          s.*,
          u.phone as owner_phone,
          u.name as owner_name,
          COUNT(DISTINCT p.id) as total_products
        FROM stores s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN products p ON s.id = p.store_id
        WHERE s.user_id = ?
        GROUP BY s.id
      `
        )
        .get(userId) as any;

      if (!store) {
        res.status(404).json({
          error: "شما هنوز فروشگاهی ثبت نکرده‌اید.",
          action: "complete_profile",
        });
        return;
      }

      res.json({
        ...store,
        total_products: Number(store.total_products ?? 0),
        lat: toNumberOrNull(store.lat),
        lng: toNumberOrNull(store.lng),
      });
    } catch (err) {
      logger.error("My Store Error:", err);
      res.status(500).json({ error: "خطا در دریافت اطلاعات فروشگاه شما." });
    }
  }
);

/* =========================================================
 * 2) Get Store Details (Public) - for StoreDetail.tsx
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
       AND (p.moderation_status = 'approved' OR p.is_approved = 1)
       AND COALESCE(p.is_public, 1) = 1
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
        AND (p.moderation_status = 'approved' OR p.is_approved = 1)
        AND COALESCE(p.is_public, 1) = 1
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

    let sql = `
      SELECT
        s.id, s.name, s.category, s.image_url,
        s.address, s.lat, s.lng,
        s.has_business_license, s.is_verified,
        s.city, s.province,
        COUNT(DISTINCT p.id) as product_count,
        AVG(r.rating) as avg_rating
      FROM stores s
      LEFT JOIN products p
        ON s.id = p.store_id
       AND (p.moderation_status = 'approved' OR p.is_approved = 1)
       AND COALESCE(p.is_public, 1) = 1
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
      })),
      pagination: {
        page,
        limit,
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

      // تبدیل lat/lng که ممکنه از فرانت string بیاد
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

export default router;