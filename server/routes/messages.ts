// server/routes/messages.ts
import { Router, type Response } from "express";
import { z } from "zod";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const sendMessageSchema = z.object({
  roomId: z.string().min(1).max(100).optional(),
  receiverId: z.coerce.number().int().positive(),
  content: z.string().min(1).max(5000),
  productId: z.coerce.number().int().positive().optional().nullable(),
});

const createRoomSchema = z.object({
  receiverId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive().optional().nullable(),
});

const reservationSchema = z.object({
  productId: z.coerce.number().int().positive(),
  note: z.string().max(1000).optional(),
});

const reservationStatusSchema = z.object({
  status: z.enum(["seller_confirmed", "ready_for_pickup", "completed", "cancelled"]),
});

function buildRoomId(userA: number, userB: number): string {
  const [a, b] = [userA, userB].sort((x, y) => x - y);
  return `room_${a}_${b}`;
}

function ensureRoom(user1Id: number, user2Id: number, productId?: number | null): string {
  const roomId = buildRoomId(user1Id, user2Id);
  const existing = db.prepare(`SELECT room_id FROM messages_rooms WHERE room_id = ?`).get(roomId) as { room_id: string } | undefined;
  if (!existing) {
    db.prepare(
      `INSERT INTO messages_rooms (room_id, user1_id, user2_id, product_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run(roomId, Math.min(user1Id, user2Id), Math.max(user1Id, user2Id), productId ?? null);
  } else if (productId) {
    db.prepare(`UPDATE messages_rooms SET product_id = COALESCE(product_id, ?), updated_at = CURRENT_TIMESTAMP WHERE room_id = ?`).run(productId, roomId);
  }
  return roomId;
}

router.get("/conversations", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const rooms = db.prepare(`
      SELECT room_id, user1_id, user2_id, product_id, updated_at
      FROM messages_rooms WHERE user1_id = ? OR user2_id = ? ORDER BY updated_at DESC
    `).all(userId, userId) as Array<{ room_id: string; user1_id: number; user2_id: number; product_id: number | null; updated_at: string }>;

    if (rooms.length === 0) {
      const legacy = db.prepare(`SELECT room_id FROM messages WHERE sender_id = ? OR receiver_id = ? GROUP BY room_id`).all(userId, userId) as { room_id: string }[];
      if (legacy.length === 0) return res.json([]);
      const conversations = legacy.map(({ room_id }) => buildConversation(room_id, userId)).filter(Boolean);
      conversations.sort((a: any, b: any) => b.timestamp - a.timestamp);
      return res.json(conversations);
    }
    return res.json(rooms.map((r) => buildConversation(r.room_id, userId, r)).filter(Boolean));
  } catch (error) {
    logger.error("Failed to fetch conversations:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست گفتگوها" });
  }
});

function buildConversation(roomId: string, userId: number, roomMeta?: { user1_id: number; user2_id: number; product_id: number | null }) {
  const lastMsg = db.prepare(`
    SELECT id, sender_id, receiver_id, content, created_at, is_read FROM messages
    WHERE room_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(roomId) as any;
  let otherUserId: number;
  if (roomMeta) otherUserId = roomMeta.user1_id === userId ? roomMeta.user2_id : roomMeta.user1_id;
  else if (lastMsg) otherUserId = lastMsg.sender_id === userId ? lastMsg.receiver_id : lastMsg.sender_id;
  else return null;
  const store = db.prepare(`SELECT s.id, s.name, s.image_url FROM stores s WHERE s.user_id = ?`).get(otherUserId) as any;
  const otherUser = db.prepare(`SELECT name, phone, avatar_url FROM users WHERE id = ?`).get(otherUserId) as any;
  const unreadCount = (db.prepare(`SELECT COUNT(*) AS count FROM messages WHERE room_id = ? AND receiver_id = ? AND is_read = 0`).get(roomId, userId) as any).count;
  return {
    id: roomId, storeId: store?.id || otherUserId, otherUserId,
    storeName: store?.name || otherUser?.name || otherUser?.phone || "کاربر",
    lastMessage: lastMsg?.content || "",
    time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : "",
    timestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
    unread: unreadCount, avatar: store?.image_url || otherUser?.avatar_url || null, online: false,
    lastProductId: roomMeta?.product_id || null,
  };
}

router.get("/:roomId", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const roomId = req.params.roomId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before as string | undefined;
    const room = db.prepare(`SELECT * FROM messages_rooms WHERE room_id = ? AND (user1_id = ? OR user2_id = ?)`).get(roomId, userId, userId);
    const hasLegacyAccess = db.prepare(`SELECT 1 FROM messages WHERE room_id = ? AND (sender_id = ? OR receiver_id = ?) LIMIT 1`).get(roomId, userId, userId);
    if (!room && !hasLegacyAccess) return res.status(403).json({ error: "دسترسی به این گفتگو ندارید" });
    const messages = before
      ? db.prepare(`SELECT id, room_id, sender_id, receiver_id, content, is_read, created_at FROM messages WHERE room_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`).all(roomId, before, limit) as any[]
      : db.prepare(`SELECT id, room_id, sender_id, receiver_id, content, is_read, created_at FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?`).all(roomId, limit) as any[];
    db.prepare(`UPDATE messages SET is_read = 1 WHERE room_id = ? AND receiver_id = ? AND is_read = 0`).run(roomId, userId);
    return res.json({ messages: messages.reverse(), roomId });
  } catch (error) {
    logger.error("Failed to fetch messages:", error);
    return res.status(500).json({ error: "خطا در دریافت پیام‌ها" });
  }
});

router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const data = sendMessageSchema.parse(req.body);
    if (data.receiverId === userId) return res.status(400).json({ error: "نمی‌توانید به خودتان پیام بفرستید" });
    if (!db.prepare(`SELECT id FROM users WHERE id = ?`).get(data.receiverId)) return res.status(404).json({ error: "گیرنده یافت نشد" });
    const roomId = data.roomId || ensureRoom(userId, data.receiverId, data.productId);
    ensureRoom(userId, data.receiverId, data.productId);
    const result = db.prepare(`INSERT INTO messages (room_id, sender_id, receiver_id, content, is_read, created_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`).run(roomId, userId, data.receiverId, data.content);
    db.prepare(`UPDATE messages_rooms SET updated_at = CURRENT_TIMESTAMP WHERE room_id = ?`).run(roomId);
    const message = db.prepare(`SELECT id, room_id, sender_id, receiver_id, content, is_read, created_at FROM messages WHERE id = ?`).get(result.lastInsertRowid);
    const io = req.app.get("io");
    if (io) io.to(roomId).emit("receive_message", { ...message, timestamp: new Date((message as any).created_at).toISOString(), status: "sent" });
    return res.status(201).json({ message, success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Send message error:", err);
    return res.status(500).json({ error: "خطا در ارسال پیام" });
  }
});

router.post("/rooms", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const { receiverId, productId } = createRoomSchema.parse(req.body);
    if (receiverId === userId) return res.status(400).json({ error: "نمی‌توانید با خودتان گفتگو شروع کنید" });
    if (!db.prepare(`SELECT id FROM users WHERE id = ?`).get(receiverId)) return res.status(404).json({ error: "کاربر یافت نشد" });
    return res.json({ roomId: ensureRoom(userId, receiverId, productId), success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Create room error:", err);
    return res.status(500).json({ error: "خطا در ایجاد گفتگو" });
  }
});

/** Buyer creates a reservation request and an auditable chat message. */
router.post("/reservations", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const { productId, note } = reservationSchema.parse(req.body);
    const product = db.prepare(`
      SELECT p.id, p.name, p.price, p.status, p.store_id, s.user_id AS seller_id, s.name AS store_name
      FROM products p JOIN stores s ON s.id = p.store_id WHERE p.id = ?
    `).get(productId) as any;
    if (!product) return res.status(404).json({ error: "کالا یافت نشد" });
    if (!product.seller_id || Number(product.seller_id) === userId) return res.status(400).json({ error: "امکان درخواست رزرو برای این کالا وجود ندارد" });
    const unavailable = /ناموجود|out\s*of\s*stock|unavailable/i.test(String(product.status || ""));
    if (unavailable) return res.status(409).json({ error: "این کالا در حال حاضر ناموجود ثبت شده است" });
    const active = db.prepare(`SELECT id FROM reservation_requests WHERE requester_id = ? AND product_id = ? AND status IN ('requested','seller_confirmed','ready_for_pickup') LIMIT 1`).get(userId, productId) as any;
    if (active) return res.status(409).json({ error: "برای این کالا یک درخواست فعال دارید", reservationId: active.id });

    const roomId = ensureRoom(userId, Number(product.seller_id), productId);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const messageText = `درخواست رزرو کالا\nکالا: ${product.name}\nقیمت ثبت‌شده: ${Number(product.price || 0).toLocaleString("fa-IR")} تومان\nفروشگاه: ${product.store_name || "فروشگاه"}\nاین درخواست تا تأیید فروشنده قطعی نیست.${note ? `\nیادداشت خریدار: ${note}` : ""}`;
    const tx = db.transaction(() => {
      const result = db.prepare(`INSERT INTO reservation_requests (requester_id, seller_id, product_id, room_id, price_snapshot, status, note, expires_at) VALUES (?, ?, ?, ?, ?, 'requested', ?, ?)`).run(userId, Number(product.seller_id), productId, roomId, Number(product.price || 0), note || null, expiresAt);
      const message = db.prepare(`INSERT INTO messages (room_id, sender_id, receiver_id, content, is_read, created_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`).run(roomId, userId, Number(product.seller_id), messageText);
      db.prepare(`UPDATE messages_rooms SET product_id = COALESCE(product_id, ?), updated_at = CURRENT_TIMESTAMP WHERE room_id = ?`).run(productId, roomId);
      return { reservationId: Number(result.lastInsertRowid), messageId: Number(message.lastInsertRowid) };
    });
    const result = tx();
    const reservation = db.prepare(`
      SELECT r.id, r.requester_id, r.seller_id, r.product_id, r.room_id, r.price_snapshot, r.status, r.note, r.expires_at, r.created_at, r.updated_at,
             p.name AS product_name, s.name AS store_name
      FROM reservation_requests r JOIN products p ON p.id = r.product_id LEFT JOIN stores s ON s.user_id = r.seller_id WHERE r.id = ?
    `).get(result.reservationId) as any;
    const io = req.app.get("io");
    if (io) io.to(roomId).emit("reservation_request", reservation);
    return res.status(201).json({ success: true, reservation, messageId: result.messageId });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    if (String(err?.message || "").includes("UNIQUE constraint failed")) return res.status(409).json({ error: "یک درخواست فعال برای این کالا وجود دارد" });
    logger.error("Create reservation error:", err);
    return res.status(500).json({ error: "خطا در ثبت درخواست رزرو" });
  }
});

router.get("/reservations", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const rows = db.prepare(`
      SELECT r.id, r.product_id, r.room_id, r.price_snapshot, r.status, r.note, r.expires_at, r.created_at, r.updated_at,
             p.name AS product_name, s.name AS store_name
      FROM reservation_requests r JOIN products p ON p.id = r.product_id LEFT JOIN stores s ON s.user_id = r.seller_id
      WHERE r.requester_id = ? ORDER BY r.updated_at DESC, r.id DESC LIMIT 100
    `).all(userId);
    return res.json(rows);
  } catch (err) {
    logger.error("List reservations error:", err);
    return res.status(500).json({ error: "خطا در دریافت درخواست‌ها" });
  }
});

router.get("/reservations/seller", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const rows = db.prepare(`
      SELECT r.id, r.requester_id, r.product_id, r.room_id, r.price_snapshot, r.status, r.note, r.expires_at, r.created_at, r.updated_at,
             p.name AS product_name, u.name AS requester_name, u.phone AS requester_phone
      FROM reservation_requests r JOIN products p ON p.id = r.product_id JOIN users u ON u.id = r.requester_id
      WHERE r.seller_id = ? ORDER BY r.updated_at DESC, r.id DESC LIMIT 100
    `).all(userId);
    return res.json(rows);
  } catch (err) {
    logger.error("List seller reservations error:", err);
    return res.status(500).json({ error: "خطا در دریافت درخواست‌های فروشنده" });
  }
});

router.patch("/reservations/:id/status", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = reservationStatusSchema.parse(req.body);
    const reservation = db.prepare(`SELECT * FROM reservation_requests WHERE id = ?`).get(id) as any;
    if (!reservation) return res.status(404).json({ error: "درخواست پیدا نشد" });
    const userId = Number(req.user!.id);
    const isSeller = Number(reservation.seller_id) === userId;
    const isBuyer = Number(reservation.requester_id) === userId;
    if (!isSeller && !isBuyer) return res.status(403).json({ error: "دسترسی ندارید" });
    if (status !== "cancelled" && !isSeller) return res.status(403).json({ error: "فقط فروشنده می‌تواند وضعیت رزرو را تغییر دهد" });
    const allowed: Record<string, string[]> = {
      requested: ["seller_confirmed", "cancelled"], seller_confirmed: ["ready_for_pickup", "cancelled"],
      ready_for_pickup: ["completed", "cancelled"], completed: [], cancelled: [], expired: [],
    };
    if (!allowed[reservation.status]?.includes(status)) return res.status(409).json({ error: "تغییر وضعیت مجاز نیست" });
    db.prepare(`UPDATE reservation_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    const updated = db.prepare(`SELECT r.*, p.name AS product_name, s.name AS store_name FROM reservation_requests r JOIN products p ON p.id = r.product_id LEFT JOIN stores s ON s.user_id = r.seller_id WHERE r.id = ?`).get(id) as any;
    const io = req.app.get("io");
    if (io) io.to(reservation.room_id).emit("reservation_status", updated);
    return res.json({ success: true, reservation: updated });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Update reservation error:", err);
    return res.status(500).json({ error: "خطا در تغییر وضعیت درخواست" });
  }
});

router.patch("/:roomId/read", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const roomId = req.params.roomId;
    const result = db.prepare(`UPDATE messages SET is_read = 1 WHERE room_id = ? AND receiver_id = ? AND is_read = 0`).run(roomId, userId);
    const io = req.app.get("io");
    if (io) io.to(roomId).emit("messages_read", { roomId, userId, count: result.changes });
    return res.json({ success: true, updated: result.changes });
  } catch (error) {
    logger.error("Mark read error:", error);
    return res.status(500).json({ error: "خطا در به‌روزرسانی وضعیت خواندن" });
  }
});

export default router;
export { ensureRoom, buildRoomId };
