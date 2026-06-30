/**
 * Support Tickets API
 * @version 2.1.0 — Enterprise Grade (Secure Uploads, Anti-Spam, Unified Responses)
 */

import { Router, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto"; // 🔵 اضافه‌شده برای امنیت رمزنگاری فایل‌ها
import { z } from "zod";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";

const router = Router();

/* =========================================================
 * 0. Safe DB Patching (Idempotent)
 * =======================================================*/
const safeAddColumn = (sql: string, label: string) => {
  try {
    db.exec(sql);
    logger.info(`✅ Support migration: ${label}`);
  } catch (err: any) {
    if (!err.message?.includes("duplicate column name")) {
      logger.error(`❌ Support migration (${label}):`, err.message);
    }
  }
};

safeAddColumn(`ALTER TABLE support_tickets ADD COLUMN attachments TEXT`, "support_tickets.attachments");
safeAddColumn(`ALTER TABLE support_tickets ADD COLUMN answer TEXT`, "support_tickets.answer");

/* =========================================================
 * 1. Upload Config (Cryptographically Secure)
 * =======================================================*/
const uploadDir = path.join(process.cwd(), "public", "uploads", "support");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = /^\.\w{1,10}$/.test(ext) ? ext : ""; 
    // 🔵 استفاده از crypto برای جلوگیری از حدس زدن نام فایل‌ها توسط هکرها
    const uniqueId = crypto.randomBytes(16).toString("hex");
    cb(null, `support_${uniqueId}${safeExt}`);
  },
});

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/zip",
  "text/plain",
]);

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error("فرمت فایل مجاز نیست. فقط تصاویر، PDF و ZIP پشتیبانی می‌شوند."));
  },
});

/* =========================================================
 * 2. Strict Zod Schemas
 * =======================================================*/
const createTicketSchema = z.object({
  department: z.string().trim().min(1, "انتخاب دپارتمان الزامی است").max(100),
  subject: z.string().trim().min(3, "موضوع باید حداقل ۳ کاراکتر باشد").max(150),
  message: z.string().trim().min(10, "پیام باید حداقل ۱۰ کاراکتر باشد").max(2000),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
  attachments: z.array(z.string().url()).max(3, "حداکثر ۳ فایل مجاز است").optional().default([]),
});

const updateStatusSchema = z.object({
  status: z
    .enum(["open", "in_progress", "pending", "closed"])
    .transform((s) => (s === "pending" ? "in_progress" : s)),
  answer: z.string().trim().max(5000).optional().nullable(),
  priority: z.enum(["low", "normal", "high"]).optional().nullable(),
});

/* =========================================================
 * 3. Anti-Spam Guard (Rate Limiter)
 * =======================================================*/
// 🔵 جلوگیری از ثبت تیکت رگباری توسط یک کاربر
const ticketSpamGuard = new Map<number, number>();
const SPAM_COOLDOWN_MS = 60 * 1000; // 1 Minute

// پاکسازی حافظه گارد هر ساعت
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of ticketSpamGuard.entries()) {
    if (now - timestamp > SPAM_COOLDOWN_MS) ticketSpamGuard.delete(userId);
  }
}, 60 * 60 * 1000);

/* =========================================================
 * 4. Helper: Normalize DB Row to API Format
 * =======================================================*/
function normaliseTicket(row: any) {
  let attachments: string[] = [];
  if (row.attachments) {
    try {
      const parsed = JSON.parse(row.attachments);
      attachments = Array.isArray(parsed) ? parsed : [];
    } catch {
      attachments = [];
    }
  }

  return {
    ...row,
    status: row.status === "in_progress" ? "pending" : row.status,
    attachments,
  };
}

/* =========================================================
 * 5. Routes
 * =======================================================*/

/**
 * POST /api/support/upload
 */
router.post("/upload", requireAuth, (req: AuthRequest, res: Response) => {
  upload.single("file")(req as any, res as any, (err: any) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "حجم فایل بیشتر از ۸ مگابایت است" : "خطا در آپلود فایل";
      return res.status(400).json({ error: msg });
    }
    if (err) {
      return res.status(400).json({ error: err.message || "آپلود فایل ناموفق بود" });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: "فایلی ارسال نشده است" });

    logger.info(`📎 Support file uploaded: ${file.filename} (${(file.size / 1024).toFixed(1)} KB)`);
    return res.status(201).json({
      success: true,
      url: `/uploads/support/${file.filename}`,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  });
});

/**
 * GET /api/support/tickets
 */
router.get("/tickets", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const isStaff = user.role === "admin" || user.role === "support";
    const mine = String(req.query.mine || "0") === "1";
    const statusFilter = req.query.status as string | undefined;
    
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    if (mine || !isStaff) {
      conditions.push("t.user_id = ?");
      params.push(user.id);
    }

    if (statusFilter && ["open", "in_progress", "closed"].includes(statusFilter)) {
      conditions.push("t.status = ?");
      params.push(statusFilter);
    }

    const whereClause = conditions.join(" AND ");

    const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM support_tickets t WHERE ${whereClause}`).get(...params) as any;
    const totalCount = totalRow?.total || 0;

    const rows = db.prepare(`
      SELECT
        t.id, t.user_id AS userId, t.category AS department, t.title AS subject,
        t.description AS message, t.priority, t.attachments, t.status, t.answer,
        t.assigned_to AS assignedTo, t.created_at AS createdAt, t.updated_at AS updatedAt,
        u.name AS userName, u.phone AS userPhone
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE ${whereClause}
      ORDER BY 
        CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    res.json({
      tickets: rows.map(normaliseTicket),
      pagination: {
        page, limit, totalCount, totalPages: Math.ceil(totalCount / limit), hasMore: page * limit < totalCount,
      },
    });
  } catch (err) {
    logger.error("Get support tickets error:", err);
    res.status(500).json({ error: "خطا در دریافت تیکت‌ها" });
  }
});

/**
 * GET /api/support/tickets/:id
 */
router.get("/tickets/:id(\\d+)", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const id = Number(req.params.id);
    const user = req.user!;
    const isStaff = user.role === "admin" || user.role === "support";

    const row = db.prepare(`
      SELECT
        t.id, t.user_id AS userId, t.category AS department, t.title AS subject,
        t.description AS message, t.priority, t.attachments, t.status, t.answer,
        t.created_at AS createdAt, t.updated_at AS updatedAt, u.name AS userName, u.phone AS userPhone
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.id = ?
    `).get(id) as any;

    if (!row) {
      res.status(404).json({ error: "تیکت یافت نشد" });
      return;
    }

    if (!isStaff && Number(row.userId) !== Number(user.id)) {
      res.status(403).json({ error: "دسترسی غیرمجاز" });
      return;
    }

    res.json({ ticket: normaliseTicket(row) });
  } catch (err) {
    logger.error("Get single ticket error:", err);
    res.status(500).json({ error: "خطا در دریافت تیکت" });
  }
});

/**
 * POST /api/support/tickets
 */
router.post("/tickets", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    
    // 🔵 Anti-Spam Check
    const lastTime = ticketSpamGuard.get(userId);
    if (lastTime && Date.now() - lastTime < SPAM_COOLDOWN_MS) {
      res.status(429).json({ error: "لطفاً برای ثبت تیکت جدید ۱ دقیقه صبر کنید." });
      return;
    }

    const parsed = createTicketSchema.parse(req.body);
    const attachmentsJson = JSON.stringify(parsed.attachments);

    // DB Transaction for safety
    const result = db.transaction(() => {
      const insertInfo = db.prepare(`
        INSERT INTO support_tickets 
          (user_id, category, title, description, priority, attachments, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(userId, parsed.department, parsed.subject, parsed.message, parsed.priority, attachmentsJson);

      // 🔵 Unified Response: Fetching immediately with User Data (JOIN)
      return db.prepare(`
        SELECT t.id, t.user_id AS userId, t.category AS department, t.title AS subject,
               t.description AS message, t.priority, t.attachments, t.status, t.answer,
               t.created_at AS createdAt, t.updated_at AS updatedAt, u.name AS userName, u.phone AS userPhone
        FROM support_tickets t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.id = ?
      `).get(insertInfo.lastInsertRowid) as any;
    })();

    // Update Spam Guard
    ticketSpamGuard.set(userId, Date.now());

    const ticket = normaliseTicket(result);
    logger.info(`🎫 Ticket #${ticket.id} created by user ${userId} [${parsed.department}]`);
    res.status(201).json({ success: true, ticket });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: err.issues[0]?.message || "داده نامعتبر است", field: err.issues[0]?.path[0] });
      return;
    }
    logger.error("Create ticket error:", err);
    res.status(500).json({ error: "خطا در ثبت تیکت" });
  }
});

/**
 * PATCH /api/support/tickets/:id
 */
router.patch("/tickets/:id(\\d+)", requireAuth, requireRole(["admin", "support"]), (req: AuthRequest, res: Response): void => {
  try {
    const id = Number(req.params.id);
    const parsed = updateStatusSchema.parse(req.body);

    const exists = db.prepare("SELECT id FROM support_tickets WHERE id = ?").get(id);
    if (!exists) {
      res.status(404).json({ error: "تیکت یافت نشد" });
      return;
    }

    const sets = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
    const values: any[] = [parsed.status];

    if (parsed.answer !== undefined) {
      sets.push("answer = ?");
      values.push(parsed.answer ?? null);
    }
    if (parsed.priority) {
      sets.push("priority = ?");
      values.push(parsed.priority);
    }
    values.push(id);

    db.transaction(() => {
      db.prepare(`UPDATE support_tickets SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    })();

    const updated = db.prepare(`
      SELECT t.id, t.user_id AS userId, t.category AS department, t.title AS subject,
             t.description AS message, t.priority, t.attachments, t.status, t.answer,
             t.created_at AS createdAt, t.updated_at AS updatedAt, u.name AS userName, u.phone AS userPhone
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.id = ?
    `).get(id) as any;

    res.json({ success: true, ticket: normaliseTicket(updated) });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: err.issues[0]?.message });
      return;
    }
    logger.error("Update ticket error:", err);
    res.status(500).json({ error: "خطا در بروزرسانی تیکت" });
  }
});

/**
 * DELETE /api/support/tickets/:id
 */
router.delete("/tickets/:id(\\d+)", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const id = Number(req.params.id);
    const user = req.user!;

    const ticket = db.prepare("SELECT user_id, attachments FROM support_tickets WHERE id = ?").get(id) as any;
    if (!ticket) {
      res.status(404).json({ error: "تیکت یافت نشد" });
      return;
    }

    if (Number(ticket.user_id) !== Number(user.id) && user.role !== "admin") {
      res.status(403).json({ error: "عدم دسترسی" });
      return;
    }

    if (ticket.attachments) {
      try {
        const files: string[] = JSON.parse(ticket.attachments);
        for (const fileUrl of files) {
          // 🔵 Security: prevent path traversal (../)
          const fileName = path.basename(fileUrl);
          const filePath = path.join(uploadDir, fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`🗑️ Deleted attachment securely: ${fileName}`);
          }
        }
      } catch {}
    }

    db.prepare("DELETE FROM support_tickets WHERE id = ?").run(id);
    res.json({ success: true, message: "تیکت و فایل‌های پیوست با موفقیت حذف شدند" });
  } catch (err) {
    logger.error("Delete ticket error:", err);
    res.status(500).json({ error: "خطا در حذف تیکت" });
  }
});

/**
 * GET /api/support/stats
 */
router.get("/stats", requireAuth, requireRole(["admin", "support"]), (_req: AuthRequest, res: Response): void => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed
      FROM support_tickets
    `).get() as any;

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: "خطا در دریافت آمار" });
  }
});

export default router;