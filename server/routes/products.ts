import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import logger from "../logger.js";
import { iranCities } from "../../src/data/iranCities.js";

const router = express.Router();

// ==========================================
// 0. Map شهر -> استان
// ==========================================
const cityProvinceMap: Record<string, string> = {};
iranCities.forEach((city) => {
  cityProvinceMap[city.name] = city.province;
});

// ==========================================
// 1. موتور جستجوی پیشرفته با Pagination
// ==========================================
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

    // پارامترهای صفحه‌بندی
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Query پایه برای شمارش و دریافت محصولات
    let baseConditions = "p.moderation_status = 'approved'";
    const params: any[] = [];
    const countParams: any[] = [];

    // فیلتر دسته‌بندی
    if (category) {
      baseConditions += " AND p.category = ?";
      params.push(category);
      countParams.push(category);
    }

    // جستجوی متنی (Full-text search simulation)
    if (q) {
      baseConditions += " AND (p.name LIKE ? OR p.description LIKE ? OR s.name LIKE ?)";
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    // فیلتر قیمت
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

    // فیلتر جغرافیایی
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
    // scope === "all" -> بدون فیلتر مکانی

    // ==========================================
    // Query شمارش کل
    // ==========================================
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE ${baseConditions}
    `;

    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    // اگر هیچ محصولی نیست، زودتر پاسخ می‌دهیم
    if (total === 0) {
      return res.json({
        products: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // ==========================================
    // Query دریافت محصولات
    // ==========================================
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

    // محاسبه metadata صفحه‌بندی
    const totalPages = Math.ceil(total / limitNum);
    const hasMore = pageNum < totalPages;

    // ==========================================
    // Response با metadata کامل
    // ==========================================
    res.json({
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
    res.status(500).json({ 
      error: "خطا در دریافت کالاها",
      message: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

// ==========================================
// 2. مدیریت کالاهای فروشنده
// ==========================================
router.get("/seller", requireAuth, (req: any, res) => {
  try {
    const storeInfo = db
      .prepare("SELECT id FROM stores WHERE user_id = ?")
      .get(req.user.id) as any;
    
    if (!storeInfo) return res.json([]);

    const products = db
      .prepare(`
        SELECT * FROM products 
        WHERE store_id = ? 
        ORDER BY created_at DESC
      `)
      .all(storeInfo.id);
    
    res.json(products);
  } catch (error) {
    logger.error("Seller products fetch error:", error);
    res.status(500).json({ error: "Failed to fetch seller products" });
  }
});

// تغییر وضعیت کالا
router.put("/:id/status", requireAuth, (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['موجود', 'فقط ۱ عدد', 'ناموجود', 'به زودی'].includes(status)) {
      return res.status(400).json({ error: "وضعیت نامعتبر است" });
    }

    const storeInfo = db
      .prepare("SELECT id FROM stores WHERE user_id = ?")
      .get(req.user.id) as any;
    
    if (!storeInfo) {
      return res.status(403).json({ error: "فروشگاهی یافت نشد" });
    }

    const productInfo = db
      .prepare("SELECT store_id FROM products WHERE id = ?")
      .get(id) as any;
    
    if (!productInfo || productInfo.store_id !== storeInfo.id) {
      return res.status(403).json({ error: "شما دسترسی به این کالا ندارید" });
    }

    db.prepare("UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(status, id);
    
    res.json({ success: true, status });
  } catch (error) {
    logger.error("Update product status error:", error);
    res.status(500).json({ error: "خطا در بروزرسانی وضعیت" });
  }
});

// حذف کالا
router.delete("/:id", requireAuth, (req: any, res) => {
  try {
    const { id } = req.params;
    
    const storeInfo = db
      .prepare("SELECT id FROM stores WHERE user_id = ?")
      .get(req.user.id) as any;
    
    if (!storeInfo) {
      return res.status(403).json({ error: "فروشگاهی یافت نشد" });
    }

    const productInfo = db
      .prepare("SELECT store_id, image_url FROM products WHERE id = ?")
      .get(id) as any;
    
    if (!productInfo || productInfo.store_id !== storeInfo.id) {
      return res.status(403).json({ error: "شما دسترسی به این کالا ندارید" });
    }

    // حذف از دیتابیس (Cascade delete via foreign keys)
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    
    // TODO: حذف فایل تصویر از دیسک
    // if (productInfo.image_url) {
    //   fs.unlinkSync(path.join(__dirname, '../../uploads', productInfo.image_url));
    // }

    res.json({ success: true, message: "محصول با موفقیت حذف شد" });
  } catch (error) {
    logger.error("Delete product error:", error);
    res.status(500).json({ error: "خطا در حذف کالا" });
  }
});

// ==========================================
// 3. جزئیات کالا (با افزایش view)
// ==========================================
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "شناسه نامعتبر است" });
    }

    // افزایش بازدید (async برای سرعت بیشتر)
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

    res.json(product);
  } catch (error) {
    logger.error("Product detail error:", error);
    res.status(500).json({ error: "خطا در دریافت اطلاعات کالا" });
  }
});

// ==========================================
// 4. پنل ادمین
// ==========================================
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ADMIN_PHONE = process.env.ADMIN_PHONE || "09160684552";
  const user = db
    .prepare("SELECT role, phone FROM users WHERE id = ?")
    .get(req.user.id) as any;

  if (!user || user.phone !== ADMIN_PHONE) {
    return res.status(403).json({ error: "Forbidden - فقط مدیر سایت" });
  }

  next();
};

router.get("/admin/pending", requireAuth, isAdmin, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, s.name as store_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.moderation_status = 'pending' 
      ORDER BY p.created_at DESC
    `).all();
    
    res.json(products);
  } catch (error) {
    logger.error("Get pending products error:", error);
    res.status(500).json({ error: "خطا در دریافت لیست انتظار" });
  }
});

router.post("/:id/approve", requireAuth, isAdmin, (req, res) => {
  try {
    db.prepare(`
      UPDATE products 
      SET moderation_status = 'approved', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(req.params.id);
    
    res.json({ success: true, message: "محصول تایید شد" });
  } catch (error) {
    logger.error("Approve product error:", error);
    res.status(500).json({ error: "خطا در تایید کالا" });
  }
});

router.post("/:id/reject", requireAuth, isAdmin, (req, res) => {
  try {
    const { reason } = req.body;
    
    db.prepare(`
      UPDATE products 
      SET moderation_status = 'rejected', 
          rejection_reason = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reason || "نامشخص", req.params.id);
    
    res.json({ success: true, message: "محصول رد شد" });
  } catch (error) {
    logger.error("Reject product error:", error);
    res.status(500).json({ error: "خطا در رد کالا" });
  }
});

// ==========================================
// 5. ایجاد کالای جدید
// ==========================================
const createProductSchema = z.object({
  name: z.string()
    .min(2, "نام محصول باید حداقل ۲ حرف باشد")
    .max(200, "نام محصول بیش از حد طولانی است"),
  price: z.union([z.string(), z.number()]),
  status: z.enum(["موجود", "فقط ۱ عدد", "ناموجود", "به زودی"]).optional(),
  description: z.string()
    .max(2000, "توضیحات نباید بیشتر از ۲۰۰۰ کاراکتر باشد")
    .optional()
    .nullable(),
  category: z.string().max(100).optional().nullable(),
  image: z.string().url("لینک تصویر نامعتبر است").optional().nullable().or(z.literal("")),
  badge: z.string().max(50).optional().nullable(),
});

router.post("/", requireAuth, (req: any, res) => {
  try {
    const validatedData = createProductSchema.parse(req.body);
    const { name, price, status, description, category, image, badge } = validatedData;

    // دریافت اطلاعات فروشگاه
    const storeInfo = db.prepare(`
      SELECT id, city, province 
      FROM stores 
      WHERE user_id = ?
    `).get(req.user.id) as any;

    if (!storeInfo) {
      return res.status(403).json({ 
        error: "شما هنوز فروشگاهی ثبت نکرده‌اید.",
        redirect: "/complete-profile"
      });
    }

    // پارس قیمت
    const parsedPrice = typeof price === "string" 
      ? parseInt(price.replace(/\D/g, ""), 10) 
      : price;

    if (isNaN(parsedPrice)) {
      return res.status(400).json({ error: "قیمت نامعتبر است" });
    }

    // درج محصول
    const stmt = db.prepare(`
      INSERT INTO products (
        store_id, name, price, status, badge, 
        moderation_status, image_url, description, 
        category, city, province, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      storeInfo.id,
      name,
      parsedPrice,
      status || "موجود",
      badge || null,
      image || null,
      description || null,
      category || null,
      storeInfo.city || null,
      storeInfo.province || null
    );

    logger.info(`New product created: ${result.lastInsertRowid} by user ${req.user.id}`);

    res.status(201).json({ 
      success: true, 
      productId: result.lastInsertRowid,
      message: "محصول با موفقیت ثبت شد و در انتظار تایید است"
    });

  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        error: error.errors[0].message,
        field: error.errors[0].path[0]
      });
    }
    
    logger.error("Create Product Error:", error);
    res.status(500).json({ error: "خطا در ثبت کالا" });
  }
});

// ==========================================
// 6. گزارشات و نظرات
// ==========================================
router.post("/:id/report", (req, res) => {
  try {
    const { reason, userId } = req.body;
    
    if (!reason || reason.length < 5) {
      return res.status(400).json({ error: "لطفاً دلیل گزارش را وارد کنید" });
    }

    db.prepare(`
      INSERT INTO reports (product_id, user_id, reason, created_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(req.params.id, userId || null, reason);

    res.json({ success: true, message: "گزارش شما ثبت شد" });
  } catch (error) {
    logger.error("Report error:", error);
    res.status(500).json({ error: "خطا در ثبت گزارش" });
  }
});

router.post("/:id/notify", (req, res) => {
  try {
    const { userId } = req.body;
    
    db.prepare(`
      INSERT INTO notify_requests (product_id, user_id, created_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(req.params.id, userId || null);

    res.json({ success: true, message: "با موجود شدن محصول به شما اطلاع می‌دهیم" });
  } catch (error) {
    logger.error("Notify request error:", error);
    res.status(500).json({ error: "خطا در ثبت درخواست" });
  }
});

// دریافت نظرات
router.get("/:id/reviews", (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT * FROM reviews 
      WHERE product_id = ? AND status = 'approved' 
      ORDER BY created_at DESC
    `).all(req.params.id);
    
    res.json(reviews);
  } catch (error) {
    logger.error("Get reviews error:", error);
    res.status(500).json({ error: "خطا در دریافت نظرات" });
  }
});

// ثبت نظر جدید
router.post("/:id/reviews", (req, res) => {
  const { author_name, rating, content } = req.body;
  
  try {
    if (!content || content.length < 3) {
      return res.status(400).json({ error: "متن نظر بیش از حد کوتاه است" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "امتیاز باید بین ۱ تا ۵ باشد" });
    }

    const result = db.prepare(`
      INSERT INTO reviews (
        product_id, author_name, rating, content, 
        status, created_at
      ) VALUES (?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)
    `).run(
      req.params.id,
      author_name || "کاربر ناشناس",
      rating || 5,
      content
    );

    const newReview = db.prepare(`
      SELECT * FROM reviews WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newReview);
  } catch (error) {
    logger.error("Create review error:", error);
    res.status(500).json({ error: "خطا در ثبت نظر" });
  }
});

export default router;