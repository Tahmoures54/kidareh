import { Router, type Response } from "express";
import { z } from "zod";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { ensureRoom } from "./messages.js";

const router = Router();

const createSchema = z.object({
  productId: z.coerce.number().int().positive(),
  note: z.string().max(1000).optional(),
});

const statusSchema = z.object({
  status: z.enum(["seller_confirmed", "ready_for_pickup", "completed", "cancelled"]),
});

function getReservation(id: number) {
  return db.prepare(`
    SELECT r.id, r.requester_id, r.seller_id, r.product_id, r.room_id,
           r.price_snapshot, r.status, r.note, r.expires_at, r.created_at, r.updated_at,
           p.name AS product_name, s.name AS store_name
    FROM reservation_requests r
    JOIN products p ON p.id = r.product_id
    LEFT JOIN stores s ON s.user_id = r.seller_id
    WHERE r.id = ?
  `).get(id) as any;
}

/** POST /api/reservations — buyer creates a reservation request. */
router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const { productId, note } = createSchema.parse(req.body);
    const product = db.prepare(`
      SELECT p.id, p.name, p.price, p.status, p.store_id, s.user_id AS seller_id, s.name AS store_name
      FROM products p JOIN stores s ON s.id = p.store_id
      WHERE p.id = ?
    `).get(productId) as any;

    if (!product) return res.status(404).json({ error: "کالا یافت نشد" });
    if (!product.seller_id || Number(product.seller_id) === userId) return res.status(400).json({ error: "امکان درخواست رزرو برای این کالا وجود ندارد" });
    if (String(product.status || "").toLowerCase().includes("ناموجود")) return res.status(409).json({ error: "این کالا در حال حاضر ناموجود ثبت شده است" });

    const active = db.prepare(`
      SELECT id FROM reservation_requests
      WHERE requester_id = ? AND product_id = ? AND status IN ('requested','seller_confirmed','ready_for_pickup')
      LIMIT 1
    `).get(userId, productId) as any;
    if (active) {
      return res.status(409).json({ error: "برای این کالا یک درخواست فعال دارید", reservationId: active.id });
    }

    const roomId = ensureRoom(userId, Number(product.seller_id), productId);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const messageText = `درخواست رزرو کالا\nکالا: ${product.name}\nقیمت ثبت‌شده: ${Number(product.price || 0).toLocaleString("fa-IR")} تومان\nفروشگاه: ${product.store_name || "فروشگاه"}\nاین درخواست تا تأیید فروشنده قطعی نیست.${note ? `\nیادداشت خریدار: ${note}` : ""}`;

    const tx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO reservation_requests (requester_id, seller_id, product_id, room_id, price_snapshot, status, note, expires_at)
        VALUES (?, ?, ?, ?, ?, 'requested', ?, ?)
      `).run(userId, Number(product.seller_id), productId, roomId, Number(product.price || 0), note || null, expiresAt);

      db.prepare(`
        INSERT INTO messages (room_id, sender_id, receiver_id, content, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `).run(roomId, userId, Number(product.seller_id), messageText);
      db.prepare(`UPDATE messages_rooms SET product_id = COALESCE(product_id, ?), updated_at = CURRENT_TIMESTAMP WHERE room_id = ?`).run(productId, roomId);
      return Number(result.lastInsertRowid);
    });

    const reservationId = tx();
    const reservation = getReservation(reservationId);
    const io = req.app.get("io");
    if (io) io.to(roomId).emit("reservation_request", reservation);
    return res.status(201).json({ success: true, reservation });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    if (String(err?.message || "").includes("UNIQUE constraint failed")) return res.status(409).json({ error: "یک درخواست فعال برای این کالا وجود دارد" });
    logger.error("Create reservation error:", err);
    return res.status(500).json({ error: "خطا در ثبت درخواست رزرو" });
  }
});

/** GET /api/reservations — buyer's requests. */
router.get("/", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const rows = db.prepare(`
      SELECT r.id, r.product_id, r.room_id, r.price_snapshot, r.status, r.note, r.expires_at, r.created_at, r.updated_at,
             p.name AS product_name, s.name AS store_name
      FROM reservation_requests r
      JOIN products p ON p.id = r.product_id
      LEFT JOIN stores s ON s.user_id = r.seller_id
      WHERE r.requester_id = ?
      ORDER BY r.updated_at DESC, r.id DESC
      LIMIT 100
    `).all(userId);
    return res.json(rows);
  } catch (err) {
    logger.error("List buyer reservations error:", err);
    return res.status(500).json({ error: "خطا در دریافت درخواست‌ها" });
  }
});

/** GET /api/reservations/seller — seller's incoming requests. */
router.get("/seller", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const rows = db.prepare(`
      SELECT r.id, r.requester_id, r.product_id, r.room_id, r.price_snapshot, r.status, r.note, r.expires_at, r.created_at, r.updated_at,
             p.name AS product_name, u.name AS requester_name, u.phone AS requester_phone
      FROM reservation_requests r
      JOIN products p ON p.id = r.product_id
      JOIN users u ON u.id = r.requester_id
      WHERE r.seller_id = ?
      ORDER BY r.updated_at DESC, r.id DESC
      LIMIT 100
    `).all(userId);
    return res.json(rows);
  } catch (err) {
    logger.error("List seller reservations error:", err);
    return res.status(500).json({ error: "خطا در دریافت درخواست‌های فروشنده" });
  }
});

/** PATCH /api/reservations/:id/status — seller confirms/updates, buyer may cancel. */
router.patch("/:id/status", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "شناسه درخواست نامعتبر است" });
    const { status } = statusSchema.parse(req.body);
    const reservation = getReservation(id);
    if (!reservation) return res.status(404).json({ error: "درخواست پیدا نشد" });
    const userId = Number(req.user!.id);
    const isSeller = Number(reservation.seller_id) === userId;
    const isBuyer = Number(reservation.requester_id) === userId;
    if (!isSeller && !isBuyer) return res.status(403).json({ error: "دسترسی ندارید" });
    if (status !== "cancelled" && !isSeller) return res.status(403).json({ error: "فقط فروشنده می‌تواند وضعیت رزرو را تغییر دهد" });

    const allowedTransitions: Record<string, string[]> = {
      requested: ["seller_confirmed", "cancelled"],
      seller_confirmed: ["ready_for_pickup", "cancelled"],
      ready_for_pickup: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
      expired: [],
    };
    if (!allowedTransitions[reservation.status]?.includes(status)) return res.status(409).json({ error: "تغییر وضعیت مجاز نیست" });

    db.prepare(`UPDATE reservation_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    const updated = getReservation(id);
    const io = req.app.get("io");
    if (io) io.to(reservation.room_id).emit("reservation_status", updated);
    return res.json({ success: true, reservation: updated });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Update reservation error:", err);
    return res.status(500).json({ error: "خطا در تغییر وضعیت درخواست" });
  }
});

export default router;
