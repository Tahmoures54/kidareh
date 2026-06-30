// server/routes/products.ts
import { Router, type Response } from "express";
import db from "../db.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import logger from "../logger.js";
import { iranCities } from "../../data/processed/iranCities.js";
import multer from "multer";
import { uploadFile } from "../services/storage.js"; // 🟢 اضافه شده: سرویس آپلود ابری

const router = Router();

// 🟢 اضافه شده: تنظیمات Multer برای نگهداری فایل در حافظه موقت (Memory) قبل از ارسال به S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // محدودیت حجم فایل: 5 مگابایت
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("فقط فایل تصویری مجاز است"));
    }
  }
});

// ════════════════════════════════════════
// 0. بررسی دیتابیس و Map شهر -> استان
// ════════════════════════════════════════
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_products (
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id)
    )
  `);
} catch (e: any) {
  logger.error("DB check error in products.ts:", e.message);
}

const cityProvinceMap: Record<string, string> = {};
iranCities.forEach((city) => {
  cityProvinceMap[city.name] = city.province;
});

// ════════════════════════════════════════
// 1. موتور جستجوی پیشرفته با Pagination
// ════════════════════════════════════════
router.get("/", (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      scope = "city",
      city = "تهران",
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseConditions = "p.moderation_status = 'approved'";
    const params: any[] = [];
    const countParams: any[] = [];

    if (category) {
      baseConditions += " AND p.category = ?";
      params.push(category);
      countParams.push(category);
    }

    if (q) {
      baseConditions += " AND (p.name LIKE ? OR p.description LIKE ? OR s.name LIKE ?)";
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (minPrice) {
      baseConditions += " AND p.price >= ?";
      const minPriceNum = Number(minPrice);
      params.push(minPriceNum);
      countParams.push(minPriceNum);
    }

    if (maxPrice) {
      baseConditions += " AND p.price <= ?";
      const maxPriceNum = Number(maxPrice);
      params.push(maxPriceNum);
      countParams.push(maxPriceNum);
    }

    if (scope === "city" && city) {
      baseConditions += " AND p.city = ?";
      params.push(city);
      countParams.push(city);
    } else if (scope === "province" && city) {
      const province = cityProvinceMap[city as string];
      if (province) {
        baseConditions += " AND p.province = ?";
        params.push(province);
        countParams.push(province);
      }
    }

    const countQuery = `SELECT COUNT(*) as total FROM products p LEFT JOIN stores s ON p.store_id = s.id WHERE ${baseConditions}`;
    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    if (total === 0) {
      return res.json({
        products: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0, hasMore: false },
      });
    }

    const productsQuery = `
      SELECT 
        p.*,
        s.name as store_name,
        s.has_business_license,
        s.city as store_city,
        s.province as store_province
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE ${baseConditions}
      ORDER BY 
        CASE WHEN p.badge IS NOT NULL THEN 0 ELSE 1 END,
        p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limitNum, offset);
    const products = db.prepare(productsQuery).all(...params);

    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    return res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore,
        nextPage: hasMore ? pageNum + 1 : null,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
      },
    });
  } catch (error: any) {
    logger.error("Search Engine DB Error:", error);
    return res.status(500).json({
      error: "خطا در دریافت کالاها",
      message: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
});

// ════════════════════════════════════════
// 2. مدیریت کالاهای فروشنده
// ════════════════════════════════════════
router.get("/seller", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const storeInfo = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) return res.json([]);

    const products = db.prepare("SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC").all(storeInfo.id);
    return res.json(products);
  } catch (error) {
    logger.error("Seller products fetch error:", error);
    return res.status(500).json({ error: "خطا در دریافت کالاهای فروشنده" });
  }
});

// ════════════════════════════════════════
// 3. مدیریت نشان‌ها (Saved Products)
// ════════════════════════════════════════

router.get("/saved", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const savedItems = db.prepare(`
      SELECT 
        p.*,
        s.name as store_name,
        sp.created_at as addedAt
      FROM saved_products sp
      JOIN products p ON sp.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
    `).all(userId);
    
    return res.json(savedItems);
  } catch (error: any) {
    logger.error("Get saved products error:", error.message);
    return res.status(500).json({ error: "خطا در دریافت نشان‌ها" });
  }
});

router.post("/save", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, save } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "شناسه کالا ارسال نشده است" });
    }

    if (save) {
      db.prepare(`
        INSERT OR IGNORE INTO saved_products (user_id, product_id, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(userId, productId);
    } else {
      db.prepare(`
        DELETE FROM saved_products 
        WHERE user_id = ? AND product_id = ?
      `).run(userId, productId);
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error("Toggle saved product error:", error.message);
    return res.status(500).json({ error: "خطا در تغییر وضعیت نشان" });
  }
});

// ════════════════════════════════════════
// 4. عملیات روی یک کالای مشخص
// ════════════════════════════════════════

router.put("/:id/status", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['موجود', 'فقط ۱ عدد', 'ناموجود', 'به زودی'].includes(status)) {
      return res.status(400).json({ error: "وضعیت نامعتبر است" });
    }

    const storeInfo = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) {
      return res.status(403).json({ error: "فروشگاهی یافت نشد" });
    }

    const productInfo = db.prepare("SELECT store_id FROM products WHERE id = ?").get(id) as any;
    if (!productInfo || productInfo.store_id !== storeInfo.id) {
      return res.status(403).json({ error: "شما دسترسی به این کالا ندارید" });
    }

    db.prepare("UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    return res.json({ success: true, status });
  } catch (error) {
    logger.error("Update product status error:", error);
    return res.status(500).json({ error: "خطا در بروزرسانی وضعیت" });
  }
});

router.delete("/:id", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const storeInfo = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) {
      return res.status(403).json({ error: "فروشگاهی یافت نشد" });
    }

    const productInfo = db.prepare("SELECT store_id FROM products WHERE id = ?").get(id) as any;
    if (!productInfo || productInfo.store_id !== storeInfo.id) {
      return res.status(403).json({ error: "شما دسترسی به این کالا ندارید" });
    }

    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return res.json({ success: true, message: "محصول با موفقیت حذف شد" });
  } catch (error) {
    logger.error("Delete product error:", error);
    return res.status(500).json({ error: "خطا در حذف کالا" });
  }
});

router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "شناسه نامعتبر است" });
    }

    setImmediate(() => {
      try {
        db.prepare("UPDATE products SET views = views + 1 WHERE id = ?").run(id);
      } catch (e) {
        logger.error("Failed to increment views:", e);
      }
    });

    const product = db.prepare(`
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
    `).get(id);

    if (!product) {
      return res.status(404).json({ error: "کالای مورد نظر یافت نشد" });
    }

    return res.json(product);
  } catch (error) {
    logger.error("Product detail error:", error);
    return res.status(500).json({ error: "خطا در دریافت اطلاعات کالا" });
  }
});

// ════════════════════════════════════════
// 5. پنل ادمین
// ════════════════════════════════════════
router.get("/admin/pending", requireAuth, requireRole(["admin"]), (req: AuthRequest, res: Response) => {
  try {
    const products = db.prepare(`
      SELECT p.*, s.name as store_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.moderation_status = 'pending'
      ORDER BY p.created_at DESC
    `).all();
    return res.json(products);
  } catch (error) {
    logger.error("Get pending products error:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست انتظار" });
  }
});

router.post("/:id/approve", requireAuth, requireRole(["admin"]), (req: AuthRequest, res: Response) => {
  try {
    db.prepare("UPDATE products SET moderation_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    return res.json({ success: true, message: "محصول تایید شد" });
  } catch (error) {
    logger.error("Approve product error:", error);
    return res.status(500).json({ error: "خطا در تایید کالا" });
  }
});

router.post("/:id/reject", requireAuth, requireRole(["admin"]), (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    db.prepare(
      "UPDATE products SET moderation_status = 'rejected', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(reason || "نامشخص", req.params.id);
    return res.json({ success: true, message: "محصول رد شد" });
  } catch (error) {
    logger.error("Reject product error:", error);
    return res.status(500).json({ error: "خطا در رد کالا" });
  }
});

// ════════════════════════════════════════
// 6. ایجاد کالای جدید
// ════════════════════════════════════════
const createProductSchema = z.object({
  name: z.string().min(2, "نام محصول باید حداقل ۲ حرف باشد").max(200, "نام محصول بیش از حد طولانی است"),
  price: z.union([z.string(), z.number()]),
  status: z.enum(["موجود", "فقط ۱ عدد", "ناموجود", "به زودی"]).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  // 🟢 حذف شد: دیگر لینک عکس را به صورت متنی نمی‌گیریم، بلکه فایل می‌گیریم
  badge: z.string().max(50).optional().nullable(),
});

// 🟢 اصلاح شد: اضافه شدن middleware آپلود (upload.single) و تبدیل به async
router.post("/", requireAuth, upload.single("image"), async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  try {
    // اعتبارسنجی فیلدهای متنی
    const validatedData = createProductSchema.parse(req.body);
    const { name, price, status, description, category, badge } = validatedData;

    const storeInfo = db.prepare("SELECT id, city, province FROM stores WHERE user_id = ?").get(req.user!.id) as any;
    if (!storeInfo) {
      return res.status(403).json({ error: "شما هنوز فروشگاهی ثبت نکرده‌اید.", redirect: "/complete-profile" });
    }

    const parsedPrice = typeof price === "string" ? parseInt(price.replace(/\D/g, ""), 10) : price;
    if (isNaN(parsedPrice)) {
      return res.status(400).json({ error: "قیمت نامعتبر است" });
    }

    // 🟢 اضافه شد: آپلود عکس در فضای ابری (یا لوکال) و دریافت آدرس
    let imageUrl = null;
    if (req.file) {
      try {
        imageUrl = await uploadFile(req.file, "products");
      } catch (uploadError) {
        logger.error("Image upload failed:", uploadError);
        return res.status(500).json({ error: "خطا در آپلود تصویر محصول" });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO products (store_id, name, price, status, badge, moderation_status, image_url, description, category, city, province, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      storeInfo.id,
      name,
      parsedPrice,
      status || "موجود",
      badge || null,
      imageUrl, // 🟢 ذخیره آدرس URL برگشتی از فضای ابری
      description || null,
      category || null,
      storeInfo.city || null,
      storeInfo.province || null
    );

    logger.info(`New product created: ${result.lastInsertRowid} by user ${req.user!.id}`);
    return res.status(201).json({ success: true, productId: result.lastInsertRowid, message: "محصول با موفقیت ثبت شد و در انتظار تایید است" });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: error.errors[0].message, field: error.errors[0].path[0] });
    }
    logger.error("Create Product Error:", error);
    return res.status(500).json({ error: "خطا در ثبت کالا" });
  }
});

// ════════════════════════════════════════
// 7. گزارشات و نظرات
// ════════════════════════════════════════
router.post("/:id/report", (req, res) => {
  try {
    const { reason, userId } = req.body;
    if (!reason || reason.length < 5) {
      return res.status(400).json({ error: "لطفاً دلیل گزارش را وارد کنید" });
    }

    db.prepare("INSERT INTO reports (product_id, user_id, reason, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)").run(req.params.id, userId || null, reason);
    return res.json({ success: true, message: "گزارش شما ثبت شد" });
  } catch (error) {
    logger.error("Report error:", error);
    return res.status(500).json({ error: "خطا در ثبت گزارش" });
  }
});

router.post("/:id/notify", (req, res) => {
  try {
    const { userId } = req.body;
    db.prepare("INSERT INTO notify_requests (product_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(req.params.id, userId || null);
    return res.json({ success: true, message: "با موجود شدن محصول به شما اطلاع می‌دهیم" });
  } catch (error) {
    logger.error("Notify request error:", error);
    return res.status(500).json({ error: "خطا در ثبت درخواست" });
  }
});

router.get("/:id/reviews", (req, res) => {
  try {
    const reviews = db.prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC").all(req.params.id);
    return res.json(reviews);
  } catch (error) {
    logger.error("Get reviews error:", error);
    return res.status(500).json({ error: "خطا در دریافت نظرات" });
  }
});

router.post("/:id/reviews", (req, res) => {
  const { author_name, rating, content } = req.body;
  try {
    if (!content || content.length < 3) {
      return res.status(400).json({ error: "متن نظر بیش از حد کوتاه است" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "امتیاز باید بین ۱ تا ۵ باشد" });
    }

    const result = db.prepare(
      "INSERT INTO reviews (product_id, author_name, rating, content, status, created_at) VALUES (?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)"
    ).run(req.params.id, author_name || "کاربر ناشناس", rating || 5, content);

    const newReview = db.prepare("SELECT * FROM reviews WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json(newReview);
  } catch (error) {
    logger.error("Create review error:", error);
    return res.status(500).json({ error: "خطا در ثبت نظر" });
  }
});

export default router;