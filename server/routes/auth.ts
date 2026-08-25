import { Router } from "express";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import Kavenegar from "kavenegar";
import logger from "../logger.js";
import {
  setOtp,
  verifyOtp,
  clearOtp,
  getSendRate,
  setSendRate,
  clearSendRate,
  RATE_TTL,
} from "../services/otpStore.js";

const router = Router();
const isProduction = process.env.NODE_ENV === "production";

const JWT_SECRET = process.env.JWT_SECRET;
if ((!JWT_SECRET || JWT_SECRET.length < 32) && isProduction) {
  logger.error("FATAL: JWT_SECRET is missing or too short!");
  process.exit(1);
}
const SAFE_JWT_SECRET = JWT_SECRET;
if (!SAFE_JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET is required before auth routes can start.");
  process.exit(1);
}

const KAVENEGAR_API_KEY = process.env.KAVENEGAR_API_KEY;
if (!KAVENEGAR_API_KEY && isProduction) {
  logger.error("FATAL: KAVENEGAR_API_KEY is missing!");
  process.exit(1);
}

const kavenegarApi = KAVENEGAR_API_KEY
  ? Kavenegar.KavenegarApi({ apikey: KAVENEGAR_API_KEY })
  : null;

async function sendSms(phone: string, otp: string): Promise<boolean> {
  if (!kavenegarApi) {
    logger.warn(`No Kavenegar API Key. FALLBACK OTP for ${phone}: ${otp}`);
    return false;
  }
  return new Promise((resolve) => {
    let isResolved = false;
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        logger.error(`Kavenegar Timeout for ${phone}`);
        resolve(false);
      }
    }, 10000);
    try {
      kavenegarApi.VerifyLookup(
        { receptor: phone, token: otp, template: process.env.KAVENEGAR_TEMPLATE || "verify" },
        (response: any, status: any) => {
          if (!isResolved) {
            clearTimeout(timeout);
            isResolved = true;
            if (status === 200) {
              logger.info(`SMS sent to ${phone}`);
              resolve(true);
            } else {
              logger.error(`Kavenegar Error ${phone} status=${status}`);
              resolve(false);
            }
          }
        }
      );
    } catch (error) {
      if (!isResolved) {
        clearTimeout(timeout);
        isResolved = true;
        logger.error(`Kavenegar Exception:`, error);
        resolve(false);
      }
    }
  });
}

function generateReferralCode(): string {
  return "KD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function generateUniqueCode(): string {
  let code = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    if (!db.prepare("SELECT id FROM referral_links WHERE code = ?").get(code)) break;
    code = generateReferralCode();
  }
  return code;
}

function applyReferralCode(userId: number, code: string): void {
  try {
    const link = db.prepare(`SELECT owner_user_id FROM referral_links WHERE code = ? AND is_active = 1`).get(code) as any;
    if (!link) return;
    if (Number(link.owner_user_id) === Number(userId)) return;
    const alreadyUsed = db.prepare("SELECT id FROM referral_events WHERE referred_user_id = ?").get(userId);
    if (alreadyUsed) return;
    db.prepare(`INSERT INTO referral_events (referrer_user_id, referred_user_id, code, reward_amount, status, created_at) VALUES (?, ?, ?, 0, 'pending', CURRENT_TIMESTAMP)`).run(link.owner_user_id, userId, code);
  } catch (err) {
    logger.warn("applyReferralCode error:", err);
  }
}

function createMarketerCode(userId: number): string | null {
  try {
    const existing = db.prepare("SELECT code FROM referral_links WHERE owner_user_id = ?").get(userId) as any;
    if (existing) return existing.code;
    const code = generateUniqueCode();
    db.prepare(`INSERT INTO referral_links (owner_user_id, code, is_active) VALUES (?, ?, 1)`).run(userId, code);
    return code;
  } catch (err) {
    logger.warn("createMarketerCode error:", err);
    return null;
  }
}

const phoneSchema = z.object({ phone: z.string().regex(/^09\d{9}$/, "شماره موبایل نامعتبر است") });
const verifyOtpSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل نامعتبر است"),
  code: z.string().length(5, "کد تأیید باید ۵ رقم باشد"),
});

const completeProfileSchema = z.object({
  role: z.enum(["buyer", "seller", "marketer"], { errorMap: () => ({ message: "نقش کاربری نامعتبر است" }) }),
  name: z.string().min(2).max(100),
  national_code: z.string().length(10).optional().nullable(),
  store_name: z.string().max(100).optional().nullable(),
  store_category: z.string().max(100).optional().nullable(),
  store_image: z.string().optional().nullable().transform((v) => (!v ? null : v)),
  address: z.string().max(500).optional().nullable(),
  has_business_license: z.boolean().optional(),
  license_number: z.string().max(50).optional().nullable().transform((v) => (!v ? null : v)),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  referral_code: z.string().max(32).optional().nullable(),
})
.refine((data) => {
  if (data.role === "seller" && data.has_business_license) return !!data.license_number?.trim();
  return true;
}, { message: "وارد کردن شماره جواز کسب الزامی است", path: ["license_number"] })
.refine((data) => {
  if (data.role !== "seller") return !!data.national_code && /^\d{10}$/.test(data.national_code);
  return true;
}, { message: "کد ملی معتبر (۱۰ رقمی) الزامی است", path: ["national_code"] })
.refine((data) => !!data.province && !!data.city, { message: "انتخاب استان و شهر الزامی است", path: ["city"] });

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const last = await getSendRate(phone);
    if (last && Date.now() - last < RATE_TTL * 1000) {
      return res.status(429).json({
        error: "لطفاً ۲ دقیقه صبر کنید",
        retryAfter: Math.ceil((RATE_TTL * 1000 - (Date.now() - last)) / 1000),
      });
    }
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    await setOtp(phone, otp);
    await setSendRate(phone);
    logger.info(`OTP generated for ${phone}`);
    const sent = await sendSms(phone, otp);
    if (sent) return res.json({ message: "کد تأیید ارسال شد", success: true });
    const isAdminPhone = !!process.env.ADMIN_PHONE && phone === process.env.ADMIN_PHONE;
    if (isAdminPhone) {
      return res.json({ message: "کد تأیید به ادمین ارسال نشد اما اجازه ورود صادر شد", success: true });
    }
    if (!isProduction && process.env.SHOW_OTP_IN_DEV === "true") {
      return res.json({ message: "کد تأیید (تستی) تولید شد.", success: true, otp });
    }
    return res.status(502).json({ error: "خطا در ارتباط با سامانه پیامکی. لطفاً مجدداً تلاش کنید." });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Send OTP Error:", err);
    return res.status(500).json({ error: "خطای سرور" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const isDevMode = !isProduction;
    const isTestNumber = phone === "09999999999";
    const isAdminBypass =
      !!process.env.ADMIN_PHONE &&
      !!process.env.ADMIN_BYPASS_CODE &&
      phone === process.env.ADMIN_PHONE &&
      code === process.env.ADMIN_BYPASS_CODE;

    const otpResult = await verifyOtp(phone, code);
    let isValid = otpResult.ok;

    if (!isValid && !isAdminBypass) {
      if (process.env.SHOW_OTP_IN_DEV === "true" && (isDevMode || isTestNumber) && code === "12345") {
        await clearOtp(phone);
        isValid = true;
      } else {
        return res.status(400).json({
          error: "کد تأیید اشتباه یا منقضی شده است",
          attemptsLeft: otpResult.attemptsLeft,
        });
      }
    }

    await clearOtp(phone);
    await clearSendRate(phone);

    let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
    if (!user) {
      const rc = generateReferralCode();
      const insert = db.prepare("INSERT INTO users (phone, referral_code, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(phone, rc);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(insert.lastInsertRowid);
    } else {
      db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
    }

    const MASTER_ADMIN = process.env.ADMIN_PHONE || "";
    if (phone === MASTER_ADMIN && user.role !== "admin") {
      db.prepare("UPDATE users SET role = ?, is_profile_complete = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run("admin", user.id);
      user.role = "admin";
      user.is_profile_complete = 1;
    }
    if (isAdminBypass) {
      db.prepare("UPDATE users SET role = ?, is_profile_complete = 1 WHERE id = ?").run("admin", user.id);
      user.role = "admin";
      user.is_profile_complete = 1;
    }
    if (user.is_banned) {
      return res.status(403).json({ error: "حساب کاربری شما مسدود شده است", reason: user.ban_reason || "نامشخص" });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role || "buyer" },
      SAFE_JWT_SECRET,
      { expiresIn: "60m" }
    );
    res.cookie(isProduction ? "__Host-kidareh_session" : "kidareh_session", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });
    return res.json({
      user: { ...user, is_profile_complete: !!user.is_profile_complete },
      ...(process.env.LEGACY_EXPOSE_TOKEN === "true" ? { token } : {}),
      success: true,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message });
    logger.error("Verify OTP Error:", err);
    return res.status(500).json({ error: "خطای داخلی سرور" });
  }
});

router.get("/me", requireAuth, (req: AuthRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, s.name AS store_name, s.category AS store_category, s.image_url AS store_image,
        s.address, s.has_business_license, s.license_number, s.city AS store_city, s.province AS store_province,
        s.blue_tick_expires_at, rl.code AS referral_code
      FROM users u
      LEFT JOIN stores s ON u.id = s.user_id
      LEFT JOIN referral_links rl ON u.id = rl.owner_user_id
      WHERE u.id = ?`).get(req.user!.id) as any;
    if (!user) {
      res.clearCookie(isProduction ? "__Host-kidareh_session" : "kidareh_session", { path: "/" });
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }
    if (user.is_banned) {
      res.clearCookie(isProduction ? "__Host-kidareh_session" : "kidareh_session", { path: "/" });
      return res.status(403).json({ error: "حساب شما مسدود شده است", reason: user.ban_reason });
    }
    return res.json({ user: { ...user, is_profile_complete: !!user.is_profile_complete } });
  } catch (err) {
    logger.error("Get /me error:", err);
    return res.status(500).json({ error: "خطای سرور" });
  }
});

router.post("/complete-profile", requireAuth, (req: AuthRequest, res) => {
  try {
    const raw = {
      ...req.body,
      lat: req.body.lat == null || req.body.lat === "" ? null : Number(req.body.lat),
      lng: req.body.lng == null || req.body.lng === "" ? null : Number(req.body.lng),
    };
    const validated = completeProfileSchema.parse(raw);
    const {
      role, name, national_code, store_name, store_category, store_image, address,
      has_business_license, license_number, city, province, lat, lng, referral_code,
    } = validated;
    const userId = req.user!.id;
    const finalLicenseNumber = has_business_license ? license_number || null : null;
    const transaction = db.transaction(() => {
      db.prepare(`UPDATE users SET role = ?, name = ?, national_code = ?, province = ?, city = ?, is_profile_complete = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(role, name, national_code || null, province || null, city || null, userId);
      if (role === "seller") {
        const existing = db.prepare("SELECT id FROM stores WHERE user_id = ?").get(userId) as any;
        if (existing) {
          db.prepare(`UPDATE stores SET name = ?, category = ?, address = ?, image_url = ?, has_business_license = ?, license_number = ?, city = ?, province = ?, lat = ?, lng = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`)
            .run(store_name || null, store_category || null, address || null, store_image || null, has_business_license ? 1 : 0, finalLicenseNumber, city || null, province || null, lat ?? null, lng ?? null, userId);
        } else {
          db.prepare(`INSERT INTO stores (user_id, name, category, address, image_url, has_business_license, license_number, city, province, lat, lng, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
            .run(userId, store_name || null, store_category || null, address || null, store_image || null, has_business_license ? 1 : 0, finalLicenseNumber, city || null, province || null, lat ?? null, lng ?? null);
        }
      }
      if (role === "marketer") createMarketerCode(userId);
      if (role === "seller" && referral_code?.trim()) applyReferralCode(userId, referral_code.trim().toUpperCase());
    });
    transaction();
    const updatedUser = db.prepare(`SELECT u.*, s.name AS store_name, s.category AS store_category, s.image_url AS store_image, s.has_business_license, s.license_number, s.city AS store_city, s.province AS store_province, rl.code AS referral_code FROM users u LEFT JOIN stores s ON u.id = s.user_id LEFT JOIN referral_links rl ON u.id = rl.owner_user_id WHERE u.id = ?`).get(userId) as any;
    return res.json({ user: { ...updatedUser, is_profile_complete: !!updatedUser.is_profile_complete }, success: true });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0].message, field: err.errors[0].path[0] });
    logger.error("Complete Profile Error:", err);
    return res.status(500).json({ error: "خطای داخلی سرور" });
  }
});

router.post("/logout", (_req, res) => {
  const cookieName = isProduction ? "__Host-kidareh_session" : "kidareh_session";
  res.clearCookie(cookieName, { path: "/" });
  res.setHeader("Clear-Site-Data", '"cache", "storage"');
  return res.json({ success: true });
});

router.post("/refresh", requireAuth, (req: AuthRequest, res) => {
  try {
    const newToken = jwt.sign(
      { id: req.user!.id, phone: req.user!.phone, role: req.user!.role },
      SAFE_JWT_SECRET,
      { expiresIn: "60m" }
    );
    const cookieName = isProduction ? "__Host-kidareh_session" : "kidareh_session";
    res.cookie(cookieName, newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });
    return res.json({ success: true });
  } catch (err) {
    logger.error("Refresh token error:", err);
    return res.status(500).json({ error: "خطای سرور" });
  }
});

export default router;
