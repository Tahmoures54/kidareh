// server/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../db.js";
import logger from "../logger.js";

/**
 * نوع کاربر احراز شده
 */
export interface AuthUser {
  id: number;
  phone: string;
  role: "admin" | "support" | "seller" | "buyer" | "marketer";
  name?: string;
  email?: string;
}

/**
 * Request با اطلاعات کاربر
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
}

const isProduction = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET;

if ((!JWT_SECRET || JWT_SECRET.length < 32) && isProduction) {
  logger.error("FATAL: JWT_SECRET is missing or too short in production.");
  process.exit(1);
}

const SAFE_JWT_SECRET =
  JWT_SECRET || "dev-only-unsafe-jwt-secret-change-this-in-production";

/**
 * میدل‌ور احراز هویت
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const cookieToken = (req as any).cookies?.token as string | undefined;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ error: "نیاز به ورود به حساب کاربری دارید" });
      return;
    }

    const payload = jwt.verify(token, SAFE_JWT_SECRET) as AuthUser;

    const user = db
      .prepare("SELECT id, phone, role, is_banned, ban_reason, name, email FROM users WHERE id = ?")
      .get(payload.id) as any;

    if (!user) {
      res.status(401).json({ error: "کاربر یافت نشد" });
      return;
    }

    if (user.is_banned) {
      res.status(403).json({
        error: "حساب کاربری شما مسدود شده است",
        reason: user.ban_reason || "نامشخص",
      });
      return;
    }

    req.user = {
      id: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error: any) {
    logger.warn("Auth failed", { message: error?.message });
    res.status(401).json({ error: "نشست شما منقضی شده است. دوباره وارد شوید" });
  }
}

/**
 * میدل‌ور بررسی نقش
 */
export function requireRole(roles: AuthUser["role"][]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "شما به این بخش دسترسی ندارید" });
      return;
    }

    next();
  };
}

/**
 * فقط فروشنده‌ای که فروشگاه واقعی دارد
 */
export function requireSellerWithStore(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "نیاز به ورود به حساب کاربری دارید" });
    return;
  }

  if (req.user.role !== "seller") {
    res.status(403).json({ error: "این قابلیت فقط برای فروشگاه‌ها فعال است" });
    return;
  }

  const store = db
    .prepare("SELECT id FROM stores WHERE user_id = ?")
    .get(req.user.id) as any;

  if (!store) {
    res.status(403).json({
      error: "برای استفاده از این قابلیت، ابتدا فروشگاه خود را تکمیل کنید",
    });
    return;
  }

  next();
}

/**
 * تنها Admin
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "دسترسی رد شد. فقط ادمین‌ها می‌توانند از این بخش استفاده کنند" });
    return;
  }

  next();
}

/**
 * تنها Support یا Admin
 */
export function requireSupport(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!["admin", "support"].includes(req.user.role)) {
    res.status(403).json({ error: "دسترسی رد شد. فقط تیم پشتیبانی می‌تواند از این بخش استفاده کند" });
    return;
  }

  next();
}

export default {
  requireAuth,
  requireRole,
  requireSellerWithStore,
  requireAdmin,
  requireSupport,
};