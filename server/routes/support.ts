import { Router, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";

const router = Router();

/* =========================================================
 * Upload config
 * =======================================================*/
const uploadDir = path.join(process.cwd(), "public", "uploads", "support");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";
    cb(null, `support_${Date.now()}_${Math.floor(Math.random() * 1e6)}${safeExt}`);
  },
});

const allowedMimes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/zip",
  "text/plain",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) cb(null, true);
    else cb(new Error("فرمت فایل مجاز نیست"));
  },
});

/* =========================================================
 * Schemas
 * =======================================================*/
const createTicketSchema = z.object({
  department: z.string().trim().min(1, "دپارتمان الزامی است").max(100),
  subject: z.string().trim().min(5, "موضوع باید حداقل ۵ کاراکتر باشد").max(100),
  message: z.string().trim().min(20, "پیام باید حداقل ۲۰ کاراکتر باشد").max(1000),
  attachments: z.array(z.string().url()).max(3).optional().default([]),
  userId: z.union([z.number(), z.string()]).optional(), // از فرانت میاد، اما مبنا req.user است
});

const updateStatusSchema = z.object({
  status: z.enum(["open", "pending", "closed"]),
  answer: z.string().trim().max(2000).optional().nullable(),
});

/* =========================================================
 * Ensure table exists (safe bootstrap)
 * =======================================================*/
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      department TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      attachments TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      answer TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
    ON support_tickets(user_id)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status
    ON support_tickets(status)
  `).run();
} catch (e) {
  logger.error("Support table bootstrap error:", e);
}

/* =========================================================
 * 1) Upload attachment (auth)
 * POST /api/support/upload
 * =======================================================*/
router.post("/upload", requireAuth, (req: AuthRequest, res: Response) => {
  upload.single("file")(req as any, res as any, (err: any) => {
    if (err) {
      logger.warn("Support upload failed:", err?.message || err);
      return res.status(400).json({ error: err?.message || "آپلود فایل ناموفق بود" });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: "فایلی ارسال نشده است" });
    }

    const publicUrl = `/uploads/support/${file.filename}`;
    return res.status(201).json({
      success: true,
      url: publicUrl,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  });
});

/* =========================================================
 * 2) Get tickets
 * GET /api/support/tickets?mine=1&page=1&limit=20
 * - mine=1 => فقط تیکت‌های کاربر
 * - admin => همه تیکت‌ها
 * =======================================================*/
router.get("/tickets", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const user = req.user!;
    const mine = String(req.query.mine || "0") === "1";
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        t.id,
        t.user_id as userId,
        t.department,
        t.subject,
        t.message,
        t.attachments,
        t.status,
        t.answer,
        t.created_at as createdAt,
        t.updated_at as updatedAt
      FROM support_tickets t
      WHERE 1=1
    `;
    const params: any[] = [];

    if (mine || user.role !== "admin") {
      sql += " AND t.user_id = ?";
      params.push(user.id);
    }

    sql += " ORDER BY t.id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params) as any[];

    const tickets = rows.map((r) => {
      let attachments: string[] = [];
      if (r.attachments) {
        try {
          const parsed = JSON.parse(r.attachments);
          attachments = Array.isArray(parsed) ? parsed : [];
        } catch {
          attachments = [];
        }
      }
      return {
        ...r,
        attachments,
      };
    });

    res.json({
      tickets,
      pagination: {
        page,
        limit,
        hasMore: tickets.length === limit,
      },
    });
  } catch (err) {
    logger.error("Get support tickets error:", err);
    res.status(500).json({ error: "خطا در دریافت تیکت‌ها" });
  }
});

/* =========================================================
 * 3) Create ticket
 * POST /api/support/tickets
 * =======================================================*/
router.post("/tickets", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const parsed = createTicketSchema.parse(req.body);

    const attachments = Array.isArray(parsed.attachments) ? parsed.attachments.slice(0, 3) : [];
    const result = db.prepare(`
      INSERT INTO support_tickets (
        user_id, department, subject, message, attachments, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      userId,
      parsed.department,
      parsed.subject,
      parsed.message,
      JSON.stringify(attachments)
    );

    const created = db.prepare(`
      SELECT
        id,
        user_id as userId,
        department,
        subject,
        message,
        attachments,
        status,
        answer,
        created_at as createdAt,
        updated_at as updatedAt
      FROM support_tickets
      WHERE id = ?
      LIMIT 1
    `).get(result.lastInsertRowid) as any;

    const ticket = {
      ...created,
      attachments: created?.attachments ? JSON.parse(created.attachments) : [],
    };

    logger.info(`🎫 Support ticket created: ${ticket.id} by user ${userId}`);
    res.status(201).json({ success: true, ticket });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const first = err.issues?.[0];
      res.status(400).json({
        error: first?.message || "داده‌های ارسالی نامعتبر است",
        field: first?.path?.[0],
        details: err.issues,
      });
      return;
    }

    logger.error("Create support ticket error:", err);
    res.status(500).json({ error: "خطا در ثبت تیکت" });
  }
});

/* =========================================================
 * 4) Update ticket status (admin)
 * PATCH /api/support/tickets/:id
 * =======================================================*/
router.patch(
  "/tickets/:id(\\d+)",
  requireAuth,
  requireRole(["admin"]),
  (req: AuthRequest, res: Response): void => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: "شناسه تیکت نامعتبر است" });
        return;
      }

      const parsed = updateStatusSchema.parse(req.body);

      const exists = db.prepare("SELECT id FROM support_tickets WHERE id = ?").get(id) as any;
      if (!exists) {
        res.status(404).json({ error: "تیکت یافت نشد" });
        return;
      }

      db.prepare(`
        UPDATE support_tickets
        SET status = ?, answer = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(parsed.status, parsed.answer ?? null, id);

      const updated = db.prepare(`
        SELECT
          id,
          user_id as userId,
          department,
          subject,
          message,
          attachments,
          status,
          answer,
          created_at as createdAt,
          updated_at as updatedAt
        FROM support_tickets
        WHERE id = ?
      `).get(id) as any;

      const ticket = {
        ...updated,
        attachments: updated?.attachments ? JSON.parse(updated.attachments) : [],
      };

      res.json({ success: true, ticket });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        const first = err.issues?.[0];
        res.status(400).json({
          error: first?.message || "داده‌های ارسالی نامعتبر است",
          field: first?.path?.[0],
          details: err.issues,
        });
        return;
      }

      logger.error("Update support ticket error:", err);
      res.status(500).json({ error: "خطا در بروزرسانی تیکت" });
    }
  }
);

/* =========================================================
 * 5) Delete ticket (owner/admin)
 * DELETE /api/support/tickets/:id
 * =======================================================*/
router.delete("/tickets/:id(\\d+)", requireAuth, (req: AuthRequest, res: Response): void => {
  try {
    const id = Number(req.params.id);
    const user = req.user!;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "شناسه تیکت نامعتبر است" });
      return;
    }

    const ticket = db.prepare("SELECT id, user_id FROM support_tickets WHERE id = ?").get(id) as any;
    if (!ticket) {
      res.status(404).json({ error: "تیکت یافت نشد" });
      return;
    }

    const isOwner = Number(ticket.user_id) === Number(user.id);
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "شما مجاز به حذف این تیکت نیستید" });
      return;
    }

    db.prepare("DELETE FROM support_tickets WHERE id = ?").run(id);
    res.json({ success: true, message: "تیکت حذف شد" });
  } catch (err) {
    logger.error("Delete support ticket error:", err);
    res.status(500).json({ error: "خطا در حذف تیکت" });
  }
});

export default router;