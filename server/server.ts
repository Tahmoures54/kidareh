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
   PATHS & CONFIG (☁️ Liara Optimized)
═══════════════════════════════════════════ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = process.cwd();

// 🚀 Pro Tip Liara: دیتابیس و فایل‌های کاربران باید در پوشه data باشند تا روی دیسک لیارا ذخیره شوند
const DATA_DIR = path.join(ROOT_DIR, "data"); 

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
const MessageReadSchema = z.object({ roomId: z.string().min(1).max(100), messageId: z.string().min(1).max(100) });
const ProductContextSchema = z.object({ roomId: z.string().min(1).max(100), productId: z.string().min(1).max(100) });

/* ═══════════════════════════════════════════
   ENVIRONMENT VALIDATION
═══════════════════════════════════════════ */
function validateEnvironment() {
  const requiredVars = ["JWT_SECRET", "COOKIE_SECRET"];
  const missing = requiredVars.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    if (isProd) throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
    logger.warn(`⚠️ Missing env vars (dev mode): ${missing.join(", ")}`);
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "dev-jwt-secret";
    if (!process.env.COOKIE_SECRET) process.env.COOKIE_SECRET = "dev-cookie-secret";
  }
}

/* ═══════════════════════════════════════════
   CORS CONFIGURATION
═══════════════════════════════════════════ */
function getAllowedOrigins(): string[] {
  const extraOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return isProd 
    ? [process.env.APP_URL || "https://kidareh.liara.run", "https://kidareh.iran.liara.run", ...extraOrigins]
    : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", ...extraOrigins];
}

const CORS_OPTIONS: CorsOptions = (() => {
  const allowlist = new Set(getAllowedOrigins());
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || !isProd || allowlist.has(origin)) return callback(null, true);
      logger.warn(`🚫 CORS blocked: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
  };
})();

/* ═══════════════════════════════════════════
   RATE LIMITERS (🛡️ Anti-DDoS)
═══════════════════════════════════════════ */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000, // در لیارا با فرانت‌اند مشترک، باید کمی محدودیت را بیشتر کنیم تا فایل‌های استاتیک بلاک نشوند
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید." },
  skip: (req) => req.url.startsWith("/api/health") || !req.url.startsWith("/api/"),
});

const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: isProd ? 5 : 50,
  message: { error: "تعداد درخواست‌های ارسال کد بیش از حد است. ۲ دقیقه صبر کنید." },
});

/* ═══════════════════════════════════════════
   HELPERS (📂 Liara Disk Setup)
═══════════════════════════════════════════ */
function ensureDirectories() {
  // تمام فایل‌های متغیر باید درون پوشه data باشند تا روی دیسک لیارا بمانند
  const dirs = [
    "data/uploads/products", 
    "data/uploads/avatars", 
    "data/uploads/stores", 
    "data/logs", 
    "data/backup",
    "data/database" // پوشه اصلی دیتابیس SQLite
  ];
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
  
  const token = req.header("x-system-token") || req.query.token?.toString();
  if (!token || token !== ADMIN_SYSTEM_TOKEN) {
    logger.warn(`🚫 Unauthorized system access attempt from ${req.ip}`);
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

async function checkRoomAccess(userId: string, roomId: string): Promise<boolean> {
  try {
    const result = db.prepare(`SELECT 1 FROM messages_rooms WHERE room_id = ? AND (user1_id = ? OR user2_id = ?) LIMIT 1`).get(roomId, userId, userId);
    return !!result;
  } catch (err) {
    return false;
  }
}

/* ═══════════════════════════════════════════
   SOCKET.IO SETUP
═══════════════════════════════════════════ */
interface SocketData { user: { id: string; role: string }; }

function setupSocket(io: Server) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error("Authentication required"));
    try {
      socket.data = { user: jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string } };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userData = (socket.data as SocketData).user;
    const handleWithAuth = async (roomId: string, handler: Function, ack?: Function) => {
      if (!(await checkRoomAccess(userData.id, roomId))) {
        if (ack) ack({ ok: false, error: "دسترسی غیرمجاز" });
        else socket.emit("error", { message: "دسترسی به این اتاق ندارید" });
        return;
      }
      handler();
    };

    socket.on("join_room", async (r) => { try { await handleWithAuth(JoinRoomSchema.parse(r), () => { socket.join(r); socket.emit("joined_room", { roomId: r }); }); } catch {} });
    socket.on("send_message", async (r, ack) => {
      try {
        const d = MessageSchema.parse(r);
        if (d.senderId !== userData.id) return ack?.({ ok: false });
        await handleWithAuth(d.roomId, () => {
          socket.to(d.roomId).emit("receive_message", { ...d, timestamp: new Date().toISOString(), status: "sent" });
          ack?.({ ok: true });
        }, ack);
      } catch { ack?.({ ok: false }); }
    });
    socket.on("disconnect", () => {});
  });
}

/* ═══════════════════════════════════════════
   MAIN SERVER
═══════════════════════════════════════════ */
async function startServer() {
  try {
    validateEnvironment();
    ensureDirectories();

    const app = express();
    const httpServer = createServer(app);

    // 🛡️ Pro Tip: استخراج IP واقعی کاربر از پشت لودبالانسر لیارا برای مسدودسازی هکرها
    app.set("trust proxy", "loopback, linklocal, uniquelocal");
    app.disable("x-powered-by");

    app.use(compression());
    app.use(cors(CORS_OPTIONS));

    // 🛡️ Relaxed Helmet for SPA (Vite/React)
    app.use(helmet({
        contentSecurityPolicy: false, // غیرفعال کردن موقت CSP برای جلوگیری از بلاک شدن عکس‌های خارجی و اسکریپت‌های React
        crossOriginEmbedderPolicy: false,
    }));

    app.use(timeout("30s"));
    app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
      res.setHeader("x-request-id", req.id);
      next();
    });

    app.use(morgan(isProd ? "combined" : "dev", { skip: (req) => req.url.startsWith("/api/health") }));
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(cookieParser(process.env.COOKIE_SECRET!));

    const io = new Server(httpServer, {
      cors: { origin: getAllowedOrigins(), credentials: true },
      transports: ["websocket", "polling"], // ⚡ Websocket First for speed
    });
    setupSocket(io);
    app.set("io", io);

    // 📂 سرو کردن پوشه آپلود از مسیر امن لیارا
    app.use("/uploads", express.static(path.join(ROOT_DIR, "data/uploads"), { maxAge: "7d" }));

    app.use("/api", apiLimiter);
    app.use("/api/auth/send-otp", authLimiter);

    /* ─── API Routes ─── */
    app.get("/api/health", async (_req, res) => res.status(200).json({ status: "healthy" }));
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

    /* ─── Static Files & SPA (Vite Fallback) ─── */
    if (isProd) {
      // 🚀 مسیر استاندارد Vite معمولاً dist است نه dist/public
      const publicPath = fs.existsSync(path.join(ROOT_DIR, "dist/public")) 
        ? path.join(ROOT_DIR, "dist/public") 
        : path.join(ROOT_DIR, "dist");

      app.use(express.static(publicPath, { maxAge: "1d" }));
      app.get("*", (req: Request, res: Response) => {
        if (req.url.startsWith("/api/")) return res.status(404).json({ error: "API not found" });
        res.sendFile(path.join(publicPath, "index.html"));
      });
    }

    /* ─── Global Error Handler ─── */
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err?.status || 500;
      logger.error("❌ Server Error:", { status, message: err?.message, url: req.originalUrl });
      res.status(status).json({ error: isProd ? "خطای سرور" : err?.message });
    });

    /* ─── Start Listening ─── */
    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on ${HOST}:${PORT} | ENV: ${NODE_ENV}`);
    });

    /* ─── Graceful Shutdown ─── */
    const shutdown = () => {
      logger.warn(`🛑 Shutting down...`);
      httpServer.close(() => {
        io.close();
        try { db.close(); } catch (e) {}
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    console.error("💥 Server startup failed:", err);
    process.exit(1);
  }
}

startServer();

declare global { namespace Express { interface Request { id: string; } } }
export type { SocketData };
