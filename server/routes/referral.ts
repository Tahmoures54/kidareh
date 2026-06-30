// server/routes/referral.ts
import { Router, type Response } from "express";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

/* ═══════════════════════════════════════
   Schemas (اعتبارسنجی ورودی‌ها)
═══════════════════════════════════════ */
const withdrawSchema = z.object({
  amount: z.number().positive("مبلغ باید مثبت باشد"),
  iban:   z.string().trim().min(24).max(26),
});

const applySchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "کد معرف باید حداقل ۴ کاراکتر باشد")
    .max(32, "کد معرف بیش از حد طولانی است")
    .transform((v) => v.toUpperCase()),
});

const commissionSchema = z.object({
  referred_user_id: z.number().int().positive("شناسه کاربر نامعتبر است"),
  amount:           z.number().positive("مبلغ باید مثبت باشد"),
  percentage:       z.number().min(1).max(100, "درصد نامعتبر است"),
  source:           z.string().optional(),
});

/* ═══════════════════════════════════════
   Helpers (توابع کمکی)
═══════════════════════════════════════ */
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    commission: "پورسانت معرفی",
    withdrawal: "برداشت وجه",
    bonus:      "جایزه",
    refund:     "بازگشت وجه",
  };
  return map[type] || type;
}

function generateCode(): string {
  return "KD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getOrCreateCode(userId: number): string {
  const existing = db
    .prepare("SELECT code FROM referral_links WHERE owner_user_id = ?")
    .get(userId) as any;

  if (existing?.code) return existing.code;

  let code = generateCode();
  for (let i = 0; i < 5; i++) {
    if (!db.prepare("SELECT id FROM referral_links WHERE code = ?").get(code)) break;
    code = generateCode();
  }

  db.prepare(
    `INSERT INTO referral_links (owner_user_id, code, is_active, created_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)`
  ).run(userId, code);

  logger.info(`✅ Referral code created: ${code} for user ${userId}`);
  return code;
}

function getReferralPercentage(): number {
  try {
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'REFERRAL_PERCENTAGE'")
      .get() as any;
    return Number(row?.value ?? process.env.REFERRAL_PERCENTAGE ?? 10);
  } catch {
    return Number(process.env.REFERRAL_PERCENTAGE ?? 10);
  }
}

/* ═══════════════════════════════════════
   ۱. GET /api/referral/stats
   دریافت آمار جامع کیف پول و معرفی
═══════════════════════════════════════ */
router.get("/stats", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // ۱. محاسبات مربوط به کیف پول
    const wallet = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type IN ('commission','bonus') AND status = 'approved' THEN amount ELSE 0 END), 0) AS total_earned,
           COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'approved' THEN amount ELSE 0 END), 0) AS total_withdrawn,
           COALESCE(SUM(CASE WHEN type IN ('commission','bonus') AND status = 'pending' THEN amount ELSE 0 END), 0) AS pending_wallet
         FROM wallet_transactions WHERE user_id = ?`
      )
      .get(userId) as any;

    // ۲. محاسبات مربوط به معرفی‌ها
    const pendingReferral = db
      .prepare(`SELECT COALESCE(SUM(reward_amount), 0) AS pending_ref FROM referral_events WHERE referrer_user_id = ? AND status = 'pending'`)
      .get(userId) as any;

    const referredCount = db
      .prepare(`SELECT COUNT(*) AS cnt FROM referral_events WHERE referrer_user_id = ?`)
      .get(userId) as any;

    // تجمیع دیتا
    const totalEarned = Number(wallet?.total_earned ?? 0);
    const totalWithdrawn = Number(wallet?.total_withdrawn ?? 0);
    const pendingWallet = Number(wallet?.pending_wallet ?? 0);
    const pendingRef = Number(pendingReferral?.pending_ref ?? 0);
    
    const pendingCommissions = pendingWallet + pendingRef;
    const balance = totalEarned - totalWithdrawn;

    // ۳. دریافت یا تولید کد معرف برای همه نقش‌ها
    const referralCode = getOrCreateCode(Number(userId));

    return res.json({
      success: true,
      percentage: getReferralPercentage(),
      stats: {
        balance,
        totalEarned,
        totalWithdrawn,
        pendingCommissions,
        referredUsers: Number(referredCount?.cnt ?? 0),
        referralCode: referralCode,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error("Referral stats error:", err);
    return res.status(500).json({ error: "خطا در دریافت اطلاعات کیف پول و معرف" });
  }
});

/* ═══════════════════════════════════════
   ۲. GET /api/referral/transactions
   دریافت تاریخچه تراکنش‌های کیف پول
═══════════════════════════════════════ */
router.get("/transactions", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit  = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;

    const transactions = db
      .prepare(
        `SELECT id, type, amount, status, description, source, created_at
         FROM wallet_transactions
         WHERE user_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(userId, limit, offset) as any[];

    const total = (
      db.prepare("SELECT COUNT(*) AS cnt FROM wallet_transactions WHERE user_id = ?").get(userId) as any
    )?.cnt ?? 0;

    return res.json({
      success: true,
      total: Number(total),
      limit,
      offset,
      transactions: transactions.map(t => ({
        id:          t.id,
        type:        t.type,
        amount:      Number(t.amount),
        status:      t.status,
        description: t.description || null,
        source:      t.source || null,
        created_at:  t.created_at,
        title:       t.description || typeLabel(t.type),
        date:        t.created_at,
      })),
    });
  } catch (err) {
    logger.error("Transactions error:", err);
    return res.status(500).json({ error: "خطا در دریافت تراکنش‌ها" });
  }
});

/* ═══════════════════════════════════════
   ۳. POST /api/referral/withdraw
   ثبت درخواست برداشت وجه
═══════════════════════════════════════ */
router.post("/withdraw", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, iban } = withdrawSchema.parse(req.body);

    const wallet = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type IN ('commission','bonus') AND status = 'approved' THEN amount ELSE 0 END), 0) AS total_earned,
           COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'approved' THEN amount ELSE 0 END), 0) AS total_withdrawn
         FROM wallet_transactions WHERE user_id = ?`
      )
      .get(userId) as any;

    const balance = Number(wallet?.total_earned ?? 0) - Number(wallet?.total_withdrawn ?? 0);

    if (balance < amount) {
      return res.status(400).json({ error: `موجودی کافی نیست. موجودی فعلی: ${balance.toLocaleString("fa-IR")} تومان` });
    }

    const pendingWithdraw = db
      .prepare(`SELECT id FROM wallet_transactions WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending' LIMIT 1`)
      .get(userId);

    if (pendingWithdraw) {
      return res.status(400).json({ error: "یک درخواست برداشت در حال بررسی دارید. لطفاً صبر کنید." });
    }

    const result = db
      .prepare(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description, source, created_at)
         VALUES (?, 'withdrawal', ?, 'pending', ?, ?, CURRENT_TIMESTAMP)`
      )
      .run(userId, amount, `درخواست برداشت — شبا: ${iban}`, iban);

    logger.info(`💸 Withdrawal request: ${amount} by user ${userId} to IBAN ${iban}`);

    return res.status(201).json({
      success: true,
      message: "درخواست برداشت با موفقیت ثبت شد",
      transaction_id: result.lastInsertRowid,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors?.[0]?.message });
    logger.error("Withdraw error:", err);
    return res.status(500).json({ error: "خطا در ثبت درخواست برداشت" });
  }
});

/* ═══════════════════════════════════════
   ۴. POST /api/referral/apply
   اعمال کد معرف توسط کاربر جدید
═══════════════════════════════════════ */
router.post("/apply", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { code } = applySchema.parse(req.body);
    const userId = req.user!.id;

    const link = db.prepare(`SELECT owner_user_id, is_active FROM referral_links WHERE code = ?`).get(code) as any;
    if (!link || !link.is_active) return res.status(404).json({ error: "کد معرف معتبر نیست" });
    if (Number(link.owner_user_id) === Number(userId)) return res.status(400).json({ error: "امکان استفاده از کد معرف خودتان وجود ندارد" });

    const alreadyUsed = db.prepare("SELECT id FROM referral_events WHERE referred_user_id = ?").get(userId);
    if (alreadyUsed) return res.status(409).json({ error: "قبلاً از یک کد معرف استفاده کرده‌اید" });

    db.prepare(
      `INSERT INTO referral_events (referrer_user_id, referred_user_id, code, reward_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run(link.owner_user_id, userId, code);

    logger.info(`✅ Referral applied: ${code} by user ${userId}`);
    return res.json({ success: true, message: "کد معرف با موفقیت ثبت شد" });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors?.[0]?.message });
    logger.error("Referral apply error:", err);
    return res.status(500).json({ error: "خطا در ثبت کد معرف" });
  }
});

/* ═══════════════════════════════════════
   ۵. POST /api/referral/commission
   [Admin Only] ثبت پورسانت بعد از خرید
═══════════════════════════════════════ */
router.post("/commission", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") return res.status(403).json({ error: "دسترسی ندارید" });

    const { referred_user_id, amount, percentage, source } = commissionSchema.parse(req.body);

    const event = db
      .prepare(`SELECT id, referrer_user_id, status FROM referral_events WHERE referred_user_id = ? AND status IN ('pending', 'approved') LIMIT 1`)
      .get(referred_user_id) as any;

    if (!event) return res.status(404).json({ error: "رویداد ارجاع برای این کاربر یافت نشد" });

    const rewardAmount = Math.floor((amount * percentage) / 100);
    if (rewardAmount <= 0) return res.status(400).json({ error: "مبلغ پورسانت صفر است" });

    const process = db.transaction(() => {
      db.prepare(`UPDATE referral_events SET reward_amount = reward_amount + ?, status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(rewardAmount, event.id);
      db.prepare(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, description, source, created_at, updated_at)
         VALUES (?, 'commission', ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(event.referrer_user_id, rewardAmount, `پورسانت معرفی — ${source || "خرید"}`, source || "referral");
    });

    process();
    logger.info(`💰 Commission: ${rewardAmount}t → user ${event.referrer_user_id} (from user ${referred_user_id})`);

    return res.json({ success: true, reward_amount: rewardAmount, referrer_id: event.referrer_user_id });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors?.[0]?.message });
    logger.error("Commission error:", err);
    return res.status(500).json({ error: "خطا در ثبت پورسانت" });
  }
});

/* ═══════════════════════════════════════
   ۶. GET /api/referral/check/:code
   بررسی اعتبار یک کد معرف (آزاد)
═══════════════════════════════════════ */
router.get("/check/:code", (req, res: Response) => {
  try {
    const code = (req.params.code || "").trim().toUpperCase();
    if (!code || code.length < 4) return res.status(400).json({ error: "کد معرف نامعتبر است" });

    const link = db
      .prepare(`SELECT rl.code, rl.is_active, u.name AS owner_name FROM referral_links rl JOIN users u ON u.id = rl.owner_user_id WHERE rl.code = ?`)
      .get(code) as any;

    if (!link || !link.is_active) return res.status(404).json({ valid: false, error: "کد معرف یافت نشد یا غیرفعال است" });

    return res.json({ valid: true, code: link.code, owner_name: link.owner_name || "بازاریاب" });
  } catch (err) {
    logger.error("Referral check error:", err);
    return res.status(500).json({ error: "خطای سرور" });
  }
});

/* ═══════════════════════════════════════
   ۷. GET /api/referral/leaderboard
   دریافت لیست نفرات برتر بر اساس درآمد (برای گیمیفیکیشن)
═══════════════════════════════════════ */
router.get("/leaderboard", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const currentUserId = req.user!.id;

    // دریافت تاپ کاربران بر اساس مجموع درآمد تایید شده
    const topUsers = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.phone,
        COALESCE(SUM(wt.amount), 0) as total_earned,
        (SELECT COUNT(*) FROM referral_events WHERE referrer_user_id = u.id) as referred_count
      FROM users u
      LEFT JOIN wallet_transactions wt ON wt.user_id = u.id 
        AND wt.type IN ('commission', 'bonus') 
        AND wt.status = 'approved'
      WHERE u.id IN (SELECT DISTINCT referrer_user_id FROM referral_events)
      GROUP BY u.id
      HAVING total_earned > 0
      ORDER BY total_earned DESC
      LIMIT ?
    `).all(limit) as any[];

    // محافظت از حریم خصوصی (مخفی کردن بخشی از شماره موبایل) و تعیین رتبه
    const leaderboard = topUsers.map((u, index) => {
      const maskedPhone = u.phone 
        ? `${u.phone.slice(0, 4)}****${u.phone.slice(-2)}` 
        : null;
      
      return {
        rank: index + 1,
        id: u.id,
        name: u.name || maskedPhone || "کاربر کی‌داره",
        totalEarned: Number(u.total_earned),
        referredCount: Number(u.referred_count),
        isCurrentUser: Number(u.id) === Number(currentUserId)
      };
    });

    // پیدا کردن رتبه کاربر فعلی (اگر در تاپ لیست نبود)
    const currentUserRank = leaderboard.find(u => u.isCurrentUser);
    
    let myRank = null;
    if (!currentUserRank) {
      const myStats = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_earned
        FROM wallet_transactions 
        WHERE user_id = ? AND type IN ('commission', 'bonus') AND status = 'approved'
      `).get(currentUserId) as any;

      if (myStats && Number(myStats.total_earned) > 0) {
        // محاسبه اینکه چند نفر درآمد بیشتری از این کاربر دارند
        const higherRanksCount = db.prepare(`
          SELECT COUNT(DISTINCT user_id) as cnt
          FROM wallet_transactions 
          WHERE type IN ('commission', 'bonus') 
          AND status = 'approved' 
          GROUP BY user_id 
          HAVING SUM(amount) > ?
        `).all(Number(myStats.total_earned)).length;

        myRank = {
          rank: higherRanksCount + 1,
          totalEarned: Number(myStats.total_earned),
          isCurrentUser: true
        };
      }
    }

    return res.json({
      success: true,
      leaderboard,
      myRank: currentUserRank ? { rank: currentUserRank.rank, totalEarned: currentUserRank.totalEarned, isCurrentUser: true } : myRank
    });
  } catch (err) {
    logger.error("Leaderboard error:", err);
    return res.status(500).json({ error: "خطا در دریافت جدول رتبه‌بندی" });
  }
});

export default router;