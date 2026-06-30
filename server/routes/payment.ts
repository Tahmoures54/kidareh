import express from "express";
import axios   from "axios";
import { z }   from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import db     from "../db.js";
import logger from "../logger.js";

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";

/* ══════════════════════════════════════════
   منبع معتبر قیمت‌ها (بسیار مهم ⚠️)
   مقادیر و آیدی‌های زیر را دقیقاً با فایل 
   BADGES_LIST در فرانت‌اند خود هماهنگ کنید!
══════════════════════════════════════════ */
const BADGE_PRICES: Record<string, number> = {
  // مثال:
  "تیک آبی فروشگاه": 50000,
  "نشان ویژه": 25000,
  "ارسال فوری": 10000,
  "تضمین کیفیت": 15000,
  // TODO: آیدی‌ها و قیمت‌های واقعی پروژه خود را اینجا وارد کنید
};

/* ══════════════════════════════════════════
   جداول مورد نیاز
══════════════════════════════════════════ */
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      amount      INTEGER NOT NULL,
      type        TEXT    NOT NULL DEFAULT 'badge_purchase',
      status      TEXT    NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','success','failed')),
      ref_id      TEXT,
      metadata    TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* wallet_transactions برای کیف پول بازاریاب */
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      type        TEXT    NOT NULL
                          CHECK(type IN ('commission','withdrawal','bonus','refund')),
      amount      REAL    NOT NULL DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','approved','settled','rejected')),
      description TEXT,
      source      TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* badge_inventory برای ردیابی نشان‌ها */
  db.exec(`
    CREATE TABLE IF NOT EXISTS badge_inventory (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      badge_name  TEXT    NOT NULL,
      quantity    INTEGER NOT NULL DEFAULT 0,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_name)
    )
  `);

  /* ایندکس‌ها */
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_wallet_user         ON wallet_transactions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_badge_inv_user      ON badge_inventory(user_id);
  `);
} catch (e: any) {
  logger.error("DB init error in payment.ts:", e.message);
}

/* safe migration */
for (const sql of [
  "ALTER TABLE transactions ADD COLUMN metadata   TEXT",
  "ALTER TABLE transactions ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP",
]) {
  try { db.exec(sql); } catch {}
}

/* ══════════════════════════════════════════
   Helpers
══════════════════════════════════════════ */
function getPaypingToken(): string {
  try {
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'PAYPING_TOKEN'")
      .get() as any;
    if (row?.value) return String(row.value);
  } catch {}
  const token = process.env.PAYPING_TOKEN || "";
  if (!token && isProduction) logger.error("CRITICAL: PAYPING_TOKEN missing!");
  return token;
}

/**
 * بعد از پرداخت موفق، پورسانت رفرال را ثبت می‌کند
 */
function processReferralCommission(
  referredUserId: number,
  purchaseAmount: number
): void {
  try {
    const event = db
      .prepare(
        `SELECT re.id, re.referrer_user_id
         FROM referral_events re
         WHERE re.referred_user_id = ?
           AND re.status IN ('pending', 'approved')
         LIMIT 1`
      )
      .get(referredUserId) as any;

    if (!event) return;

    const settingRow = db
      .prepare("SELECT value FROM settings WHERE key = 'REFERRAL_PERCENTAGE'")
      .get() as any;
    const percentage = Number(settingRow?.value ?? 10);

    const reward = Math.floor((purchaseAmount * percentage) / 100);
    if (reward <= 0) return;

    db.prepare(
      `UPDATE referral_events
       SET reward_amount = reward_amount + ?,
           status        = 'approved',
           updated_at    = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(reward, event.id);

    db.prepare(
      `INSERT INTO wallet_transactions
         (user_id, type, amount, status, description, source, created_at)
       VALUES (?, 'commission', ?, 'pending', ?, 'referral', CURRENT_TIMESTAMP)`
    ).run(
      event.referrer_user_id,
      reward,
      `پورسانت معرفی — خرید ${purchaseAmount.toLocaleString("fa-IR")} تومان`
    );

    logger.info(
      `💰 Commission: ${reward}t → user ${event.referrer_user_id} (from ${referredUserId})`
    );
  } catch (err) {
    logger.error("processReferralCommission error:", err);
  }
}

/**
 * نشان‌های خریداری‌شده را فعال می‌کند
 */
function activateBadges(
  userId:   number,
  items:    Array<{ badgeId: string; qty: number }>,
  settings: Record<string, any>
): void {
  for (const item of items) {
    const { badgeId, qty } = item;

    if (badgeId === "تیک آبی فروشگاه") {
      const store = db
        .prepare("SELECT id, blue_tick_expires_at FROM stores WHERE user_id = ?")
        .get(userId) as any;

      if (!store) {
        logger.warn(`Blue tick purchase: no store for user ${userId}`);
        continue;
      }

      const durationDays = Number(settings["BLUE_TICK_DAYS"] ?? 30) * qty;
      const base = store.blue_tick_expires_at
        ? new Date(store.blue_tick_expires_at)
        : new Date();
      if (base < new Date()) base.setTime(Date.now());
      base.setDate(base.getDate() + durationDays);

      db.prepare(
        `UPDATE stores
         SET blue_tick_expires_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(base.toISOString(), store.id);

      logger.info(`✅ Blue tick +${durationDays}d for store ${store.id}`);
      continue;
    }

    db.prepare(
      `INSERT INTO badge_inventory (user_id, badge_name, quantity, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, badge_name)
       DO UPDATE SET
         quantity   = quantity + excluded.quantity,
         updated_at = CURRENT_TIMESTAMP`
    ).run(userId, badgeId, qty);

    logger.info(`🏷️ Badge +${qty} "${badgeId}" for user ${userId}`);
  }
}

/* ══════════════════════════════════════════
   Schemas
══════════════════════════════════════════ */
const initiateSchema = z.object({
  // amount حذف شد، چون نباید به کلاینت اعتماد کنیم!
  description: z.string().optional(),
  returnUrl:   z.string().url("آدرس بازگشت نامعتبر است"),
  items: z
    .array(
      z.object({
        badgeId:   z.string(),
        qty:       z.number().int().positive(),
        // unitPrice حذف شد
      })
    )
    .min(1, "حداقل یک نشان باید انتخاب شود"),
});

const verifySchema = z.object({
  refId:         z.string({ required_error: "کد پیگیری درگاه الزامی است" }),
  transactionId: z.number({ required_error: "شناسه تراکنش الزامی است" }),
});

/* ══════════════════════════════════════════
   ۱. POST /api/payment/initiate
══════════════════════════════════════════ */
router.post("/initiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { description, returnUrl, items } = initiateSchema.parse(req.body);

    const userId = req.user!.id;
    const token  = getPaypingToken();

    // محاسبه امن قیمت نهایی سمت سرور
    let calculatedAmount = 0;
    for (const item of items) {
      const price = BADGE_PRICES[item.badgeId];
      if (price === undefined) {
        return res.status(400).json({ error: `نشان نامعتبر یا غیرقابل خرید: ${item.badgeId}` });
      }
      calculatedAmount += price * item.qty;
    }

    if (calculatedAmount < 5000 || calculatedAmount > 50000000) {
       return res.status(400).json({ error: "مبلغ محاسبه شده در بازه مجاز (۵ هزار تا ۵۰ میلیون تومان) نیست." });
    }

    /* ثبت تراکنش pending با مبلغ محاسبه شده */
    const result = db
      .prepare(
        `INSERT INTO transactions
           (user_id, amount, type, status, metadata, created_at, updated_at)
         VALUES (?, ?, 'badge_purchase', 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(userId, calculatedAmount, JSON.stringify(items));

    const transactionId = result.lastInsertRowid as number;
    const clientRefId   = `TRX-${transactionId}`;

    /* ارسال به PayPing */
    const ppRes = await axios.post(
      "https://api.payping.ir/v2/pay",
      {
        amount:        calculatedAmount * 10,  // تومان → ریال
        payerIdentity: req.user!.phone,
        payerName:     req.user!.name || "کاربر کی‌داره",
        description:   description || `خرید نشان — ${clientRefId}`,
        returnUrl,
        clientRefId,
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    );

    return res.json({
      success:       true,
      code:          ppRes.data.code,
      transactionId,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0].message });
    }
    logger.error("Payment initiate error:", err.response?.data || err.message);
    return res.status(500).json({ error: "خطا در اتصال به درگاه پرداخت" });
  }
});

/* ══════════════════════════════════════════
   ۲. POST /api/payment/verify
══════════════════════════════════════════ */
router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { refId, transactionId } = verifySchema.parse(req.body);
    const userId = req.user!.id;
    const token  = getPaypingToken();

    /* پیدا کردن تراکنش */
    const tx = db
      .prepare(
        `SELECT * FROM transactions
         WHERE id = ? AND user_id = ?`
      )
      .get(transactionId, userId) as any;

    if (!tx) {
      return res.status(404).json({ error: "تراکنش یافت نشد" });
    }

    if (tx.status === "success") {
      return res.json({
        success: true,
        message: "این تراکنش قبلاً تأیید شده است",
      });
    }

    if (tx.status === "failed") {
      return res.status(400).json({
        error: "این تراکنش قبلاً ناموفق ثبت شده است",
      });
    }

    /* تأیید با PayPing بر اساس مبلغی که سرور ذخیره کرده بود */
    try {
      await axios.post(
        "https://api.payping.ir/v2/pay/verify",
        {
          refId,
          amount: tx.amount * 10,
        },
        {
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15_000,
        }
      );
    } catch (ppErr: any) {
      db.prepare(
        `UPDATE transactions
         SET status = 'failed', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(transactionId);

      logger.error(
        "PayPing verify failed:",
        ppErr.response?.data || ppErr.message
      );

      return res.status(400).json({
        error:   "تراکنش توسط درگاه تأیید نشد",
        details: ppErr.response?.data,
      });
    }

    /* دریافت تنظیمات یک‌بار */
    const settingsRows = db
      .prepare("SELECT key, value FROM settings")
      .all() as any[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) settings[row.key] = row.value;

    /* تراکنش DB */
    const process = db.transaction(() => {
      db.prepare(
        `UPDATE transactions
         SET status = 'success', ref_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(refId, transactionId);

      const items = tx.metadata ? JSON.parse(tx.metadata) : [];
      if (items.length > 0) {
        activateBadges(userId, items, settings);
      }

      processReferralCommission(userId, tx.amount);
    });

    process();

    logger.info(
      `✅ Payment verified: TRX-${transactionId} user ${userId} amount ${tx.amount}t`
    );

    return res.json({
      success: true,
      message: "پرداخت با موفقیت تأیید شد",
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0].message });
    }
    logger.error("Payment verify system error:", err.message);
    return res.status(500).json({ error: "خطای داخلی سیستم تأیید پرداخت" });
  }
});

export default router;