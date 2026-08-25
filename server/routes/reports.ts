// server/routes/reports.ts
import { Router, Response, NextFunction } from "express";
import db from "../db.js";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.js";
import logger from "../logger.js";
import { z } from "zod";

const router = Router();

// ════════════════════════════════════════
// Validation Schemas
// ════════════════════════════════════════
const createReportSchema = z.object({
  productId: z.number().positive("شناسه محصول نامعتبر است"),
  reason: z.string()
    .min(5, "دلیل گزارش باید حداقل ۵ کاراکتر باشد")
    .max(100, "دلیل گزارش نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد"),
  description: z.string()
    .max(500, "توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد")
    .optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed'], {
    errorMap: () => ({ message: 'وضعیت انتخاب شده معتبر نیست' })
  }),
  admin_note: z.string().max(500).optional()
});

// ════════════════════════════════════════
// 1. Submit Report (User)
// ════════════════════════════════════════
router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createReportSchema.parse(req.body);
    const { productId, reason, description } = validatedData;
    const userId = req.user!.id;

    // بررسی وجود محصول
    const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId) as any;
    if (!product) {
      return res.status(404).json({ error: "محصول مورد نظر یافت نشد." });
    }

    // جلوگیری از گزارش تکراری (pending)
    const existing = db.prepare(
      "SELECT id FROM reports WHERE user_id = ? AND product_id = ? AND status = 'pending'"
    ).get(userId, productId);

    if (existing) {
      return res.status(429).json({
        error: "شما قبلاً برای این محصول یک گزارش ثبت کرده‌اید که در حال بررسی است."
      });
    }

    const result = db.prepare(
      "INSERT INTO reports (user_id, product_id, reason, description, status, created_at) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)"
    ).run(userId, productId, reason, description || '');

    logger.info(`گزارش جدید: ${result.lastInsertRowid} برای محصول ${productId} توسط کاربر ${userId}`);

    return res.status(201).json({
      success: true,
      message: "گزارش شما با موفقیت ثبت شد و در صف بررسی قرار گرفت.",
      reportId: result.lastInsertRowid
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: error.errors[0].message,
        field: error.errors[0].path[0]
      });
    }
    logger.error("Submit Report Error:", error);
    return res.status(500).json({ error: "خطا در ثبت گزارش." });
  }
});

// ════════════════════════════════════════
// 2. Get My Reports (User)
// ════════════════════════════════════════
router.get("/my", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const reports = db.prepare(`
      SELECT 
        r.id, r.reason, r.description, r.status, r.created_at,
        p.id as product_id, p.name as product_name,
        s.name as store_name
      FROM reports r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);

    return res.json(reports);
  } catch (error) {
    logger.error('Get my reports error:', error);
    return res.status(500).json({ error: 'خطا در دریافت گزارش‌های شما' });
  }
});

// ════════════════════════════════════════
// 3. Admin Routes (protected, nested)
// ════════════════════════════════════════
const adminRouter = Router();

// Middleware مخصوص ادمین (سه لایه امنیتی)
adminRouter.use(requireAuth);
adminRouter.use(requireRole(['admin']));

// چک اضافی برای ادمین اصلی (شماره خاص)
adminRouter.use((req: AuthRequest, res: Response, next: NextFunction) => {
  const MASTER_ADMIN_PHONE = process.env.ADMIN_PHONE || '09160684552';
  const user = db.prepare("SELECT phone FROM users WHERE id = ?").get(req.user!.id) as any;
  if (!user || user.phone !== MASTER_ADMIN_PHONE) {
    return res.status(403).json({ error: "دسترسی غیرمجاز. این بخش فقط برای مدیریت کل سامانه در دسترس است." });
  }
  next();
});

/** Get All Reports with Filters */
adminRouter.get("/", (req: AuthRequest, res: Response) => {
  try {
    const { status = '', page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 50);
    const offset = (pageNum - 1) * limitNum;

    let where = "1=1";
    const params: any[] = [];
    if (status) {
      where += " AND r.status = ?";
      params.push(status);
    }

    const reports = db.prepare(`
      SELECT 
        r.id, r.reason, r.description, r.status, r.created_at, r.updated_at,
        u.id as reporter_id, u.phone as reporter_phone, u.name as reporter_name,
        p.id as product_id, p.name as product_name, p.price,
        p.moderation_status as product_status,
        s.id as store_id, s.name as store_name, s.phone as store_phone
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE ${where}
      ORDER BY 
        CASE r.status 
          WHEN 'pending' THEN 1 
          WHEN 'reviewing' THEN 2 
          ELSE 3 
        END, 
        r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    const countResult = db.prepare(`SELECT COUNT(*) as total FROM reports r WHERE ${where}`).get(...params) as any;
    const total = countResult?.total || 0;

    return res.json({
      reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error("Fetch Reports Error:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست گزارش‌ها." });
  }
});

/** Update Report Status */
adminRouter.put("/:id/status", (req: AuthRequest, res: Response) => {
  try {
    const reportId = req.params.id;
    const validatedData = updateStatusSchema.parse(req.body);
    const { status, admin_note } = validatedData;

    const result = db.prepare(
      "UPDATE reports SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(status, admin_note || null, reportId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "گزارشی با این شناسه یافت نشد." });
    }

    logger.info(`گزارش ${reportId} به وضعیت '${status}' تغییر یافت توسط ادمین ${req.user?.id}`);
    return res.json({ success: true, message: `وضعیت گزارش به "${status}" تغییر یافت.` });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error("Update Report Status Error:", error);
    return res.status(500).json({ error: "خطا در بروزرسانی وضعیت گزارش." });
  }
});

/** Delete Report */
adminRouter.delete("/:id", (req: AuthRequest, res: Response) => {
  try {
    const result = db.prepare("DELETE FROM reports WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "گزارش یافت نشد." });
    }
    logger.info(`گزارش ${req.params.id} توسط ادمین ${req.user?.id} حذف شد`);
    return res.json({ success: true, message: "گزارش با موفقیت حذف شد." });
  } catch (error) {
    logger.error("Delete Report Error:", error);
    return res.status(500).json({ error: "خطا در حذف گزارش." });
  }
});

/** Get Report Details */
adminRouter.get("/:id", (req: AuthRequest, res: Response) => {
  try {
    const report = db.prepare(`
      SELECT r.*,
             u.phone as reporter_phone, u.name as reporter_name,
             p.name as product_name, p.price, p.image_url,
             s.name as store_name, s.phone as store_phone
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!report) {
      return res.status(404).json({ error: "گزارش یافت نشد" });
    }
    return res.json(report);
  } catch (error) {
    logger.error('Get report details error:', error);
    return res.status(500).json({ error: 'خطا در دریافت جزئیات گزارش' });
  }
});

/** Bulk Update Reports */
adminRouter.post("/bulk-update", (req: AuthRequest, res: Response) => {
  try {
    const { reportIds, status } = req.body;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'لیست گزارش‌ها نامعتبر است' });
    }

    const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }

    const updateMany = db.transaction(() => {
      const stmt = db.prepare("UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
      for (const id of reportIds) {
        stmt.run(status, id);
      }
    });

    updateMany();

    logger.info(`بروزرسانی گروهی ${reportIds.length} گزارش به وضعیت '${status}' توسط ادمین ${req.user?.id}`);
    return res.json({ success: true, message: `${reportIds.length} گزارش بروزرسانی شد` });
  } catch (error) {
    logger.error('Bulk update error:', error);
    return res.status(500).json({ error: 'خطا در بروزرسانی گروهی' });
  }
});

// اتصال مسیرهای ادمین به مسیر /admin
router.use("/admin", adminRouter);

export default router;