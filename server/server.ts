import "dotenv/config";
import "express-async-errors";
import express, { type Request, type Response, type NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cors, { type CorsOptions } from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import fs from "fs";
import { z } from "zod";
import timeout from "connect-timeout";
import jwt from "jsonwebtoken";

import logger from "./logger.js";
import db, { getStats, createBackup } from "./db.js";

// Routes
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import productsRoutes from "./routes/products.js";
import productsSearchRoutes from "./routes/products.search.route.js";
import reportsRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payment.js";
import storesRoutes from "./routes/stores.js";
import referralRoutes from "./routes/referral.js";
import messagesRoutes from "./routes/messages.js";
import supportRoutes from "./routes/support.js";

/* ═══════════════════════════════════════════
   PATHS & CONFIG
═══════════════════════════════════════════ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = process.cwd();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const APP_VERSION = process.env.npm_package_version || "1.2.0";

/* ═══════════════════════════════════════════
   VALIDATION SCHEMAS
═══════════════════════════════════════════ */
const MessageSchema = z.object({
  roomId: z.string().min(1).max(100),
  senderId: z.string().min(1).max(100),
  text: z.string().min(1).max(5000),
  id: z.string().min(1).max(100),
});

const JoinRoomSchema = z.string().min(1).max(100);
const TypingSchema = z.string().min(1).max(100);

const MessageReadSchema = z.object({
  roomId: z.string().min(1).max(100),
  messageId: z.string().min(1).max(100),
});

const ProductContextSchema = z.object({
  roomId: z.string().min(1).max(100),
  productId: z.string().min(1).max(100),
});

/* ═══════════════════════════════════════════
   ENVIRONMENT VALIDATION
═══════════════════════════════════════════ */
function validateEnvironment() {
  const requiredVars = ["JWT_SECRET", "COOKIE_SECRET"];
  const missing = requiredVars.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    if (isProd) {
      throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
    } else {
      logger.warn(`⚠️ Missing env vars (dev mode): ${missing.join(", ")}`);
      if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "dev-jwt-secret";
      if (!process.env.COOKIE_SECRET) process.env.COOKIE_SECRET = "dev-cookie-secret";
    }
  }

  const ADMIN_SYSTEM_TOKEN = process.env.ADMIN_SYSTEM_TOKEN;
  if (isProd && !ADMIN_SYSTEM_TOKEN) {
    logger.warn("⚠️ ADMIN_SYSTEM_TOKEN not set in production");
  }

  logger.info(`🌍 Environment: ${NODE_ENV}`);
  logger.info(`🔑 JWT_SECRET: ${process.env.JWT_SECRET ? "✅" : "❌"}`);
  logger.info(`🔑 COOKIE_SECRET: ${process.env.COOKIE_SECRET ? "✅" : "❌"}`);
  logger.info(`🔒 ADMIN_SYSTEM_TOKEN: ${ADMIN_SYSTEM_TOKEN ? "✅" : "❌"}`);
}

/* ═══════════════════════════════════════════
   CORS CONFIGURATION
═══════════════════════════════════════════ */
function getAllowedOrigins(): string[] {
  const extraOrigins =
    process.env.ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  let origins: string[];
  if (isProd) {
    origins = [
      process.env.APP_URL || "https://kidareh.liara.run",
      "https://kidareh.iran.liara.run",
      ...extraOrigins,
    ].filter(Boolean);
  } else {
    origins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
      ...extraOrigins,
    ];
  }

  return [...new Set(origins)];
}

const CORS_OPTIONS: CorsOptions = (() => {
  const allowlist = new Set(getAllowedOrigins());
  
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!isProd) return callback(null, true);
      if (allowlist.has(origin)) return callback(null, true);
      
      logger.warn(`🚫 CORS blocked: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
  };
})();

/* ═══════════════════════════════════════════
   RATE LIMITERS
═══════════════════════════════════════════ */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 150 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید." },
  skip: (req) => req.url === "/api/health",
});

const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: isProd ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تعداد درخواست‌های ارسال کد بیش از حد است. ۲ دقیقه صبر کنید." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 10 : 100,
  message: { error: "سرعت استفاده از دستیار هوشمند زیاد است. کمی صبر کنید." },
});

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function ensureDirectories() {
  const dirs = ["uploads/products", "uploads/avatars", "uploads/stores", "logs", "backup"];
  for (const dir of dirs) {
    const p = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      logger.info(`✅ Created: ${dir}/`);
    }
  }
}

function requireSystemToken(req: Request, res: Response, next: NextFunction) {
  const ADMIN_SYSTEM_TOKEN = process.env.ADMIN_SYSTEM_TOKEN;
  if (!isProd && !ADMIN_SYSTEM_TOKEN) return next();
  
  const token = req.header("x-system-token") || req.header("x-admin-token") || req.query.token?.toString();
    
  if (!token || token !== ADMIN_SYSTEM_TOKEN) {
    logger.warn(`🚫 Unauthorized system access attempt from ${req.ip}`);
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

async function checkRoomAccess(userId: string, roomId: string): Promise<boolean> {
  try {
    const result = db.prepare(
      `SELECT 1 FROM messages_rooms WHERE room_id = ? AND (user1_id = ? OR user2_id = ?) LIMIT 1`
    ).get(roomId, userId, userId);
    return !!result;
  } catch (err) {
    logger.error("Room access check error:", err);
    return false;
  }
}

/* ═══════════════════════════════════════════
   SOCKET.IO SETUP
═══════════════════════════════════════════ */
interface SocketData {
  user: { id: string; role: string };
}

function setupSocket(io: Server) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      logger.warn(`🚫 Socket connection without token: ${socket.id}`);
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
      socket.data = { user: decoded } as SocketData;
      next();
    } catch {
      logger.warn(`🚫 Invalid socket token: ${socket.id}`);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userData = (socket.data as SocketData).user;
    logger.info(`🔌 Socket connected: ${socket.id} (user: ${userData.id})`);

    const handleWithAuth = async (roomId: string, handler: Function, ack?: Function) => {
      const hasAccess = await checkRoomAccess(userData.id, roomId);
      if (!hasAccess) {
        logger.warn(`🚫 User ${userData.id} tried to access unauthorized room ${roomId}`);
        if (ack) ack({ ok: false, error: "دسترسی غیرمجاز" });
        else socket.emit("error", { message: "دسترسی به این اتاق ندارید" });
        return;
      }
      handler();
    };

    socket.on("join_room", async (rawRoomId: unknown) => {
      try {
        const roomId = JoinRoomSchema.parse(rawRoomId);
        await handleWithAuth(roomId, () => {
          socket.join(roomId);
          logger.debug(`📦 ${socket.id} joined room ${roomId}`);
          socket.emit("joined_room", { roomId });
        });
      } catch (err) {
        socket.emit("error", { message: "خطا در ورود به اتاق" });
      }
    });

    socket.on("send_message", async (rawData: unknown, ack?: (res: { ok: boolean; error?: string }) => void) => {
      try {
        const data = MessageSchema.parse(rawData);
        if (data.senderId !== userData.id) {
          ack?.({ ok: false, error: "Unauthorized sender" });
          return;
        }
        await handleWithAuth(data.roomId, () => {
          socket.to(data.roomId).emit("receive_message", {
            id: data.id, roomId: data.roomId, senderId: data.senderId,
            text: data.text, timestamp: new Date().toISOString(), status: "sent",
          });
          ack?.({ ok: true });
        }, ack);
      } catch (err) {
        ack?.({ ok: false, error: "Invalid message data" });
      }
    });

    socket.on("typing", async (rawRoomId: unknown) => {
      try {
        const roomId = TypingSchema.parse(rawRoomId);
        await handleWithAuth(roomId, () => socket.to(roomId).emit("typing", { from: userData.id, roomId }));
      } catch (err) { /* silent fail for minor events */ }
    });

    socket.on("message_read", async (rawData: unknown) => {
      try {
        const data = MessageReadSchema.parse(rawData);
        await handleWithAuth(data.roomId, () => socket.to(data.roomId).emit("message_read", { messageId: data.messageId, readBy: userData.id }));
      } catch (err) { /* silent fail */ }
    });

    socket.on("product_context", async (rawData: unknown) => {
      try {
        const data = ProductContextSchema.parse(rawData);
        await handleWithAuth(data.roomId, () => socket.to(data.roomId).emit("product_context", { productId: data.productId, sharedBy: userData.id }));
      } catch (err) { /* silent fail */ }
    });

    socket.on("disconnect", (reason) => {
      logger.info(`❌ Socket disconnected: ${socket.id} (user: ${userData.id}, reason: ${reason})`);
    });

    socket.on("error", (err) => logger.error(`Socket error (${socket.id}):`, err));
  });
}

/* ═══════════════════════════════════════════
   HEALTH CHECK
═══════════════════════════════════════════ */
async function performHealthCheck(): Promise<{ status: "healthy" | "unhealthy"; checks: Record<string, string>; timestamp: string; }> {
  const checks: Record<string, string> = { server: "ok" };

  try {
    await db.prepare("SELECT 1").get();
    checks.database = "ok";
  } catch (err) {
    logger.error("DB health check failed:", err);
    checks.database = "error";
  }

  try {
    if (fs.statfsSync) {
      const stats = fs.statfsSync(ROOT_DIR);
      const freeSpace = (stats.bavail * stats.bsize) / (1024 ** 3); // GB
      checks.disk = freeSpace > 1 ? "ok" : "low";
    } else {
      checks.disk = "unknown";
    }
  } catch {
    checks.disk = "unknown";
  }

  const isHealthy = Object.values(checks).every((v) => v === "ok" || v === "unknown");
  return { status: isHealthy ? "healthy" : "unhealthy", checks, timestamp: new Date().toISOString() };
}

/* ═══════════════════════════════════════════
   MAIN SERVER
═══════════════════════════════════════════ */
async function startServer() {
  try {
    validateEnvironment();
    ensureDirectories();

    try {
      await db.prepare("SELECT 1").get();
      logger.info("✅ Database connected");
    } catch (err) {
      logger.error("❌ Database connection failed:", err);
      if (isProd) throw new Error("Database connection required in production");
    }

    const app = express();
    const httpServer = createServer(app);

    app.set("trust proxy", 1);
    app.disable("x-powered-by");

    app.use(compression());
    app.use(cors(CORS_OPTIONS));
    app.options("*", cors(CORS_OPTIONS));

    // ⚠️ اصلاح‌شده: اضافه‌کردن منابع خارجی برای فونت‌ها و استایل‌ها
    app.use(
      helmet({
        contentSecurityPolicy: isProd ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", ...getAllowedOrigins()],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        } : false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
      })
    );

    app.use(timeout("30s"));

    app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
      res.setHeader("x-request-id", req.id);
      next();
    });

    app.use(
      morgan(isProd ? "combined" : "dev", {
        stream: { write: (msg) => logger.http(msg.trim()) },
        skip: (req) => req.url.startsWith("/api/health"),
      })
    );

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(cookieParser(process.env.COOKIE_SECRET!));

    const io = new Server(httpServer, {
      cors: { origin: getAllowedOrigins(), credentials: true, methods: ["GET", "POST"] },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    setupSocket(io);
    app.set("io", io);

    app.use("/uploads", express.static(path.join(ROOT_DIR, "uploads"), { maxAge: isProd ? "7d" : "0", etag: true, lastModified: true }));

    app.use("/api", apiLimiter);
    app.use("/api/auth/send-otp", authLimiter);
    app.use("/api/ai", aiLimiter);

    app.get("/api/health", async (_req: Request, res: Response) => {
      try {
        const health = await performHealthCheck();
        res.status(health.status === "healthy" ? 200 : 503).json(health);
      } catch (err) {
        logger.error("Health check error:", err);
        res.status(503).json({ status: "unhealthy", error: "Health check failed" });
      }
    });

    /* ─── API Routes ─── */
    app.use("/api/auth", authRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/api/products", productsSearchRoutes);
    app.use("/api/products", productsRoutes);
    app.use("/api/reports", reportsRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/stores", storesRoutes);
    app.use("/api/payment", paymentRoutes);
    app.use("/api/referral", referralRoutes);
    app.use("/api/messages", messagesRoutes);
    app.use("/api/support", supportRoutes);

    /* ─── System Endpoints ─── */
    app.get("/api/system/stats", requireSystemToken, async (_req: Request, res: Response) => {
      try {
        res.json({ success: true, stats: getStats(), timestamp: new Date().toISOString() });
      } catch (err) {
        res.status(500).json({ error: "خطا در دریافت آمار" });
      }
    });

    app.post("/api/system/backup", requireSystemToken, async (_req: Request, res: Response) => {
      try {
        const backupFile = createBackup();
        logger.info(`✅ Backup created: ${backupFile}`);
        res.json({ success: true, file: backupFile, timestamp: new Date().toISOString() });
      } catch (err) {
        res.status(500).json({ error: "خطا در تهیه نسخه پشتیبان" });
      }
    });

    /* ─── Static Files & SPA ─── */
    if (isProd) {
      const publicPath = path.join(ROOT_DIR, "dist/public");
      if (fs.existsSync(publicPath)) {
        app.use("/assets", express.static(path.join(publicPath, "assets"), { maxAge: "1y", immutable: true, etag: true }));
        app.use(express.static(publicPath, { maxAge: "1d", etag: true, lastModified: true }));
        app.use("/api/*", (_req: Request, res: Response) => res.status(404).json({ error: "API endpoint not found" }));
        app.get("*", (_req: Request, res: Response) => res.sendFile(path.join(publicPath, "index.html")));
      } else {
        logger.warn(`⚠️ Public directory not found: ${publicPath}`);
      }
    } else {
      app.use("/api/*", (_req: Request, res: Response) => res.status(404).json({ error: "API endpoint not found" }));
    }

    /* ─── Global Error Handler ─── */
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = Number(err?.status) || Number(err?.statusCode) || 500;
      const userMessage = isProd ? "خطایی در سرور رخ داد. لطفاً دوباره تلاش کنید." : err?.message || "Unknown Error";

      logger.error("❌ Server Error:", {
        requestId: req.id, status, message: err?.message,
        stack: isProd ? undefined : err?.stack, url: req.originalUrl, method: req.method,
      });

      res.status(status).json({ error: userMessage, requestId: req.id, timestamp: new Date().toISOString() });
    });

    /* ─── Start Listening ─── */
    httpServer.listen(PORT, HOST, () => {
      logger.info(`
╔════════════════════════════════════════╗
║  🚀 Server Started Successfully       ║
╠════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(24)} ║
║  Version:     ${APP_VERSION.padEnd(24)} ║
║  Host:        ${HOST}:${PORT}${" ".repeat(24 - HOST.length - PORT.toString().length)} ║
║  CORS:        ${getAllowedOrigins().length} origins allowed${" ".repeat(9)} ║
╚════════════════════════════════════════╝
      `);
      if (!isProd) {
        logger.info(`
📡 Development URLs:
   - API:      http://localhost:${PORT}/api
   - Frontend: http://localhost:5173
   - Health:   http://localhost:${PORT}/api/health
        `);
      }
    });

    /* ─── Graceful Shutdown ─── */
    const shutdown = (signal: NodeJS.Signals) => {
      logger.warn(`\n🛑 ${signal} received — initiating graceful shutdown...`);
      httpServer.close((err) => {
        if (err) {
          logger.error("❌ Error during shutdown:", err);
          process.exit(1);
        }
        logger.info("✅ HTTP server closed");
        io.close(() => logger.info("✅ Socket.IO closed"));
        try { db.close(); logger.info("✅ Database closed"); } catch (err) { logger.error("❌ Database close error:", err); }
        logger.info("👋 Shutdown complete");
        process.exit(0);
      });
      setTimeout(() => {
        logger.error("⏱️ Force shutdown after 10s timeout");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("unhandledRejection", (reason, promise) => logger.error("🔥 Unhandled Rejection:", { reason, promise }));
    process.on("uncaughtException", (error) => { logger.error("🔥 Uncaught Exception:", error); process.exit(1); });

  } catch (err) {
    console.error("💥 Server startup failed:", err);
    process.exit(1);
  }
}

startServer();

/* ═══════════════════════════════════════════
   TYPE AUGMENTATION
═══════════════════════════════════════════ */
declare global {
  namespace Express {
    interface Request { id: string; }
  }
}

export type { SocketData };