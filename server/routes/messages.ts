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

/** Build a deterministic room id for two users */
function buildRoomId(userA: number, userB: number): string {
  const [a, b] = [userA, userB].sort((x, y) => x - y);
  return `room_${a}_${b}`;
}

/** Ensure room exists and both users are members */
function ensureRoom(user1Id: number, user2Id: number, productId?: number | null): string {
  const roomId = buildRoomId(user1Id, user2Id);
  const existing = db
    .prepare(`SELECT room_id FROM messages_rooms WHERE room_id = ?`)
    .get(roomId) as { room_id: string } | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO messages_rooms (room_id, user1_id, user2_id, product_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run(roomId, Math.min(user1Id, user2Id), Math.max(user1Id, user2Id), productId ?? null);
  } else if (productId) {
    db.prepare(
      `UPDATE messages_rooms SET product_id = COALESCE(product_id, ?), updated_at = CURRENT_TIMESTAMP WHERE room_id = ?`
    ).run(productId, roomId);
  }
  return roomId;
}

/**
 * GET /api/messages/conversations
 */
router.get("/conversations", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);

    const rooms = db
      .prepare(
        `
        SELECT room_id, user1_id, user2_id, product_id, updated_at
        FROM messages_rooms
        WHERE user1_id = ? OR user2_id = ?
        ORDER BY updated_at DESC
      `
      )
      .all(userId, userId) as Array<{
      room_id: string;
      user1_id: number;
      user2_id: number;
      product_id: number | null;
      updated_at: string;
    }>;

    // Fallback: rooms only known from messages table (legacy)
    if (rooms.length === 0) {
      const legacy = db
        .prepare(
          `
          SELECT room_id
          FROM messages
          WHERE sender_id = ? OR receiver_id = ?
          GROUP BY room_id
        `
        )
        .all(userId, userId) as { room_id: string }[];

      if (legacy.length === 0) return res.json([]);

      const conversations = legacy
        .map(({ room_id }) => buildConversation(room_id, userId))
        .filter(Boolean);
      conversations.sort((a: any, b: any) => b.timestamp - a.timestamp);
      return res.json(conversations);
    }

    const conversations = rooms
      .map((r) => buildConversation(r.room_id, userId, r))
      .filter(Boolean);

    return res.json(conversations);
  } catch (error) {
    logger.error("Failed to fetch conversations:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست گفتگوها" });
  }
});

function buildConversation(
  roomId: string,
  userId: number,
  roomMeta?: { user1_id: number; user2_id: number; product_id: number | null }
) {
  const lastMsg = db
    .prepare(
      `
      SELECT id, sender_id, receiver_id, content, created_at, is_read
      FROM messages
      WHERE room_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `
    )
    .get(roomId) as any;

  let otherUserId: number;
  if (roomMeta) {
    otherUserId = roomMeta.user1_id === userId ? roomMeta.user2_id : roomMeta.user1_id;
  } else if (lastMsg) {
    otherUserId = lastMsg.sender_id === userId ? lastMsg.receiver_id : lastMsg.sender_id;
  } else {
    return null;
  }

  const store = db
    .prepare(`SELECT s.id, s.name, s.image_url FROM stores s WHERE s.user_id = ?`)
    .get(otherUserId) as any;

  const otherUser = db
    .prepare(`SELECT name, phone, avatar_url FROM users WHERE id = ?`)
    .get(otherUserId) as any;

  const unreadCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM messages WHERE room_id = ? AND receiver_id = ? AND is_read = 0`
      )
      .get(roomId, userId) as any
  ).count;

  const storeName =
    store?.name || otherUser?.name || otherUser?.phone || "کاربر";

  return {
    id: roomId,
    storeId: store?.id || otherUserId,
    otherUserId,
    storeName,
    lastMessage: lastMsg?.content || "",
    time: lastMsg
      ? new Date(lastMsg.created_at).toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    timestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
    unread: unreadCount,
    avatar: store?.image_url || otherUser?.avatar_url || null,
    online: false,
    lastProductId: roomMeta?.product_id || null,
  };
}

/**
 * GET /api/messages/:roomId
 * تاریخچه پیام‌های یک اتاق
 */
router.get("/:roomId", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const roomId = req.params.roomId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before as string | undefined;

    // Access check
    const room = db
      .prepare(
        `SELECT * FROM messages_rooms WHERE room_id = ? AND (user1_id = ? OR user2_id = ?)`
      )
      .get(roomId, userId, userId);

    const hasLegacyAccess = db
      .prepare(
        `SELECT 1 FROM messages WHERE room_id = ? AND (sender_id = ? OR receiver_id = ?) LIMIT 1`
      )
      .get(roomId, userId, userId);

    if (!room && !hasLegacyAccess) {
      return res.status(403).json({ error: "دسترسی به این گفتگو ندارید" });
    }

    let messages: any[];
    if (before) {
      messages = db
        .prepare(
          `
          SELECT id, room_id, sender_id, receiver_id, content, is_read, created_at
          FROM messages
          WHERE room_id = ? AND created_at < ?
          ORDER BY created_at DESC
          LIMIT ?
        `
        )
        .all(roomId, before, limit) as any[];
    } else {
      messages = db
        .prepare(
          `
          SELECT id, room_id, sender_id, receiver_id, content, is_read, created_at
          FROM messages
          WHERE room_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `
        )
        .all(roomId, limit) as any[];
    }

    // Mark as read for current user
    db.prepare(
      `UPDATE messages SET is_read = 1 WHERE room_id = ? AND receiver_id = ? AND is_read = 0`
    ).run(roomId, userId);

    return res.json({
      messages: messages.reverse(),
      roomId,
    });
  } catch (error) {
    logger.error("Failed to fetch messages:", error);
    return res.status(500).json({ error: "خطا در دریافت پیام‌ها" });
  }
});

/**
 * POST /api/messages
 * ارسال پیام (REST fallback — Socket.IO preferred)
 */
router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const data = sendMessageSchema.parse(req.body);

    if (data.receiverId === userId) {
      return res.status(400).json({ error: "نمی‌توانید به خودتان پیام بفرستید" });
    }

    const receiver = db.prepare(`SELECT id FROM users WHERE id = ?`).get(data.receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "گیرنده یافت نشد" });
    }

    const roomId = data.roomId || ensureRoom(userId, data.receiverId, data.productId);

    // Ensure membership
    ensureRoom(userId, data.receiverId, data.productId);

    const result = db
      .prepare(
        `
        INSERT INTO messages (room_id, sender_id, receiver_id, content, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `
      )
      .run(roomId, userId, data.receiverId, data.content);

    db.prepare(
      `UPDATE messages_rooms SET updated_at = CURRENT_TIMESTAMP WHERE room_id = ?`
    ).run(roomId);

    const message = db
      .prepare(
        `SELECT id, room_id, sender_id, receiver_id, content, is_read, created_at FROM messages WHERE id = ?`
      )
      .get(result.lastInsertRowid);

    // Emit via Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("receive_message", {
        ...message,
        timestamp: new Date((message as any).created_at).toISOString(),
        status: "sent",
      });
    }

    return res.status(201).json({ message, success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0].message });
    }
    logger.error("Send message error:", err);
    return res.status(500).json({ error: "خطا در ارسال پیام" });
  }
});

/**
 * POST /api/messages/rooms
 * ایجاد یا دریافت اتاق گفتگو
 */
router.post("/rooms", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const { receiverId, productId } = createRoomSchema.parse(req.body);

    if (receiverId === userId) {
      return res.status(400).json({ error: "نمی‌توانید با خودتان گفتگو شروع کنید" });
    }

    const receiver = db.prepare(`SELECT id FROM users WHERE id = ?`).get(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    const roomId = ensureRoom(userId, receiverId, productId);
    return res.json({ roomId, success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0].message });
    }
    logger.error("Create room error:", err);
    return res.status(500).json({ error: "خطا در ایجاد گفتگو" });
  }
});

/**
 * PATCH /api/messages/:roomId/read
 * علامت‌گذاری همه پیام‌های خوانده‌نشده
 */
router.patch("/:roomId/read", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id);
    const roomId = req.params.roomId;

    const result = db
      .prepare(
        `UPDATE messages SET is_read = 1 WHERE room_id = ? AND receiver_id = ? AND is_read = 0`
      )
      .run(roomId, userId);

    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("messages_read", { roomId, userId, count: result.changes });
    }

    return res.json({ success: true, updated: result.changes });
  } catch (error) {
    logger.error("Mark read error:", error);
    return res.status(500).json({ error: "خطا در به‌روزرسانی وضعیت خواندن" });
  }
});

export default router;
export { ensureRoom, buildRoomId };
