// server/routes/messages.ts
import { Router, type Response } from "express";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/messages/conversations
 * لیست تمام گفتگوهای کاربر جاری به همراه آخرین پیام، نام فروشگاه، وضعیت خوانده‌نشدن و غیره
 */
router.get("/conversations", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // پیدا کردن room_idهایی که کاربر در آن‌ها مشارکت داشته است
    const rooms = db.prepare(`
      SELECT room_id
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY room_id
    `).all(userId, userId) as { room_id: string }[];

    if (rooms.length === 0) {
      return res.json([]);
    }

    const conversations = rooms.map(({ room_id }) => {
      // آخرین پیام در این اتاق
      const lastMsg = db.prepare(`
        SELECT id, sender_id, receiver_id, content, created_at
        FROM messages
        WHERE room_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(room_id) as any;

      if (!lastMsg) return null;

      // مشخص کردن طرف مقابل
      const otherUserId = lastMsg.sender_id === userId ? lastMsg.receiver_id : lastMsg.sender_id;

      // اطلاعات فروشگاه طرف مقابل (در صورت وجود)
      const store = db.prepare(`
        SELECT s.id, s.name, s.image_url
        FROM stores s
        WHERE s.user_id = ?
      `).get(otherUserId) as any;

      // تعداد پیام‌های خوانده‌نشده برای کاربر جاری در این اتاق
      const unreadCount = (db.prepare(`
        SELECT COUNT(*) AS count
        FROM messages
        WHERE room_id = ? AND receiver_id = ? AND is_read = 0
      `).get(room_id, userId) as any).count;

      const otherUserName = db.prepare("SELECT name, phone FROM users WHERE id = ?").get(otherUserId) as any;
      const storeName = store?.name || otherUserName?.name || otherUserName?.phone || "کاربر";

      return {
        id: room_id,                         // می‌توان id ترکیبی یا room_id باشد
        storeId: store?.id || otherUserId,   // فروشگاه یا کاربر
        storeName,
        lastMessage: lastMsg.content,
        time: new Date(lastMsg.created_at).toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: new Date(lastMsg.created_at).getTime(),
        unread: unreadCount,
        avatar: store?.image_url || null,
        online: false,                       // وضعیت آنلاین در آینده قابل اضافه شدن است
        lastProductId: null,                // در صورت نیاز می‌توان از متن پیام استخراج کرد
      };
    }).filter(Boolean); // حذف nullها

    // مرتب‌سازی بر اساس زمان آخرین پیام (جدیدترین اول)
    conversations.sort((a, b) => (b as any).timestamp - (a as any).timestamp);

    return res.json(conversations);
  } catch (error) {
    logger.error("Failed to fetch conversations:", error);
    return res.status(500).json({ error: "خطا در دریافت لیست گفتگوها" });
  }
});

export default router;