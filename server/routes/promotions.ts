/**
 * Promotions API — catalog, public banners, seller stats, tracking
 */
import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import logger from "../logger.js";
import {
  PROMO_CATALOG,
  ensurePromotionTables,
  getActiveSponsoredBanners,
  recordBannerClick,
  recordBannerImpression,
  getSellerPromoStats,
  getPackage,
} from "../services/promotions.js";

const router = Router();

try {
  ensurePromotionTables();
} catch (e: any) {
  logger.error("promotions table init:", e.message);
}

/** GET /api/promotions/catalog — public price list */
router.get("/catalog", (_req, res: Response) => {
  res.json({
    packages: PROMO_CATALOG.map((p) => ({
      id: p.id,
      name: p.name,
      desc: p.desc,
      price: p.price,
      days: p.days,
      features: p.features,
      psychologyHook: p.psychologyHook,
      trial: !!p.trial,
    })),
  });
});

/** GET /api/promotions/banners?city=تهران — homepage sponsored (labeled ads) */
router.get("/banners", (req, res: Response) => {
  try {
    const city = String(req.query.city || "تهران");
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
    const banners = getActiveSponsoredBanners(city, limit);
    // record impressions (best-effort)
    for (const b of banners) recordBannerImpression(b.id);
    res.json({ banners, city, labeled: true });
  } catch (err) {
    logger.error("banners error:", err);
    res.status(500).json({ error: "خطا در دریافت بنرها" });
  }
});

/** POST /api/promotions/banners/:id/click */
router.post("/banners/:id/click", (req, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "شناسه نامعتبر" });
  recordBannerClick(id);
  res.json({ ok: true });
});

/** GET /api/promotions/my-stats — seller ROI dashboard */
router.get("/my-stats", requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const stats = getSellerPromoStats(req.user!.id);
    if (!stats) return res.status(404).json({ error: "فروشگاهی یافت نشد" });
    res.json(stats);
  } catch (err) {
    logger.error("promo stats:", err);
    res.status(500).json({ error: "خطا در دریافت آمار" });
  }
});

/** GET /api/promotions/package/:id */
router.get("/package/:id", (req, res: Response) => {
  const pkg = getPackage(req.params.id);
  if (!pkg) return res.status(404).json({ error: "پکیج یافت نشد" });
  res.json(pkg);
});

export default router;
