import { Router } from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * Health Check Endpoint
 * »—«Ì monitoring  Ê”ÿ Liara
 */
router.get('/health', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    database: checkDatabase(),
    disk: checkDiskSpace()
  };

  res.status(200).json(healthCheck);
});

/**
 * Ready Check (»—«Ì Load Balancer)
 */
router.get('/ready', (req: Request, res: Response) => {
  const isReady = checkDatabase() && checkDiskSpace();
  
  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * »——”Ì ”·«„  œÌ «»Ì”
 */
function checkDatabase(): boolean {
  try {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    return fs.existsSync(dbPath);
  } catch (err) {
    return false;
  }
}

/**
 * »——”Ì ›÷«Ì œÌ”ò
 */
function checkDiskSpace(): boolean {
  try {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    return true;
  } catch (err) {
    return false;
  }
}

export default router;