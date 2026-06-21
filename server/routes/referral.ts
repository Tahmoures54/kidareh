import { Router } from "express";
import db from "../db.js";
import logger from "../logger.js";
import { requireAuth, requireSellerWithStore, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const applySchema = z.object({
  code: z.string().trim().min(4, "کد ارجاع نامعتبر است").max(32, "کد ارجاع نامعتبر است"),
});

function generateCode() {
  return "KD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * دریافت یا ساخت کد ارجاع فروشگاه
 * فقط seller + store
 */
router.get("/my-code", requireAuth, requireSellerWithStore, (req: AuthRequest, res) => {
  try {
    let row = db
      .prepare(
        `SELECT code, is_active, created_at
         FROM referral_links
         WHERE owner_user_id = ?`
      )
      .get(req.user!.id) as any;

    if (!row) {
      let code = generateCode();

      // جلوگیری از برخورد کد تکراری
      let safety = 0;
      while (safety < 5) {
        const exists = db
          .prepare("SELECT id FROM referral_links WHERE code = ?")
          .get(code) as any;
        if (!exists) break;
        code = generateCode();
        safety++;
      }

      db.prepare(
        "INSERT INTO referral_links (owner_user_id, code, is_active) VALUES (?, ?, 1)"
      ).run(req.user!.id, code);

      row = { code, is_active: 1, created_at: new Date().toISOString() };
    }

    return res.json({ success: true, referral: row });
  } catch (error) {
    logger.error("Referral my-code error:", error);
    return res.status(500).json({ error: "خطا در دریافت کد ارجاع" });
  }
});

/**
 * اعمال کد ارجاع برای کاربر لاگین‌شده
 * (مالک کد باید seller باشد)
 */
router.post("/apply", requireAuth, (req: AuthRequest, res) => {
  try {
    const { code } = applySchema.parse(req.body);

    const link = db
      .prepare(
        `SELECT rl.code, rl.owner_user_id, rl.is_active, u.role as owner_role
         FROM referral_links rl
         JOIN users u ON u.id = rl.owner_user_id
         WHERE rl.code = ?`
      )
      .get(code) as any;

    if (!link || !link.is_active) {
      return res.status(404).json({ error: "کد ارجاع معتبر نیست" });
    }

    if (link.owner_role !== "seller") {
      return res.status(400).json({ error: "این کد ارجاع قابل استفاده نیست" });
    }

    if (Number(link.owner_user_id) === Number(req.user!.id)) {
      return res.status(400).json({ error: "امکان استفاده از کد ارجاع خودتان وجود ندارد" });
    }

    try {
      db.prepare(
        `INSERT INTO referral_events (referrer_user_id, referred_user_id, code, reward_amount, status)
         VALUES (?, ?, ?, 0, 'pending')`
      ).run(link.owner_user_id, req.user!.id, code);
    } catch (e: any) {
      if (String(e?.message || "").includes("UNIQUE")) {
        return res.status(409).json({ error: "برای این حساب، کد ارجاع قبلاً ثبت شده است" });
      }
      throw e;
    }

    return res.json({ success: true, message: "کد ارجاع با موفقیت ثبت شد" });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ error: error.errors?.[0]?.message || "ورودی نامعتبر است" });
    }
    logger.error("Referral apply error:", error);
    return res.status(500).json({ error: "خطا در ثبت کد ارجاع" });
  }
});

/**
 * گزارش ساده ارجاع‌های فروشگاه (اختیاری)
 */
router.get("/stats", requireAuth, requireSellerWithStore, (req: AuthRequest, res) => {
  try {
    const stats = db
      .prepare(
        `SELECT
           COUNT(*) as total_referrals,
           SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved_referrals,
           SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_referrals,
           COALESCE(SUM(CASE WHEN status='approved' THEN reward_amount ELSE 0 END),0) as total_reward
         FROM referral_events
         WHERE referrer_user_id = ?`
      )
      .get(req.user!.id);

    return res.json({ success: true, stats });
  } catch (error) {
    logger.error("Referral stats error:", error);
    return res.status(500).json({ error: "خطا در دریافت آمار ارجاع" });
  }
});

export default router;