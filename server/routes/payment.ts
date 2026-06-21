import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';
import logger from '../logger.js';

const router = express.Router();

// ساخت خودکار جدول تراکنش‌ها (اگر وجود نداشت)
// این کار برای امنیت پرداخت الزامی است
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'wallet_charge',
      status TEXT DEFAULT 'pending',
      ref_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
} catch (e) {
  logger.error("Failed to create transactions table", e);
}

// دریافت توکن پی‌پینگ (با اولویت دیتابیس سپس ENV)
const getPaypingToken = () => {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'PAYPING_TOKEN'").get() as any;
    if (row && row.value) return row.value;
  } catch (e) {}
  
  const token = process.env.PAYPING_TOKEN;
  if (!token && process.env.NODE_ENV === 'production') {
    logger.error("CRITICAL: PAYPING_TOKEN is missing!");
  }
  return token || ''; // در حالت تست ممکن است خالی باشد
};

// ==========================================
// 1. Initiate Payment (شروع پرداخت)
// ==========================================
const initiateSchema = z.object({
  amount: z.number().min(5000, "حداقل مبلغ ۵,۰۰۰ تومان است").max(50000000, "حداکثر مبلغ مجاز ۵۰ میلیون تومان است"),
  description: z.string().optional(),
  returnUrl: z.string().url("آدرس بازگشت نامعتبر است")
});

router.post('/initiate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { amount, description, returnUrl } = initiateSchema.parse(req.body);
    const userId = req.user!.id;
    const token = getPaypingToken();

    // 1. ثبت تراکنش در دیتابیس با وضعیت pending (امنیت اصلی)
    const insertResult = db.prepare(`
      INSERT INTO transactions (user_id, amount, status) 
      VALUES (?, ?, 'pending')
    `).run(userId, amount);
    
    const transactionId = insertResult.lastInsertRowid;
    // کدی که به درگاه می‌فرستیم تا موقع برگشت بدانیم کدام تراکنش است
    const clientRefId = `TRX-${transactionId}`; 

    // 2. ارسال درخواست به پی‌پینگ
    const response = await axios.post(
      'https://api.payping.ir/v2/pay',
      {
        amount: amount * 10, // تبدیل تومان به ریال برای پی‌پینگ
        payerIdentity: req.user!.phone,
        payerName: req.user!.name || 'کاربر کی‌داره',
        description: description || `شارژ کیف پول - تراکنش ${transactionId}`,
        returnUrl: returnUrl,
        clientRefId: clientRefId 
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ 
      success: true, 
      code: response.data.code,
      transactionId: transactionId
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('Payment Initiation Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'خطا در اتصال به درگاه پرداخت' });
  }
});

// ==========================================
// 2. Verify Payment (تایید پرداخت)
// ==========================================
const verifySchema = z.object({
  refId: z.string({ required_error: "کد پیگیری درگاه الزامی است" }),
  transactionId: z.number({ required_error: "شناسه تراکنش داخلی الزامی است" })
});

router.post('/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { refId, transactionId } = verifySchema.parse(req.body);
    const userId = req.user!.id;
    const token = getPaypingToken();

    // 1. استخراج تراکنش از دیتابیس (مبلغ را کلاینت تعیین نمی‌کند!)
    const transaction = db.prepare(`
      SELECT * FROM transactions 
      WHERE id = ? AND user_id = ?
    `).get(transactionId, userId) as any;

    if (!transaction) {
      return res.status(404).json({ error: 'تراکنش یافت نشد' });
    }

    // 2. جلوگیری از تایید دوباره (Double Spending)
    if (transaction.status === 'success') {
      return res.json({ success: true, message: 'این تراکنش قبلاً تایید شده است', data: transaction });
    }

    // 3. ارسال درخواست تایید به درگاه بر اساس مبلغ واقعی دیتابیس
    try {
      const response = await axios.post(
        'https://api.payping.ir/v2/pay/verify',
        {
          refId: refId,
          amount: transaction.amount * 10 // استفاده از مبلغ دیتابیس!
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 4. اگر پرداخت موفق بود، موجودی کاربر باید آپدیت شود (عملیات Atomic)
      const verifyAndCharge = db.transaction(() => {
        // آپدیت وضعیت تراکنش
        db.prepare(`
          UPDATE transactions 
          SET status = 'success', ref_id = ? 
          WHERE id = ?
        `).run(refId, transactionId);

        // افزایش موجودی کیف پول کاربر
        db.prepare(`
          UPDATE users 
          SET wallet_balance = wallet_balance + ? 
          WHERE id = ?
        `).run(transaction.amount, userId);
      });

      verifyAndCharge();
      
      logger.info(`Payment verified: TRX-${transactionId} for User ${userId}`);
      res.json({ success: true, message: 'پرداخت با موفقیت تایید شد' });

    } catch (paypingError: any) {
      // اگر درگاه تایید نکرد، وضعیت را failed می‌کنیم
      db.prepare("UPDATE transactions SET status = 'failed' WHERE id = ?").run(transactionId);
      
      logger.error('Payment Verification Failed:', paypingError.response?.data || paypingError.message);
      res.status(400).json({ 
        error: 'تراکنش ناموفق بود یا توسط درگاه تایید نشد', 
        details: paypingError.response?.data 
      });
    }

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('Payment Verification System Error:', error.message);
    res.status(500).json({ error: 'خطای داخلی سیستم تایید پرداخت' });
  }
});

export default router;