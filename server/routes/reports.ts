import { Router, Response, NextFunction } from "express";
import db from "../db.js";
import { requireAuth, requireRole, requireAdmin, AuthRequest } from "../middleware/auth.js";
import logger from "../logger.js";
import { z } from "zod";

const router = Router();

// ==========================================
// Validation Schemas
// ==========================================
const createReportSchema = z.object({
  productId: z.number().positive('ÔäÇÓå ãÍÕæá äÇãÚÊÈÑ ÇÓÊ'),
  reason: z.string()
    .min(5, 'Ïáíá ÒÇÑÔ ÈÇíÏ ÍÏÇŞá ? ˜ÇÑÇ˜ÊÑ ÈÇÔÏ')
    .max(100, 'Ïáíá ÒÇÑÔ ÈíÔ ÇÒ ÍÏ ØæáÇäí ÇÓÊ'),
  description: z.string()
    .max(500, 'ÊæÖíÍÇÊ ÈíÔ ÇÒ ÍÏ ØæáÇäí ÇÓÊ')
    .optional()
});

// ==========================================
// 1. Submit Report (User)
// ==========================================
router.post("/", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const validatedData = createReportSchema.parse(req.body);
    const { productId, reason, description } = validatedData;
    const userId = req.user?.id;

    // ÈÑÑÓí æÌæÏ ˜ÇáÇ
    const product = db.prepare(
      "SELECT id, name FROM products WHERE id = ?"
    ).get(productId) as any;

    if (!product) {
      res.status(404).json({ error: "˜ÇáÇí ãæÑÏ äÙÑ íÇİÊ äÔÏ." });
      return;
    }

    // ÌáæíÑí ÇÒ ÒÇÑÔ Ê˜ÑÇÑí
    const existingReport = db.prepare(`
      SELECT id FROM reports 
      WHERE user_id = ? AND product_id = ? AND status = 'pending'
    `).get(userId, productId);

    if (existingReport) {
      res.status(429).json({ 
        error: "ÔãÇ ŞÈáÇğ í˜ ÒÇÑÔ ÏÑ ÍÇá ÈÑÑÓí ÈÑÇí Çíä ˜ÇáÇ ËÈÊ ˜ÑÏåÇíÏ." 
      });
      return;
    }

    // ÇíÌÇÏ ÒÇÑÔ
    const result = db.prepare(`
      INSERT INTO reports (
        user_id, product_id, reason, description, 
        status, created_at
      ) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).run(userId, productId, reason, description || '');

    logger.info(`?? Report created: ${result.lastInsertRowid} for product ${productId} by user ${userId}`);

    res.status(201).json({ 
      success: true, 
      message: "ÒÇÑÔ ÔãÇ ÈÇ ãæİŞíÊ ËÈÊ ÔÏ æ ÊæÓØ ˜ÇÑÔäÇÓÇä ÈÑÑÓí ÎæÇåÏ ÔÏ.",
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
    res.status(500).json({ error: "ÎØÇ ÏÑ ËÈÊ ÒÇÑÔ ÊÎáİ." });
  }
});

// ==========================================
// 2. Get My Reports (User)
// ==========================================
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

    res.json(reports);

  } catch (error) {
    logger.error('Get my reports error:', error);
    res.status(500).json({ error: 'ÎØÇ ÏÑ ÏÑíÇİÊ ÒÇÑÔÇÊ' });
  }
});

// ==========================================
// 3. Master Admin Middleware
// ==========================================
const isMasterAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      logger.warn('Unauthorized reports access attempt');
      res.status(401).json({ error: "ÇÍÑÇÒ åæíÊ äÇãæİŞ." });
      return;
    }

    const user = db.prepare(
      "SELECT phone FROM users WHERE id = ?"
    ).get(userId) as any;
    
    const MASTER_ADMIN_PHONE = process.env.ADMIN_PHONE || '09160684552';
    
    if (!user || user.phone !== MASTER_ADMIN_PHONE) {
      logger.warn(`Unauthorized reports access by user ${userId}`);
      res.status(403).json({ 
        error: "ÏÓÊÑÓí ÛíÑãÌÇÒ. İŞØ ãÏíÑ ˜á Çã˜Çä ãÔÇåÏå ÒÇÑÔåÇ ÑÇ ÏÇÑÏ." 
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error("Admin Check Error:", error);
    res.status(500).json({ error: "ÎØÇí ÓÑæÑ ÏÑ ÈÑÑÓí ÏÓÊÑÓí." });
  }
};

// ==========================================
// 4. Admin Routes
// ==========================================
const adminRouter = Router();

// ÇÚãÇá 3 áÇíå ÇãäíÊí
adminRouter.use(requireAuth);
adminRouter.use(requireRole(['admin']));
adminRouter.use(isMasterAdmin);

/** Get All Reports with Filters */
adminRouter.get("/", (req: AuthRequest, res: Response) => {
  try {
    const { 
      status = '', 
      page = '1', 
      limit = '50' 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        r.id, r.reason, r.description, r.status, 
        r.created_at, r.updated_at,
        u.id as reporter_id,
        u.phone as reporter_phone, 
        u.name as reporter_name,
        p.id as product_id, 
        p.name as product_name, 
        p.price,
        p.moderation_status as product_status,
        s.id as store_id, 
        s.name as store_name, 
        s.phone as store_phone
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by status
    if (status) {
      query += " AND r.status = ?";
      params.push(status);
    }

    query += `
      ORDER BY 
        CASE r.status 
          WHEN 'pending' THEN 1 
          WHEN 'reviewing' THEN 2 
          ELSE 3 
        END, 
        r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limitNum, offset);

    const reports = db.prepare(query).all(...params);

    // Count total
    let countQuery = "SELECT COUNT(*) as total FROM reports WHERE 1=1";
    const countParams: any[] = [];
    
    if (status) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }

    const { total } = db.prepare(countQuery).get(...countParams) as any;

    res.json({
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
    res.status(500).json({ error: "ÎØÇ ÏÑ ÏÑíÇİÊ áíÓÊ ÒÇÑÔÇÊ." });
  }
});

/** Update Report Status */
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'resolved', 'dismissed'], {
    errorMap: () => ({ message: 'æÖÚíÊ ÇÑÓÇá ÔÏå äÇãÚÊÈÑ ÇÓÊ' })
  }),
  admin_note: z.string().max(500).optional()
});

adminRouter.put("/:id/status", (req: AuthRequest, res: Response): void => {
  try {
    const reportId = req.params.id;
    const validatedData = updateStatusSchema.parse(req.body);
    const { status, admin_note } = validatedData;

    const result = db.prepare(`
      UPDATE reports 
      SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(status, admin_note || null, reportId);

    if (result.changes === 0) {
      res.status(404).json({ error: "ÒÇÑÔí ÈÇ Çíä ÔäÇÓå íÇİÊ äÔÏ." });
      return;
    }

    logger.info(`?? Report ${reportId} status changed to '${status}' by admin ${req.user?.id}`);

    res.json({ 
      success: true, 
      message: `æÖÚíÊ ÒÇÑÔ Èå '${status}' ÊÛííÑ íÇİÊ.` 
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error("Update Report Status Error:", error);
    res.status(500).json({ error: "ÎØÇ ÏÑ ÊÛííÑ æÖÚíÊ ÒÇÑÔ." });
  }
});

/** Delete Report */
adminRouter.delete("/:id", (req: AuthRequest, res: Response): void => {
  try {
    const reportId = req.params.id;
    
    const result = db.prepare(
      "DELETE FROM reports WHERE id = ?"
    ).run(reportId);

    if (result.changes === 0) {
      res.status(404).json({ error: "ÒÇÑÔ íÇİÊ äÔÏ." });
      return;
    }

    logger.info(`???  Report ${reportId} deleted by admin ${req.user?.id}`);

    res.json({ 
      success: true, 
      message: "ÒÇÑÔ ÈÇ ãæİŞíÊ ÇÒ ÓíÓÊã ÍĞİ ÔÏ." 
    });

  } catch (error) {
    logger.error("Delete Report Error:", error);
    res.status(500).json({ error: "ÎØÇ ÏÑ ÍĞİ ÒÇÑÔ." });
  }
});

/** Get Report Details */
adminRouter.get("/:id", (req: AuthRequest, res: Response): void => {
  try {
    const reportId = req.params.id;

    const report = db.prepare(`
      SELECT 
        r.*,
        u.phone as reporter_phone,
        u.name as reporter_name,
        p.name as product_name,
        p.price,
        p.image_url,
        s.name as store_name,
        s.phone as store_phone
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE r.id = ?
    `).get(reportId);

    if (!report) {
      res.status(404).json({ error: "ÒÇÑÔ íÇİÊ äÔÏ" });
      return;
    }

    res.json(report);

  } catch (error) {
    logger.error('Get report details error:', error);
    res.status(500).json({ error: 'ÎØÇ ÏÑ ÏÑíÇİÊ ÌÒÆíÇÊ ÒÇÑÔ' });
  }
});

/** Bulk Update Reports */
adminRouter.post("/bulk-update", (req: AuthRequest, res: Response): void => {
  try {
    const { reportIds, status } = req.body;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      res.status(400).json({ error: 'áíÓÊ ÒÇÑÔÇÊ äÇãÚÊÈÑ ÇÓÊ' });
      return;
    }

    const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'æÖÚíÊ äÇãÚÊÈÑ ÇÓÊ' });
      return;
    }

    const transaction = db.transaction(() => {
      const stmt = db.prepare(
        "UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      );
      
      reportIds.forEach(id => {
        stmt.run(status, id);
      });
    });

    transaction();

    logger.info(`?? Bulk update: ${reportIds.length} reports changed to '${status}' by admin ${req.user?.id}`);

    res.json({ 
      success: true, 
      message: `${reportIds.length} ÒÇÑÔ ÈÑæÒÑÓÇäí ÔÏ` 
    });

  } catch (error) {
    logger.error('Bulk update error:', error);
    res.status(500).json({ error: 'ÎØÇ ÏÑ ÈÑæÒÑÓÇäí ÏÓÊåÌãÚí' });
  }
});

// ãÊÕá ˜ÑÏä ÑæÊ ãÏíÑíÊ Èå ÑæÊ ÇÕáí
router.use("/admin", adminRouter);

export default router;