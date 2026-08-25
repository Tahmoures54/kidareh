// server/routes/products.ts
import { Router, type Response } from "express";
import db from "../db.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import logger from "../logger.js";
import { iranCities } from "../../src/data/processed/iranCities.js";
import multer from "multer";
import { uploadFile } from "../services/storage.js";
import {
  getCachedProductList,
  storeCachedProductList,
  getCachedProductDetail,
  invalidateProductCache,
  invalidateSearchCache,
} from "../services/products.cached.js";
import { applyProductTextSearch } from "../services/textSearch.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (allowed.has(file.mimetype)) cb(null, true);
    else cb(new Error("فقط تصاویر JPG، PNG و WebP مجاز هستند"));
  },
});

function hasValidImageSignature(file: Express.Multer.File): boolean {
  const b = file.buffer;
  if (file.mimetype === "image/jpeg") return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (file.mimetype === "image/png") return b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
  return false;
}

try {
  db.exec(`CREATE TABLE IF NOT EXISTS saved_products (
    user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id))`);
} catch (e: any) {
  logger.error("DB check error in products.ts:", e.message);
}

const cityProvinceMap: Record<string, string> = {};
iranCities.forEach((city) => { cityProvinceMap[city.name] = city.province; });

router.get("/", async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, scope = "city", city = "تهران", page = "1", limit = "20" } = req.query;
    const cached = await getCachedProductList({
      q: q as string | undefined,
      category: category as string | undefined,
      minPrice: minPrice as string | undefined,
      maxPrice: maxPrice as string | undefined,
      scope: scope as string,
      city: city as string,
      page: page as string,
      limit: limit as string,
    });
    if (cached.cache === "HIT" && cached.payload) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.payload);
    }
    res.setHeader("X-Cache", "MISS");
    const pageNum = cached.pageNum;
    const limitNum = cached.limitNum;
    const offset = cached.offset;
    const listCacheKey = cached.listCacheKey!;

    let baseConditions = "p.moderation_status = 'approved'";
    const params: any[] = [];
    const countParams: any[] = [];

    if (category) { baseConditions += " AND p.category = ?"; params.push(category); countParams.push(category); }
    if (q) {
      const r = applyProductTextSearch(String(q), baseConditions, params, countParams);
      baseConditions = r.baseConditions;
      res.setHeader("X-Search-Engine", r.engine);
    }
    if (minPrice) { const n = Number(minPrice); baseConditions += " AND p.price >= ?"; params.push(n); countParams.push(n); }
    if (maxPrice) { const n = Number(maxPrice); baseConditions += " AND p.price <= ?"; params.push(n); countParams.push(n); }
    if (scope === "city" && city) { baseConditions += " AND p.city = ?"; params.push(city); countParams.push(city); }
    else if (scope === "province" && city) {
      const province = cityProvinceMap[city as string];
      if (province) { baseConditions += " AND p.province = ?"; params.push(province); countParams.push(province); }
    }

    const { total } = db.prepare(`SELECT COUNT(*) as total FROM products p LEFT JOIN stores s ON p.store_id = s.id WHERE ${baseConditions}`).get(...countParams) as { total: number };
    if (total === 0) {
      const empty = { products: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0, hasMore: false } };
      await storeCachedProductList(listCacheKey, empty);
      return res.json(empty);
    }

    params.push(limitNum, offset);
    const products = db.prepare(`
      SELECT p.*, s.name as store_name, s.has_business_license, s.city as store_city, s.province as store_province
      FROM products p LEFT JOIN stores s ON p.store_id = s.id
      WHERE ${baseConditions}
      ORDER BY CASE WHEN p.badge IS NOT NULL THEN 0 ELSE 1 END, p.created_at DESC
      LIMIT ? OFFSET ?`).all(...params);

    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;
    const payload = {
      products,
      pagination: { page: pageNum, limit: limitNum, total, totalPages, hasMore, nextPage: hasMore ? pageNum + 1 : null, prevPage: pageNum > 1 ? pageNum - 1 : null },
    };
    await storeCachedProductList(listCacheKey, payload);
    return res.json(payload);
  } catch (error: any) {
    logger.error("Search Engine DB Error:", error);
    return res.status(500).json({ error: "خطا در دریافت کالاها", message: process.env.NODE_ENV !== "production" ? error.message : undefined });
  }
});

router.get("/seller", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const storeInfo = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) return res.json([]);
    return res.json(db.prepare("SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC").all(storeInfo.id));
  } catch (error) {
    logger.error("Seller products fetch error:", error);
    return res.status(500).json({ error: "خطا در دریافت کالاهای فروشنده" });
  }
});

router.get("/saved", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const savedItems = db.prepare(`
      SELECT p.*, s.name as store_name, sp.created_at as addedAt
      FROM saved_products sp JOIN products p ON sp.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id WHERE sp.user_id = ? ORDER BY sp.created_at DESC`).all(req.user!.id);
    return res.json(savedItems);
  } catch (error: any) {
    logger.error("Get saved products error:", error.message);
    return res.status(500).json({ error: "خطا در دریافت نشان‌ها" });
  }
});

router.post("/save", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { productId, save } = req.body;
    if (!productId) return res.status(400).json({ error: "شناسه کالا ارسال نشده است" });
    if (save) db.prepare(`INSERT OR IGNORE INTO saved_products (user_id, product_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(req.user!.id, productId);
    else db.prepare(`DELETE FROM saved_products WHERE user_id = ? AND product_id = ?`).run(req.user!.id, productId);
    return res.json({ success: true });
  } catch (error: any) {
    logger.error("Toggle saved product error:", error.message);
    return res.status(500).json({ error: "خطا در تغییر وضعیت نشان" });
  }
});

router.put("/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["موجود", "فقط ۱ عدد", "ناموجود", "به زودی"].includes(status)) return res.status(400).json({ error: "وضعیت نامعتبر است" });
    const storeInfo = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) return res.status(403).json({ error: "فروشگاهی یافت نشد" });
    const productInfo = db.prepare("SELECT store_id FROM products WHERE id = ?").get(id) as any;
    if (!productInfo || productInfo.store_id !== storeInfo.id) return res.status(403).json({ error: "شما دسترسی به این کالا ندارید" });
    db.prepare("UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    await invalidateProductCache(id);
    return res.json({ success: true, status });
  } catch (error) {
    logger.error("Update product status error:", error);
    return res.status(500).json({ error: "خطا در بروزرسانی وضعیت" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeInfo = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) return res.status(403).json({ error: "فروشگاهی یافت نشد" });
    const productInfo = db.prepare("SELECT store_id FROM products WHERE id = ?").get(id) as any;
    if (!productInfo || productInfo.store_id !== storeInfo.id) return res.status(403).json({ error: "شما دسترسی به این کالا ندارید" });
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    await invalidateProductCache(id);
    return res.json({ success: true, message: "محصول با موفقیت حذف شد" });
  } catch (error) {
    logger.error("Delete product error:", error);
    return res.status(500).json({ error: "خطا در حذف کالا" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) return res.status(400).json({ error: "شناسه نامعتبر است" });
    setImmediate(() => {
      try { db.prepare("UPDATE products SET views = views + 1 WHERE id = ?").run(id); } catch (e) { logger.error("Failed to increment views:", e); }
    });
    const product = await getCachedProductDetail(id);
    if (!product) return res.status(404).json({ error: "کالای مورد نظر یافت نشد" });
    return res.json(product);
  } catch (error) {
    logger.error("Product detail error:", error);
    return res.status(500).json({ error: "خطا در دریافت اطلاعات کالا" });
  }
});

router.get("/admin/pending", requireAuth, requireRole(["admin"]), (req: AuthRequest, res: Response) => {
  try {
    return res.json(db.prepare(`SELECT p.*, s.name as store_name FROM products p LEFT JOIN stores s ON p.store_id = s.id WHERE p.moderation_status = 'pending' ORDER BY p.created_at DESC`).all());
  } catch (error) {
    logger.error("Get pending products error:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست انتظار" });
  }
});

router.post("/:id/approve", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
  try {
    db.prepare("UPDATE products SET moderation_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    await invalidateProductCache(req.params.id);
    return res.json({ success: true, message: "محصول تایید شد" });
  } catch (error) {
    logger.error("Approve product error:", error);
    return res.status(500).json({ error: "خطا در تایید کالا" });
  }
});

router.post("/:id/reject", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    db.prepare("UPDATE products SET moderation_status = 'rejected', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reason || "نامشخص", req.params.id);
    await invalidateProductCache(req.params.id);
    return res.json({ success: true, message: "محصول رد شد" });
  } catch (error) {
    logger.error("Reject product error:", error);
    return res.status(500).json({ error: "خطا در رد کالا" });
  }
});

const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  price: z.union([z.string(), z.number()]),
  status: z.enum(["موجود", "فقط ۱ عدد", "ناموجود", "به زودی"]).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  badge: z.string().max(50).optional().nullable(),
});

router.post("/", requireAuth, upload.single("image"), async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  try {
    const validatedData = createProductSchema.parse(req.body);
    const { name, price, status, description, category, badge } = validatedData;
    const storeInfo = db.prepare("SELECT id, city, province FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) return res.status(403).json({ error: "شما هنوز فروشگاهی ثبت نکرده‌اید.", redirect: "/complete-profile" });
    const parsedPrice = typeof price === "string" ? parseInt(price.replace(/\D/g, ""), 10) : price;
    if (isNaN(parsedPrice)) return res.status(400).json({ error: "قیمت نامعتبر است" });
    let imageUrl = null;
    if (req.file) {
      if (!hasValidImageSignature(req.file)) {
        return res.status(400).json({ error: "محتوای تصویر معتبر نیست" });
      }
      try { imageUrl = await uploadFile(req.file, "products"); }
      catch (uploadError) {
        logger.error("Image upload failed:", uploadError);
        return res.status(500).json({ error: "خطا در آپلود تصویر محصول" });
      }
    }
    const result = db.prepare(`INSERT INTO products (store_id, name, price, status, badge, moderation_status, image_url, description, category, city, province, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(storeInfo.id, name, parsedPrice, status || "موجود", badge || null, imageUrl, description || null, category || null, storeInfo.city || null, storeInfo.province || null);
    logger.info(`New product created: ${result.lastInsertRowid} by user ${req.user!.id}`);
    await invalidateSearchCache();
    return res.status(201).json({ success: true, productId: result.lastInsertRowid, message: "محصول با موفقیت ثبت شد و در انتظار تایید است" });
  } catch (error: any) {
    if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0].message, field: error.errors[0].path[0] });
    logger.error("Create Product Error:", error);
    return res.status(500).json({ error: "خطا در ثبت کالا" });
  }
});

router.post("/:id/report", requireAuth, (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    if (typeof reason !== "string" || reason.trim().length < 5 || reason.length > 1000) return res.status(400).json({ error: "لطفاً دلیل گزارش را وارد کنید" });
    const product = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id);
    if (!product) return res.status(404).json({ error: "کالا یافت نشد" });
    db.prepare("INSERT INTO reports (product_id, user_id, reason, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)").run(req.params.id, req.user!.id, reason.trim());
    return res.json({ success: true, message: "گزارش شما ثبت شد" });
  } catch (error) {
    logger.error("Report error:", error);
    return res.status(500).json({ error: "خطا در ثبت گزارش" });
  }
});

router.post("/:id/notify", (req, res) => {
  try {
    db.prepare("INSERT INTO notify_requests (product_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(req.params.id, req.body.userId || null);
    return res.json({ success: true, message: "با موجود شدن محصول به شما اطلاع می‌دهیم" });
  } catch (error) {
    logger.error("Notify request error:", error);
    return res.status(500).json({ error: "خطا در ثبت درخواست" });
  }
});

router.get("/:id/reviews", (req, res) => {
  try {
    return res.json(db.prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC").all(req.params.id));
  } catch (error) {
    logger.error("Get reviews error:", error);
    return res.status(500).json({ error: "خطا در دریافت نظرات" });
  }
});

router.post("/:id/reviews", (req, res) => {
  const { author_name, rating, content } = req.body;
  try {
    if (!content || content.length < 3) return res.status(400).json({ error: "متن نظر بیش از حد کوتاه است" });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: "امتیاز باید بین ۱ تا ۵ باشد" });
    const result = db.prepare("INSERT INTO reviews (product_id, author_name, rating, content, status, created_at) VALUES (?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)").run(req.params.id, author_name || "کاربر ناشناس", rating || 5, content);
    return res.status(201).json(db.prepare("SELECT * FROM reviews WHERE id = ?").get(result.lastInsertRowid));
  } catch (error) {
    logger.error("Create review error:", error);
    return res.status(500).json({ error: "خطا در ثبت نظر" });
  }
});

export default router;
