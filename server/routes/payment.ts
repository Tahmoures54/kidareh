import express from "express";
import axios from "axios";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import db from "../db.js";
import logger from "../logger.js";
import {
  PROMO_CATALOG,
  getPackage,
  activatePromotionPackage,
  ensurePromotionTables,
} from "../services/promotions.js";

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";

try {
  ensurePromotionTables();
} catch {}

/** Legacy badge names + new package ids */
const BADGE_PRICES: Record<string, number> = {
  "تیک آبی فروشگاه": 79000,
  "نشان ویژه": 49000,
  "ارسال فوری": 10000,
  "تضمین کیفیت": 15000,
};

// merge catalog prices
for (const p of PROMO_CATALOG) {
  BADGE_PRICES[p.id] = p.price;
  BADGE_PRICES[p.name] = p.price;
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'badge_purchase',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
      ref_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS badge_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      badge_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_name)
    );
  `);
} catch (e: any) {
  logger.error("DB init error in payment.ts:", e.message);
}

function getPaypingToken(): string {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'PAYPING_TOKEN'").get() as any;
    if (row?.value) return String(row.value);
  } catch {}
  return process.env.PAYPING_TOKEN || "";
}

function processReferralCommission(referredUserId: number, purchaseAmount: number): void {
  try {
    const event = db
      .prepare(
        `SELECT re.id, re.referrer_user_id FROM referral_events re
         WHERE re.referred_user_id = ? AND re.status IN ('pending','approved') LIMIT 1`
      )
      .get(referredUserId) as any;
    if (!event) return;
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'REFERRAL_PERCENTAGE'").get() as any;
    const percentage = Number(settingRow?.value ?? 10);
    const reward = Math.floor((purchaseAmount * percentage) / 100);
    if (reward <= 0) return;
    db.prepare(
      `UPDATE referral_events SET reward_amount = reward_amount + ?, status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(reward, event.id);
    db.prepare(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description, source, created_at)
       VALUES (?, 'commission', ?, 'pending', ?, 'referral', CURRENT_TIMESTAMP)`
    ).run(event.referrer_user_id, reward, `پورسانت معرفی — خرید ${purchaseAmount.toLocaleString("fa-IR")} تومان`);
  } catch (err) {
    logger.error("processReferralCommission error:", err);
  }
}

function activateBadges(
  userId: number,
  items: Array<{ badgeId: string; qty: number }>,
  settings: Record<string, any>
): void {
  for (const item of items) {
    const { badgeId, qty } = item;

    // New promotion packages (psych-driven catalog)
    const pkg = getPackage(badgeId);
    if (pkg) {
      for (let i = 0; i < qty; i++) {
        const r = activatePromotionPackage(userId, badgeId);
        if (!r.ok) logger.warn(`activate package ${badgeId}: ${r.error}`);
      }
      continue;
    }

    if (badgeId === "تیک آبی فروشگاه" || badgeId === "blue_tick_30d") {
      activatePromotionPackage(userId, "blue_tick_30d");
      continue;
    }

    if (badgeId === "نشان ویژه") {
      activatePromotionPackage(userId, qty >= 4 ? "search_boost_30d" : "search_boost_7d");
      continue;
    }

    db.prepare(
      `INSERT INTO badge_inventory (user_id, badge_name, quantity, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, badge_name) DO UPDATE SET
         quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP`
    ).run(userId, badgeId, qty);
  }
}

const initiateSchema = z.object({
  description: z.string().optional(),
  returnUrl: z.string().url("آدرس بازگشت نامعتبر است"),
  items: z
    .array(z.object({ badgeId: z.string(), qty: z.number().int().positive() }))
    .min(1, "حداقل یک مورد باید انتخاب شود"),
});

const verifySchema = z.object({
  refId: z.string({ required_error: "کد پیگیری درگاه الزامی است" }),
  transactionId: z.number({ required_error: "شناسه تراکنش الزامی است" }),
});

router.post("/initiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { description, returnUrl, items } = initiateSchema.parse(req.body);
    const userId = req.user!.id;
    const token = getPaypingToken();

    let calculatedAmount = 0;
    for (const item of items) {
      const price = BADGE_PRICES[item.badgeId];
      if (price === undefined) {
        return res.status(400).json({ error: `آیتم نامعتبر: ${item.badgeId}` });
      }
      calculatedAmount += price * item.qty;
    }

    if (calculatedAmount < 1000 || calculatedAmount > 50000000) {
      return res.status(400).json({ error: "مبلغ خارج از بازه مجاز است" });
    }

    const result = db
      .prepare(
        `INSERT INTO transactions (user_id, amount, type, status, metadata, created_at, updated_at)
         VALUES (?, ?, 'badge_purchase', 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(userId, calculatedAmount, JSON.stringify(items));

    const transactionId = result.lastInsertRowid as number;
    const clientRefId = `TRX-${transactionId}`;

    if (!token && !isProduction) {
      // Dev bypass: mark success path for local testing without PayPing
      return res.json({
        success: true,
        code: "DEV-SKIP",
        transactionId,
        amount: calculatedAmount,
        devMode: true,
      });
    }

    const ppRes = await axios.post(
      "https://api.payping.ir/v2/pay",
      {
        amount: calculatedAmount * 10,
        payerIdentity: req.user!.phone,
        payerName: req.user!.name || "کاربر کی‌داره",
        description: description || `خرید پروموشن — ${clientRefId}`,
        returnUrl,
        clientRefId,
      },
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: 15_000,
      }
    );

    return res.json({ success: true, code: ppRes.data.code, transactionId, amount: calculatedAmount });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Payment initiate error:", err.response?.data || err.message);
    return res.status(500).json({ error: "خطا در اتصال به درگاه پرداخت" });
  }
});

/** Dev-only confirm without gateway */
router.post("/dev-confirm", requireAuth, (req: AuthRequest, res) => {
  if (isProduction) return res.status(403).json({ error: "Forbidden" });
  try {
    const transactionId = Number(req.body.transactionId);
    const tx = db.prepare(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`).get(transactionId, req.user!.id) as any;
    if (!tx) return res.status(404).json({ error: "تراکنش یافت نشد" });
    if (tx.status === "success") return res.json({ success: true, message: "قبلاً تأیید شده" });

    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) settings[row.key] = row.value;

    db.transaction(() => {
      db.prepare(`UPDATE transactions SET status = 'success', ref_id = 'DEV', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(transactionId);
      const items = tx.metadata ? JSON.parse(tx.metadata) : [];
      if (items.length) activateBadges(req.user!.id, items, settings);
      processReferralCommission(req.user!.id, tx.amount);
    })();

    return res.json({ success: true, message: "فعال‌سازی آزمایشی انجام شد" });
  } catch (err: any) {
    logger.error("dev-confirm:", err);
    return res.status(500).json({ error: "خطا" });
  }
});

router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { refId, transactionId } = verifySchema.parse(req.body);
    const userId = req.user!.id;
    const token = getPaypingToken();

    const tx = db.prepare(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`).get(transactionId, userId) as any;
    if (!tx) return res.status(404).json({ error: "تراکنش یافت نشد" });
    if (tx.status === "success") return res.json({ success: true, message: "این تراکنش قبلاً تأیید شده است" });
    if (tx.status === "failed") return res.status(400).json({ error: "این تراکنش قبلاً ناموفق ثبت شده است" });

    try {
      await axios.post(
        "https://api.payping.ir/v2/pay/verify",
        { refId, amount: tx.amount * 10 },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 15_000 }
      );
    } catch (ppErr: any) {
      db.prepare(`UPDATE transactions SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(transactionId);
      return res.status(400).json({ error: "تراکنش توسط درگاه تأیید نشد", details: ppErr.response?.data });
    }

    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) settings[row.key] = row.value;

    db.transaction(() => {
      db.prepare(`UPDATE transactions SET status = 'success', ref_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(refId, transactionId);
      const items = tx.metadata ? JSON.parse(tx.metadata) : [];
      if (items.length > 0) activateBadges(userId, items, settings);
      processReferralCommission(userId, tx.amount);
    })();

    return res.json({ success: true, message: "پرداخت با موفقیت تأیید شد" });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Payment verify system error:", err.message);
    return res.status(500).json({ error: "خطای داخلی سیستم تأیید پرداخت" });
  }
});

/** Prices for frontend */
router.get("/prices", (_req, res) => {
  res.json({ prices: BADGE_PRICES, packages: PROMO_CATALOG });
});

export default router;
