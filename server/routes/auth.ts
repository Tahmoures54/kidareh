import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import Kavenegar from 'kavenegar';
import logger from '../logger.js';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// ==========================================
// 1. Environment Validation
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (isProduction) {
    logger.error("FATAL: JWT_SECRET is missing or too short!");
    process.exit(1);
  } else {
    logger.warn("⚠️  Using unsafe development JWT_SECRET");
  }
}
const SAFE_JWT_SECRET = JWT_SECRET || 'your-super-secret-key-min-32-characters-@#$%';

// ==========================================
// 2. Kavenegar Setup
// ==========================================
const KAVENEGAR_API_KEY = process.env.KAVENEGAR_API_KEY;
if (!KAVENEGAR_API_KEY && isProduction) {
  logger.error("FATAL: KAVENEGAR_API_KEY is missing!");
  process.exit(1);
}

const kavenegarApi = KAVENEGAR_API_KEY ? Kavenegar.KavenegarApi({
  apikey: KAVENEGAR_API_KEY
}) : null;

// ==========================================
// 3. OTP Store (با TTL و Cleanup)
// ==========================================
interface OTPData {
  code: string;
  createdAt: number;
  attempts: number;
}

const otpStore = new Map<string, OTPData>();
const rateLimitStore = new Map<string, number>();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  const expired = Array.from(otpStore.entries())
    .filter(([_, data]) => now - data.createdAt > 5 * 60 * 1000);
  
  expired.forEach(([phone]) => {
    otpStore.delete(phone);
    logger.debug(`🗑️  Cleaned expired OTP for ${phone}`);
  });
}, 5 * 60 * 1000);

function setOtpWithExpiry(phone: string, otp: string) {
  otpStore.set(phone, { 
    code: otp, 
    createdAt: Date.now(),
    attempts: 0 
  });
  
  // Auto-delete after 5 minutes
  setTimeout(() => {
    const data = otpStore.get(phone);
    if (data && data.code === otp) {
      otpStore.delete(phone);
    }
  }, 5 * 60 * 1000);
}

function verifyOtp(phone: string, code: string): boolean {
  const data = otpStore.get(phone);
  if (!data) return false;

  // Check expiry
  if (Date.now() - data.createdAt > 5 * 60 * 1000) {
    otpStore.delete(phone);
    return false;
  }

  // Check attempts (max 3)
  if (data.attempts >= 3) {
    otpStore.delete(phone);
    return false;
  }

  // Increment attempts
  data.attempts++;

  return data.code === code;
}

// ==========================================
// 4. SMS Helper
// ==========================================
async function sendSmsViaKavenegar(phone: string, otp: string): Promise<boolean> {
  if (!kavenegarApi) {
    logger.warn(`📱 No Kavenegar API - OTP for ${phone}: ${otp}`);
    return false;
  }

  return new Promise((resolve) => {
    kavenegarApi.VerifyLookup({
      receptor: phone,
      token: otp,
      template: process.env.KAVENEGAR_TEMPLATE || 'verify'
    }, (response: any, status: any) => {
      if (status === 200) {
        logger.info(`✅ SMS sent to ${phone}`);
        resolve(true);
      } else {
        logger.error(`❌ Kavenegar failed for ${phone}. Status: ${status}`, response);
        resolve(false);
      }
    });
  });
}

// ==========================================
// 5. Validation Schemas
// ==========================================
const phoneSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است'),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است'),
  code: z.string().length(5, 'کد تایید باید ۵ رقم باشد')
});

const completeProfileSchema = z.object({
  role: z.enum(['buyer', 'seller'], { 
    errorMap: () => ({ message: 'نقش کاربری نامعتبر است' }) 
  }),
  name: z.string()
    .min(2, 'نام باید حداقل ۲ حرف باشد')
    .max(100, 'نام بیش از حد طولانی است'),
  store_name: z.string().max(100).optional().nullable(),
  store_category: z.string().max(100).optional().nullable(),
  store_image: z.string().url().optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  has_business_license: z.boolean().optional(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
});

// ==========================================
// 6. Routes
// ==========================================

/** Send OTP */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = phoneSchema.parse(req.body);

    // Rate limiting
    const lastRequest = rateLimitStore.get(phone);
    if (lastRequest && Date.now() - lastRequest < 2 * 60 * 1000) {
      return res.status(429).json({
        error: 'لطفاً ۲ دقیقه صبر کنید',
        retryAfter: Math.ceil((2 * 60 * 1000 - (Date.now() - lastRequest)) / 1000)
      });
    }

    // Generate OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    setOtpWithExpiry(phone, otp);
    rateLimitStore.set(phone, Date.now());

    logger.info(`🔐 OTP generated for ${phone}`);

    // Send SMS
    const smsSent = await sendSmsViaKavenegar(phone, otp);

    if (smsSent) {
      return res.json({ 
        message: 'کد تایید ارسال شد', 
        success: true 
      });
    }

    // Development fallback
    if (!isProduction) {
      logger.debug(`📲 [DEV] OTP for ${phone}: ${otp}`);
      return res.json({
        message: 'کد تایید (تستی) تولید شد',
        success: true,
        ...(process.env.SHOW_OTP_IN_DEV === 'true' && { otp }) // خطرناک! فقط در dev
      });
    }

    return res.status(502).json({ 
      error: 'خطا در ارسال پیامک. لطفاً مجدداً تلاش کنید.' 
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: error.errors[0].message 
      });
    }
    logger.error('Send OTP Error:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

/** Verify OTP */
router.post('/verify-otp', (req, res) => {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body);

    // Special cases
    const isTestNumber = phone === '09999999999';
    const isDevMode = !isProduction;
    const isAdminBypass =
  process.env.NODE_ENV !== "production" &&
  !!process.env.ADMIN_PHONE &&
  !!process.env.ADMIN_BYPASS_CODE &&
  phone === process.env.ADMIN_PHONE &&
  code === process.env.ADMIN_BYPASS_CODE;

    // Verify OTP
    const isValid = verifyOtp(phone, code);

    if (!isValid && !isAdminBypass) {
      if ((isDevMode || isTestNumber) && (code === '12345' || code === '50550')) {
        // Test codes allowed in dev
      } else {
        return res.status(400).json({ 
          error: 'کد تایید اشتباه یا منقضی شده است',
          attemptsLeft: 3 - (otpStore.get(phone)?.attempts || 0)
        });
      }
    }

    // Clear OTP
    otpStore.delete(phone);
    rateLimitStore.delete(phone);

    // Get or create user
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
    
    if (!user) {
      const referralCode = 'KD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const result = db.prepare(`
        INSERT INTO users (phone, referral_code, created_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(phone, referralCode);
      
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      logger.info(`✨ New user created: ${phone}`);
    } else {
      db.prepare(`
        UPDATE users 
        SET last_login_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(user.id);
    }

    // Admin bypass
    if (isAdminBypass) {
      db.prepare(`
        UPDATE users 
        SET role = 'admin', is_profile_complete = 1 
        WHERE id = ?
      `).run(user.id);
      user.role = 'admin';
      user.is_profile_complete = 1;
      logger.info(`🔑 Admin access granted for ${phone}`);
    }

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({
        error: 'حساب کاربری شما مسدود شده است',
        reason: user.ban_reason || 'نامشخص'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        role: user.role || 'buyer'
      },
      SAFE_JWT_SECRET,
      { expiresIn: '30d' } // 30 days
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    logger.info(`✅ User logged in: ${phone}`);

    res.json({ 
      user: {
        ...user,
        is_profile_complete: !!user.is_profile_complete
      },
      token, // برای استفاده در فرانت
      success: true 
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: error.errors[0].message 
      });
    }
    logger.error('Verify OTP Error:', error);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  }
});

/** Get Current User */
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT 
        u.*,
        s.name as store_name,
        s.category as store_category,
        s.image_url as store_image,
        s.address,
        s.has_business_license,
        s.city as store_city,
        s.province as store_province
      FROM users u 
      LEFT JOIN stores s ON u.id = s.user_id 
      WHERE u.id = ?
    `).get(req.user!.id) as any;

    if (!user) {
      res.clearCookie('token');
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    // Check ban
    if (user.is_banned) {
      res.clearCookie('token');
      return res.status(403).json({ 
        error: 'حساب شما مسدود شده است',
        reason: user.ban_reason 
      });
    }

    res.json({ 
      user: {
        ...user,
        is_profile_complete: !!user.is_profile_complete
      }
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

/** Complete Profile */
router.post('/complete-profile', requireAuth, (req: AuthRequest, res) => {
  try {
    const validatedData = completeProfileSchema.parse(req.body);
    const { 
      role, name, store_name, store_category, 
      store_image, address, has_business_license, 
      city, province 
    } = validatedData;
    
    const userId = req.user!.id;

    const transaction = db.transaction(() => {
      // Update user
      db.prepare(`
        UPDATE users 
        SET role = ?, name = ?, is_profile_complete = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(role, name, userId);

      // Create/Update store for sellers
      if (role === 'seller') {
        const existingStore = db.prepare('SELECT id FROM stores WHERE user_id = ?').get(userId) as any;
        
        if (existingStore) {
          db.prepare(`
            UPDATE stores 
            SET name = ?, category = ?, address = ?, image_url = ?, 
                has_business_license = ?, city = ?, province = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `).run(
            store_name || null,
            store_category || null,
            address || null,
            store_image || null,
            has_business_license ? 1 : 0,
            city || null,
            province || null,
            userId
          );
        } else {
          db.prepare(`
            INSERT INTO stores (
              user_id, name, category, address, image_url, 
              has_business_license, city, province, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            userId,
            store_name || null,
            store_category || null,
            address || null,
            store_image || null,
            has_business_license ? 1 : 0,
            city || null,
            province || null
          );
        }
      }
    });

    transaction();

    // Get updated user
    const updatedUser = db.prepare(`
      SELECT u.*, s.name as store_name, s.category as store_category
      FROM users u 
      LEFT JOIN stores s ON u.id = s.user_id 
      WHERE u.id = ?
    `).get(userId) as any;

    logger.info(`✅ Profile completed for user ${userId}`);

    res.json({ 
      user: {
        ...updatedUser,
        is_profile_complete: !!updatedUser.is_profile_complete
      },
      success: true 
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: error.errors[0].message,
        field: error.errors[0].path[0]
      });
    }
    logger.error('Complete Profile Error:', error);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  }
});

/** Logout */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
  });
  
  logger.info('👋 User logged out');
  res.json({ success: true });
});

/** Refresh Token (اختیاری - برای آینده) */
router.post('/refresh', requireAuth, (req: AuthRequest, res) => {
  try {
    const newToken = jwt.sign(
      { 
        id: req.user!.id, 
        phone: req.user!.phone, 
        role: req.user!.role 
      },
      SAFE_JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({ token: newToken, success: true });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;