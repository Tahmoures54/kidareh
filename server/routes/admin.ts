import { Router, Response, NextFunction } from "express";
import db, { getStats, createBackup } from "../db.js";
import { requireAuth, requireRole, requireAdmin, AuthRequest } from "../middleware/auth.js";
import logger from "../logger.js";
import { z } from "zod";

const router = Router();

// ==========================================
// 1. Master Admin Middleware (امنیت چندلایه)
// ==========================================
const isMasterAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      logger.warn('Unauthorized admin access attempt');
      res.status(401).json({ error: "احراز هویت ناموفق بود." });
      return;
    }

    const user = db.prepare(
      "SELECT role, phone FROM users WHERE id = ?"
    ).get(userId) as any;
    
    const MASTER_ADMIN_PHONE = process.env.ADMIN_PHONE || '09160684552';
    
    if (!user || user.phone !== MASTER_ADMIN_PHONE) {
      logger.warn(`Unauthorized admin access by user ${userId} (${user?.phone})`);
      res.status(403).json({ 
        error: "دسترسی غیرمجاز. این بخش فقط برای مدیریت کل سامانه در دسترس است." 
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error("Master Admin Check Error:", error);
    res.status(500).json({ error: "خطای سرور در بررسی سطح دسترسی مدیریت." });
  }
};

// اعمال 3 لایه امنیتی
router.use(requireAuth);
router.use(requireRole(['admin']));
router.use(isMasterAdmin);

// ==========================================
// 2. Dashboard Statistics
// ==========================================
router.get("/dashboard-stats", (req: AuthRequest, res: Response) => {
  try {
    const stats = getStats();
    
    // آمار تکمیلی
    const pendingProducts = (db.prepare(
      "SELECT COUNT(*) as count FROM products WHERE moderation_status = 'pending'"
    ).get() as any).count;
    
    const pendingReports = (db.prepare(
      "SELECT COUNT(*) as count FROM reports WHERE status = 'pending'"
    ).get() as any).count;
    
    // آمار درآمد (اگر جدول payments دارید)
    let totalRevenue = 0;
    try {
      const revResult = db.prepare(
        "SELECT SUM(amount) as total FROM transactions WHERE type = 'credit' AND status = 'completed'"
      ).get() as any;
      totalRevenue = revResult?.total || 0;
    } catch (e) {
      logger.debug('No transactions table yet');
    }

    // فعالیت‌های اخیر
    const recentActivity = db.prepare(`
      SELECT 
        'user' as type,
        id,
        name,
        phone,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
      
      UNION ALL
      
      SELECT 
        'product' as type,
        p.id,
        p.name,
        s.name as phone,
        p.created_at
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `).all();

    res.json({
      ...stats,
      pendingProducts,
      pendingReports,
      totalRevenue,
      recentActivity
    });

  } catch (error) {
    logger.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: "خطا در دریافت آمار داشبورد." });
  }
});

// ==========================================
// 3. User Management
// ==========================================

/** Get All Users with Pagination */
router.get("/users", (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '50',
      search = '',
      role = '',
      banned = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        u.id, u.phone, u.name, u.role, 
        u.created_at, u.last_login_at,
        u.is_profile_complete, u.is_banned, u.ban_reason,
        u.wallet_balance, u.total_earned,
        s.id as store_id, 
        s.name as store_name, 
        s.has_business_license,
        COUNT(DISTINCT p.id) as product_count
      FROM users u
      LEFT JOIN stores s ON u.id = s.user_id
      LEFT JOIN products p ON s.id = p.store_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filters
    if (search) {
      query += " AND (u.name LIKE ? OR u.phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      query += " AND u.role = ?";
      params.push(role);
    }

    if (banned === 'true') {
      query += " AND u.is_banned = 1";
    } else if (banned === 'false') {
      query += " AND u.is_banned = 0";
    }

    query += " GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
    params.push(limitNum, offset);

    const users = db.prepare(query).all(...params);

    // Total count
    let countQuery = "SELECT COUNT(*) as total FROM users WHERE 1=1";
    const countParams: any[] = [];
    
    if (search) {
      countQuery += " AND (name LIKE ? OR phone LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (role) {
      countQuery += " AND role = ?";
      countParams.push(role);
    }

    if (banned === 'true') {
      countQuery += " AND is_banned = 1";
    } else if (banned === 'false') {
      countQuery += " AND is_banned = 0";
    }

    const { total } = db.prepare(countQuery).get(...countParams) as any;

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: offset + users.length < total
      }
    });

  } catch (error) {
    logger.error("Fetch Users Error:", error);
    res.status(500).json({ error: "خطا در دریافت لیست کاربران." });
  }
});

/** Verify Store */
router.post("/users/:id/verify", (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.params.id;
    const { verify } = req.body;
    
    if (typeof verify !== 'boolean') {
      res.status(400).json({ error: "مقدار verify باید boolean باشد." });
      return;
    }

    const store = db.prepare(
      "SELECT id FROM stores WHERE user_id = ?"
    ).get(userId) as any;
    
    if (!store) {
      res.status(404).json({ 
        error: "این کاربر هنوز فروشگاهی ثبت نکرده است." 
      });
      return;
    }

    db.prepare(`
      UPDATE stores 
      SET has_business_license = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).run(verify ? 1 : 0, userId);
    
    logger.info(`${verify ? '✅' : '❌'} Store ${store.id} verification changed by admin ${req.user?.id}`);

    res.json({ 
      success: true, 
      message: verify ? "فروشگاه با موفقیت تایید شد." : "تاییدیه فروشگاه لغو شد." 
    });

  } catch (error) {
    logger.error("Verify Store Error:", error);
    res.status(500).json({ error: "خطا در بروزرسانی وضعیت فروشگاه." });
  }
});

/** Ban User */
router.post("/users/:id/ban", (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    
    // نمی‌توانید خودتان را مسدود کنید
    if (userId === String(req.user?.id)) {
      res.status(400).json({ 
        error: "شما نمی‌توانید حساب کاربری خودتان را مسدود کنید." 
      });
      return;
    }

    const user = db.prepare("SELECT phone FROM users WHERE id = ?").get(userId) as any;
    
    if (!user) {
      res.status(404).json({ error: "کاربر یافت نشد" });
      return;
    }

    db.prepare(`
      UPDATE users 
      SET is_banned = 1, ban_reason = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reason || 'نامشخص', userId);

    logger.info(`🚫 User ${userId} (${user.phone}) banned by admin ${req.user?.id}`);

    res.json({ 
      success: true, 
      message: "کاربر با موفقیت مسدود شد." 
    });

  } catch (error) {
    logger.error("Ban User Error:", error);
    res.status(500).json({ error: "خطا در مسدودسازی کاربر." });
  }
});

/** Unban User */
router.post("/users/:id/unban", (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.params.id;

    db.prepare(`
      UPDATE users 
      SET is_banned = 0, ban_reason = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(userId);

    logger.info(`✅ User ${userId} unbanned by admin ${req.user?.id}`);

    res.json({ 
      success: true, 
      message: "کاربر رفع مسدودیت شد." 
    });

  } catch (error) {
    logger.error("Unban User Error:", error);
    res.status(500).json({ error: "خطا در رفع مسدودیت کاربر." });
  }
});

/** Change User Role */
router.post("/users/:id/role", (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const validRoles = ['buyer', 'seller', 'marketer', 'support', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: "نقش نامعتبر است" });
      return;
    }

    if (userId === String(req.user?.id) && role !== 'admin') {
      res.status(400).json({ 
        error: "شما نمی‌توانید نقش خود را از admin تغییر دهید" 
      });
      return;
    }

    db.prepare(`
      UPDATE users 
      SET role = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(role, userId);

    logger.info(`🔄 User ${userId} role changed to ${role} by admin ${req.user?.id}`);

    res.json({ 
      success: true, 
      message: `نقش کاربر به ${role} تغییر یافت` 
    });

  } catch (error) {
    logger.error("Change Role Error:", error);
    res.status(500).json({ error: "خطا در تغییر نقش کاربر" });
  }
});

// ==========================================
// 4. Product Moderation
// ==========================================

/** Get Pending Products */
router.get("/products/pending", (req: AuthRequest, res: Response) => {
  try {
    const products = db.prepare(`
      SELECT 
        p.*,
        s.name as store_name,
        s.city as store_city,
        u.phone as seller_phone,
        u.name as seller_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE p.moderation_status = 'pending'
      ORDER BY p.created_at ASC
    `).all();

    res.json(products);

  } catch (error) {
    logger.error('Get pending products error:', error);
    res.status(500).json({ error: 'خطا در دریافت محصولات در انتظار' });
  }
});

/** Approve Product */
router.post("/products/:id/approve", (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    const product = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
    
    if (!product) {
      res.status(404).json({ error: "محصول یافت نشد" });
      return;
    }

    db.prepare(`
      UPDATE products 
      SET moderation_status = 'approved', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    logger.info(`✅ Product ${id} approved by admin ${req.user?.id}`);

    res.json({ success: true, message: 'محصول تایید شد' });

  } catch (error) {
    logger.error('Approve product error:', error);
    res.status(500).json({ error: 'خطا در تایید محصول' });
  }
});

/** Reject Product */
router.post("/products/:id/reject", (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    db.prepare(`
      UPDATE products 
      SET moderation_status = 'rejected',
          rejection_reason = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reason || 'نامشخص', id);

    logger.info(`❌ Product ${id} rejected by admin ${req.user?.id}`);

    res.json({ success: true, message: 'محصول رد شد' });

  } catch (error) {
    logger.error('Reject product error:', error);
    res.status(500).json({ error: 'خطا در رد محصول' });
  }
});

/** Delete Product */
router.delete("/products/:id", (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    db.prepare("DELETE FROM products WHERE id = ?").run(id);

    logger.info(`🗑️  Product ${id} deleted by admin ${req.user?.id}`);

    res.json({ success: true, message: 'محصول حذف شد' });

  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ error: 'خطا در حذف محصول' });
  }
});

// ==========================================
// 5. System Settings
// ==========================================

/** Get Settings */
router.get("/settings", (req: AuthRequest, res: Response) => {
  try {
    const settings = db.prepare(
      "SELECT key, value, description FROM settings"
    ).all() as Array<{key: string, value: string, description: string}>;
    
    const settingsObj = settings.reduce((acc: Record<string, any>, curr) => {
      acc[curr.key] = {
        value: curr.value,
        description: curr.description
      };
      return acc;
    }, {});
    
    res.json(settingsObj);

  } catch (error) {
    logger.error("Fetch Settings Error:", error);
    res.status(500).json({ error: "خطا در دریافت تنظیمات سیستم." });
  }
});

/** Update Settings */
const settingsSchema = z.object({
  key: z.string().optional(),
  value: z.string().optional(),
  settings: z.record(z.string()).optional()
});

router.put("/settings", (req: AuthRequest, res: Response): void => {
  try {
    const validatedData = settingsSchema.parse(req.body);
    const { key, value, settings } = validatedData;

    // آپدیت دسته‌جمعی
    if (settings && typeof settings === 'object') {
      const updateMany = db.transaction((configs: Record<string, any>) => {
        const stmt = db.prepare(
          "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
        );
        for (const [k, v] of Object.entries(configs)) {
          stmt.run(k, String(v));
        }
      });
      
      updateMany(settings);
      
      logger.info(`⚙️  Settings updated by admin ${req.user?.id}`);
      
      res.json({ success: true, message: "تنظیمات با موفقیت بروزرسانی شد." });
      return;
    }

    // آپدیت تکی
    if (!key || value === undefined) {
      res.status(400).json({ 
        error: "کلید و مقدار برای بروزرسانی الزامی است." 
      });
      return;
    }

    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
    ).run(key, String(value));

    logger.info(`⚙️  Setting '${key}' updated by admin ${req.user?.id}`);

    res.json({ success: true, message: "تنظیم با موفقیت بروزرسانی شد." });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error("Update Settings Error:", error);
    res.status(500).json({ error: "خطا در ذخیره تنظیمات." });
  }
});

// ==========================================
// 6. Backup & Maintenance
// ==========================================

/** Create Database Backup */
router.post("/backup", (req: AuthRequest, res: Response) => {
  try {
    const backupPath = createBackup();
    
    logger.info(`💾 Database backup created by admin ${req.user?.id}`);
    
    res.json({ 
      success: true, 
      message: 'بکاپ با موفقیت ایجاد شد',
      path: backupPath 
    });

  } catch (error) {
    logger.error('Backup error:', error);
    res.status(500).json({ error: 'خطا در ایجاد بکاپ' });
  }
});

/** Get System Info */
router.get("/system-info", (req: AuthRequest, res: Response) => {
  try {
    const info = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      env: process.env.NODE_ENV || 'development'
    };

    res.json(info);

  } catch (error) {
    logger.error('System info error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات سیستم' });
  }
});

export default router;