import "express-async-errors";
import express, { type Request, type Response, type NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cors, { type CorsOptions } from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import fs from "fs";

import logger from "./logger.js";
import db, { getStats, createBackup } from "./db.js";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // اگر لازم نبود می‌تونی حذفش کنی

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const APP_VERSION = "1.0.6";

const ADMIN_SYSTEM_TOKEN = process.env.ADMIN_SYSTEM_TOKEN || "";

// ==========================================
// 1. CORS Configuration
// ==========================================
const getAllowedOrigins = (): string[] => {
  if (isProd) {
    return [
      process.env.APP_URL || "https://kidareh.liara.run",
      "https://kidareh.iran.liara.run",
      ...(process.env.ALLOWED_ORIGINS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || []),
    ].filter(Boolean);
  }

  return [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
};

function buildCorsOptions(): CorsOptions {
  const allowlist = new Set(getAllowedOrigins());

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowlist.has(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  };
}

// ==========================================
// 2. Rate Limiter
// ==========================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  },
});

// ==========================================
// 3. Helper Functions
// ==========================================
function ensureDirectories() {
  const dirs = ["uploads/products", "uploads/avatars", "uploads/stores", "logs", "backup"];
  for (const dir of dirs) {
    const dirPath = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`✅ Created directory: ${dir}/`);
    }
  }
}

function validateEnvironment() {
  const required = ["JWT_SECRET"];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0 && isProd) {
    throw new Error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  }

  if (isProd && !ADMIN_SYSTEM_TOKEN) {
    logger.warn("⚠️ ADMIN_SYSTEM_TOKEN is not set. /api/system/* endpoints will be inaccessible.");
  }
}

function requireSystemToken(req: Request, res: Response, next: NextFunction) {
  if (!isProd && !ADMIN_SYSTEM_TOKEN) return next();

  const incoming =
    req.header("x-system-token") ||
    req.header("x-admin-token") ||
    req.query.token?.toString();

  if (!incoming || incoming !== ADMIN_SYSTEM_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
}

// ==========================================
// 4. Server Startup
// ==========================================
async function startServer() {
  try {
    validateEnvironment();
    ensureDirectories();

    void db;

    const app = express();
    app.set("trust proxy", 1);
    app.disable("x-powered-by");

    const httpServer = createServer(app);

    // ==========================================
    // 5. Middleware Stack
    // ==========================================
    app.use(compression());

    const corsOptions = buildCorsOptions();
    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));

    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
      })
    );

    app.use("/api/", apiLimiter);

    // ✅ FIX: پارامتر res باید res باشد (نه _res)
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
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser(process.env.COOKIE_SECRET));

    // ==========================================
    // 6. WebSocket (Socket.IO)
    // ==========================================
    const io = new Server(httpServer, {
      cors: {
        origin: getAllowedOrigins(),
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
      logger.debug(`🔌 Socket connected: ${socket.id}`);

      socket.on("join_room", (roomId: string) => {
        if (roomId) socket.join(roomId);
      });

      socket.on("disconnect", () => {
        logger.debug(`❌ Socket disconnected: ${socket.id}`);
      });
    });

    app.set("io", io);

    // ==========================================
    // 7. API Routes
    // ==========================================
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

    // ==========================================
    // 8. Health & System Endpoints
    // ==========================================
    app.get("/api/health", (req: Request, res: Response) => {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        version: APP_VERSION,
        env: NODE_ENV,
        requestId: req.id,
        now: new Date().toISOString(),
      });
    });

    app.get("/api/system/stats", requireSystemToken, (_req: Request, res: Response) => {
      try {
        const stats = getStats();
        res.json({ success: true, stats });
      } catch (error) {
        logger.error("System stats error:", error);
        res.status(500).json({ error: "خطا در دریافت آمار سیستم" });
      }
    });

    app.post("/api/system/backup", requireSystemToken, (_req: Request, res: Response) => {
      try {
        const file = createBackup();
        res.json({ success: true, file });
      } catch (error) {
        logger.error("Manual backup error:", error);
        res.status(500).json({ error: "خطا در تهیه نسخه پشتیبان" });
      }
    });

    // ==========================================
    // 9. Static Files & SPA Fallback
    // ==========================================
    if (!isProd) {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const publicPath = path.join(ROOT_DIR, "dist/public");

      app.use(
        "/assets",
        express.static(path.join(publicPath, "assets"), {
          maxAge: "1y",
          immutable: true,
        })
      );

      app.use(express.static(publicPath, { maxAge: "1d" }));

      app.use("/api", (_req: Request, res: Response) => {
        res.status(404).json({ error: "Not Found" });
      });

      app.get("*", (_req: Request, res: Response) => {
        return res.sendFile(path.join(publicPath, "index.html"));
      });
    }

    // ==========================================
    // 10. Global Error Handler
    // ==========================================
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = Number(err?.status) || 500;
      const message = isProd ? "Internal Server Error" : err?.message || "Unknown Error";

      logger.error("❌ Server Error:", {
        requestId: req.id,
        status,
        message: err?.message,
        stack: err?.stack,
        url: req.originalUrl,
        method: req.method,
      });

      res.status(status).json({
        error: message,
        requestId: isProd ? req.id : undefined,
      });
    });

    // ==========================================
    // 11. Start HTTP Server
    // ==========================================
    const server = httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT} [${NODE_ENV}] v${APP_VERSION}`);
    });

    // ==========================================
    // 12. Graceful Shutdown
    // ==========================================
    const shutdown = (signal: NodeJS.Signals) => {
      logger.warn(`🛑 Received ${signal}, shutting down gracefully...`);

      server.close((err) => {
        if (err) {
          logger.error("Error during server close:", err);
          process.exit(1);
        }
        logger.info("✅ HTTP server closed.");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("⏱️ Force shutdown after timeout.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("💥 Startup Error:", error);
    process.exit(1);
  }
}

startServer();

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}