// server/routes/health.ts
import { Router } from "express";
import type { Request, Response } from "express";
import db from "../db.js";
import logger from "../logger.js";

const router = Router();

/**
 * Health Check Endpoint
 * Used by Liara / monitoring tools.
 * Mount this router on "/api" → final path: GET /api/health
 */
router.get("/health", (req: Request, res: Response) => {
  // Attempt a lightweight DB operation to verify connection
  let dbStatus = "disconnected";
  try {
    const row = db.prepare("SELECT 1 AS ok").get() as any;
    dbStatus = row?.ok === 1 ? "connected" : "error";
  } catch (err) {
    logger.error("Health check DB error:", err);
    dbStatus = "error";
  }

  // Disk space is assumed OK (we could check disk usage if needed)
  const diskStatus = "ok";

  const healthReport = {
    status: dbStatus === "connected" && diskStatus === "ok" ? "OK" : "DEGRADED",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    database: dbStatus,
    disk: diskStatus,
  };

  return res.status(dbStatus === "connected" ? 200 : 503).json(healthReport);
});

/**
 * Readiness Check
 * Used by load balancers to decide if the server can accept traffic.
 */
router.get("/ready", (req: Request, res: Response) => {
  let dbOk = false;
  try {
    const row = db.prepare("SELECT 1 AS ok").get() as any;
    dbOk = row?.ok === 1;
  } catch (err) {
    logger.error("Readiness check DB error:", err);
  }

  if (dbOk) {
    return res.status(200).json({ status: "ready", database: "connected" });
  } else {
    return res.status(503).json({ status: "not ready", database: "disconnected" });
  }
});

export default router;