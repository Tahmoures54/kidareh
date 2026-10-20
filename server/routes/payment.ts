import express from "express";
import axios from "axios";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import db from "../db.js";
import logger from "../logger.js";
import { PROMO_CATALOG, getPackage, activatePromotionPackage, ensurePromotionTables } from "../services/promotions.js";

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";
const ZIBAL_API = "https://gateway.zibal.ir/v1";

try { ensurePromotionTables(); } catch {}

const BADGE_PRICES: Record<string, number> = {
  "تیک آبی فروشگاه": 79000, "نشان ویژه": 49000, "ارسال فوری": 10000, "تضمین کیفیت": 15000,
};
for (const p of PROMO_CATALOG) { BADGE_PRICES[p.id] = p.price; BADGE_PRICES[p.name] = p.price; }

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id), amount INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'badge_purchase',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
      ref_id TEXT, metadata TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS badge_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
      badge_name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, badge_name)
    );
  `);
} catch (e: any) { logger.error("DB init error in payment.ts:", e.message); }

function getZibalMerchant(): string {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'ZIBAL_MERCHANT'").get() as any;
    if (row?.value) return String(row.value).trim();
  } catch {}
  return (process.env.ZIBAL_MERCHANT || "").trim();
}

function processReferralCommission(referredUserId: number, purchaseAmount: number): void {
  try {
    const event = db.prepare(`SELECT re.id, re.referrer_user_id FROM referral_events re
      WHERE re.referred_user_id = ? AND re.status IN ('pending','approved') LIMIT 1`).get(referredUserId) as any;
    if (!event) return;
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'REFERRAL_PERCENTAGE'").get() as any;
    const reward = Math.floor((purchaseAmount * Number(settingRow?.value ?? 10)) / 100);
    if (reward <= 0) return;
    db.prepare("UPDATE referral_events SET reward_amount = reward_amount + ?, status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reward, event.id);
    db.prepare(`INSERT INTO wallet_transactions (user_id, type, amount, status, description, source, created_at)
      VALUES (?, 'commission', ?, 'pending', ?, 'referral', CURRENT_TIMESTAMP)`)
      .run(event.referrer_user_id, reward, `پورسانت معرفی — خرید ${purchaseAmount.toLocaleString("fa-IR")} تومان`);
  } catch (err) { logger.error("processReferralCommission error:", err); }
}

function activateBadges(userId: number, items: Array<{ badgeId: string; qty: number }>): void {
  for (const { badgeId, qty } of items) {
    const pkg = getPackage(badgeId);
    if (pkg) {
      for (let i = 0; i < qty; i++) {
        const r = activatePromotionPackage(userId, badgeId);
        if (!r.ok) logger.warn(`activate package ${badgeId}: ${r.error}`);
      }
      continue;
    }
    if (badgeId === "تیک آبی فروشگاه" || badgeId === "blue_tick_30d") {
      activatePromotionPackage(userId, "blue_tick_30d"); continue;
    }
    if (badgeId === "نشان ویژه") {
      activatePromotionPackage(userId, qty >= 4 ? "search_boost_30d" : "search_boost_7d"); continue;
    }
    db.prepare(`INSERT INTO badge_inventory (user_id, badge_name, quantity, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, badge_name) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP`)
      .run(userId, badgeId, qty);
  }
}

const initiateSchema = z.object({
  description: z.string().max(200).optional(),
  returnUrl: z.string().url("آدرس بازگشت نامعتبر است"),
  items: z.array(z.object({ badgeId: z.string().min(1).max(100), qty: z.number().int().positive().max(100) })).min(1),
});
const verifySchema = z.object({
  trackId: z.union([z.string(), z.number()]).transform(String).pipe(z.string().trim().min(1).max(40)),
  transactionId: z.number().int().positive(),
});

router.post("/initiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { description, returnUrl, items } = initiateSchema.parse(req.body);
    const userId = req.user!.id;
    const merchant = getZibalMerchant();
    let amountToman = 0;
    for (const item of items) {
      const price = BADGE_PRICES[item.badgeId];
      if (price === undefined) return res.status(400).json({ error: "آیتم انتخاب‌شده معتبر نیست" });
      amountToman += price * item.qty;
    }
    if (!Number.isSafeInteger(amountToman) || amountToman < 1000 || amountToman > 50000000) {
      return res.status(400).json({ error: "مبلغ خارج از بازه مجاز است" });
    }
    const inserted = db.prepare(`INSERT INTO transactions (user_id, amount, type, status, metadata, created_at, updated_at)
      VALUES (?, ?, 'badge_purchase', 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .run(userId, amountToman, JSON.stringify(items));
    const transactionId = Number(inserted.lastInsertRowid);

    if (!merchant && !isProduction) {
      return res.json({ success: true, transactionId, amount: amountToman, devMode: true });
    }
    if (!merchant) {
      db.prepare("UPDATE transactions SET status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").run(transactionId);
      return res.status(503).json({ error: "درگاه پرداخت هنوز پیکربندی نشده است" });
    }

    const response = await axios.post(`${ZIBAL_API}/request`, {
      merchant,
      amount: amountToman * 10,
      callbackUrl: returnUrl,
      description: description || `خرید خدمات کی‌داره - TRX-${transactionId}`,
      mobile: req.user!.phone,
      orderId: String(transactionId),
    }, { headers: { "Content-Type": "application/json" }, timeout: 15000 });

    if (response.data?.result !== 100 || !response.data?.trackId) {
      db.prepare("UPDATE transactions SET status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").run(transactionId);
      logger.warn("Zibal payment request rejected", { transactionId, result: response.data?.result });
      return res.status(502).json({ error: "زیبال نتوانست درخواست پرداخت را ایجاد کند" });
    }

    const trackId = String(response.data.trackId);
    db.prepare("UPDATE transactions SET ref_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").run(trackId, transactionId);
    return res.json({ success: true, trackId, transactionId, amount: amountToman, paymentUrl: `https://gateway.zibal.ir/start/${encodeURIComponent(trackId)}` });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Zibal payment initiate error", { status: err?.response?.status, message: err?.message });
    return res.status(502).json({ error: "اتصال به درگاه پرداخت برقرار نشد؛ دوباره تلاش کنید" });
  }
});

router.post("/dev-confirm", requireAuth, (req: AuthRequest, res) => {
  if (isProduction) return res.status(403).json({ error: "Forbidden" });
  try {
    const transactionId = Number(req.body.transactionId);
    const tx = db.prepare("SELECT * FROM transactions WHERE id=? AND user_id=?").get(transactionId, req.user!.id) as any;
    if (!tx) return res.status(404).json({ error: "تراکنش یافت نشد" });
    const processed = db.transaction(() => {
      const claimed = db.prepare("UPDATE transactions SET status='success', ref_id='DEV', updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND status='pending'").run(transactionId, req.user!.id);
      if (claimed.changes !== 1) return tx.status === "success";
      const items = tx.metadata ? JSON.parse(tx.metadata) : [];
      activateBadges(req.user!.id, items);
      processReferralCommission(req.user!.id, tx.amount);
      return true;
    })();
    if (!processed) return res.status(409).json({ error: "تراکنش قبلاً پردازش شده یا قابل تأیید نیست" });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error("dev-confirm failed", { message: err?.message });
    return res.status(500).json({ error: "خطا در تأیید آزمایشی پرداخت" });
  }
});

router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { trackId, transactionId } = verifySchema.parse(req.body);
    const userId = req.user!.id;
    const tx = db.prepare("SELECT * FROM transactions WHERE id=? AND user_id=?").get(transactionId, userId) as any;
    if (!tx) return res.status(404).json({ error: "تراکنش یافت نشد" });
    if (tx.status === "success") return res.json({ success: true, message: "این تراکنش قبلاً تأیید شده است" });
    if (tx.status === "failed") return res.status(400).json({ error: "این تراکنش قبلاً ناموفق ثبت شده است" });
    if (!tx.ref_id || String(tx.ref_id) !== trackId) return res.status(400).json({ error: "کد پیگیری با تراکنش مطابقت ندارد" });

    const merchant = getZibalMerchant();
    if (!merchant) return res.status(503).json({ error: "تنظیمات درگاه زیبال موجود نیست" });

    let verified: any;
    try {
      const response = await axios.post(`${ZIBAL_API}/verify`, { merchant, trackId: Number(trackId) }, {
        headers: { "Content-Type": "application/json" }, timeout: 15000,
      });
      verified = response.data;
      if (![100, 201].includes(Number(verified?.result))) {
        logger.warn("Zibal verification rejected", { transactionId, result: verified?.result });
        return res.status(400).json({ error: "زیبال پرداخت را تأیید نکرد" });
      }
      if (Number(verified.amount) !== Number(tx.amount) * 10) {
        logger.error("Zibal amount mismatch", { transactionId });
        return res.status(400).json({ error: "مبلغ تأییدشده با مبلغ سفارش مطابقت ندارد" });
      }
    } catch (err: any) {
      logger.warn("Zibal verification request failed", { transactionId, providerStatus: err?.response?.status });
      return res.status(502).json({ error: "بررسی پرداخت از زیبال ناموفق بود؛ چند لحظه دیگر دوباره تلاش کنید" });
    }

    const processed = db.transaction(() => {
      const claimed = db.prepare("UPDATE transactions SET status='success', ref_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND status='pending' AND ref_id=?")
        .run(trackId, transactionId, userId, trackId);
      if (claimed.changes !== 1) return false;
      const items = tx.metadata ? JSON.parse(tx.metadata) : [];
      if (items.length) activateBadges(userId, items);
      processReferralCommission(userId, tx.amount);
      return true;
    })();

    if (!processed) {
      const latest = db.prepare("SELECT status FROM transactions WHERE id=? AND user_id=?").get(transactionId, userId) as any;
      if (latest?.status === "success") return res.json({ success: true, message: "این تراکنش قبلاً تأیید شده است" });
      return res.status(409).json({ error: "وضعیت تراکنش تغییر کرده است؛ وضعیت را دوباره بررسی کنید" });
    }
    return res.json({ success: true, message: "پرداخت با موفقیت تأیید شد", trackId });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Zibal verify system error", { message: err?.message });
    return res.status(500).json({ error: "خطای داخلی سیستم تأیید پرداخت" });
  }
});

router.get("/prices", (_req, res) => res.json({ prices: BADGE_PRICES, packages: PROMO_CATALOG }));
export default router;
