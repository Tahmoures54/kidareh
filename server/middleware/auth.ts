// server/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../db.js";
import logger from "../logger.js";

// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

export interface AuthUser {
  id: number;
  phone: string;
  role: "admin" | "support" | "seller" | "buyer" | "marketer";
  name?: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ══════════════════════════════════════════════
// Environment & Secret
// ══════════════════════════════════════════════

const isProduction = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET;

if (isProduction && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  logger.error("FATAL: JWT_SECRET is missing or too short in production.");
  process.exit(1);
}

const SAFE_JWT_SECRET =
  JWT_SECRET || "dev-only-unsafe-jwt-secret-change-this-in-production";

// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  if ("cookies" in req && (req as any).cookies?.token) {
    return (req as any).cookies.token as string;
  }

  return null;
}

function fetchUserById(id: number): AuthUser | null {
  const row = db
    .prepare(
      "SELECT id, phone, role, is_banned, ban_reason, name, email FROM users WHERE id = ?"
    )
    .get(id) as any;

  if (!row) return null;
  if (row.is_banned) return null;

  return {
    id: row.id,
    phone: row.phone,
    role: row.role,
    name: row.name ?? undefined,
    email: row.email ?? undefined,
  };
}

// ══════════════════════════════════════════════
// Core Middleware
// ══════════════════════════════════════════════

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: "نیاز به ورود به حساب کاربری دارید" });
      return;
    }

    let decoded: AuthUser;
    try {
      decoded = jwt.verify(token, SAFE_JWT_SECRET) as AuthUser;
    } catch (jwtError: any) {
      // تشخیص دقیق نوع خطای JWT با استفاده از خود شیء jwt
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          error: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید",
        });
        return;
      }
      if (
        jwtError instanceof jwt.JsonWebTokenError ||
        jwtError instanceof jwt.NotBeforeError
      ) {
        res.status(401).json({
          error: "توکن نامعتبر است. لطفاً دوباره وارد شوید",
        });
        return;
      }
      throw jwtError;
    }

    const user = fetchUserById(decoded.id);
    if (!user) {
      const bannedCheck = db
        .prepare("SELECT is_banned, ban_reason FROM users WHERE id = ?")
        .get(decoded.id) as any;

      if (bannedCheck?.is_banned) {
        res.status(403).json({
          error: "حساب کاربری شما مسدود شده است",
          reason: bannedCheck.ban_reason || "نامشخص",
        });
        return;
      }
      res.status(401).json({ error: "کاربر یافت نشد" });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.error("Auth middleware error:", error);
    res.status(500).json({ error: "خطای داخلی سرور" });
  }
}

export function requireRole(
  roles: AuthUser["role"][]
): (req: AuthRequest, res: Response, next: NextFunction) => void {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "احراز هویت نشده‌اید" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "شما به این بخش دسترسی ندارید" });
      return;
    }

    next();
  };
}

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
    res.status(403).json({
      error: "این قابلیت فقط برای فروشگاه‌ها فعال است",
    });
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

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "احراز هویت نشده‌اید" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      error: "دسترسی رد شد. فقط ادمین‌ها می‌توانند از این بخش استفاده کنند",
    });
    return;
  }

  next();
}

export function requireSupport(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "احراز هویت نشده‌اید" });
    return;
  }

  if (!["admin", "support"].includes(req.user.role)) {
    res.status(403).json({
      error: "دسترسی رد شد. فقط تیم پشتیبانی می‌تواند از این بخش استفاده کند",
    });
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