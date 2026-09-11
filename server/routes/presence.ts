import { Router } from "express";
import {
  buildRadar,
  DEFAULT_ORIGIN,
  getListing,
  planTrip,
  pulseStats,
  searchListings,
  compareCopy,
  enrichListing,
  NEIGHBORHOODS,
  CATEGORY_META,
} from "../../src/presence/engine.js";
import type { ListingCategory, PresenceOrigin } from "../../src/presence/types.js";

const router = Router();

function originFromQuery(req: { query: Record<string, unknown> }): PresenceOrigin {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const label = typeof req.query.label === "string" && req.query.label.trim() ? req.query.label : DEFAULT_ORIGIN.label;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng, label };
  }
  return DEFAULT_ORIGIN;
}

router.get("/feed", (req, res) => {
  const origin = originFromQuery(req);
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const category = (typeof req.query.category === "string" ? req.query.category : "all") as ListingCategory | "all";
  const radiusKm = req.query.radiusKm != null ? Number(req.query.radiusKm) : undefined;
  const openNow = req.query.openNow === "1" || req.query.openNow === "true";
  const verifiedOnly = req.query.verified === "1" || req.query.verified === "true";
  const sort = (typeof req.query.sort === "string" ? req.query.sort : "nearest") as "nearest" | "cheapest" | "newest" | "trust";
  const listings = searchListings(origin, {
    q,
    category,
    radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
    openNow,
    verifiedOnly,
    sort,
    inStock: true,
  });
  res.json({
    origin,
    pulse: pulseStats(origin),
    categories: CATEGORY_META,
    neighborhoods: NEIGHBORHOODS,
    listings,
    compare: compareCopy(),
  });
});

router.get("/radar", (req, res) => {
  const origin = originFromQuery(req);
  const sku = typeof req.query.sku === "string" ? req.query.sku : undefined;
  res.json({ origin, groups: buildRadar(origin, sku) });
});

router.get("/listings/:id", (req, res) => {
  const origin = originFromQuery(req);
  const listing = getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: "کالا پیدا نشد" });
  const enriched = enrichListing(listing, origin);
  const radar = buildRadar(origin, listing.sku);
  res.json({ listing: enriched, radar: radar[0] ?? null });
});

router.post("/trip", (req, res) => {
  const body = req.body ?? {};
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const origin: PresenceOrigin =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, label: typeof body.label === "string" ? body.label : DEFAULT_ORIGIN.label }
      : DEFAULT_ORIGIN;
  const ids = Array.isArray(body.listingIds) ? body.listingIds.map(String).slice(0, 8) : [];
  res.json({ origin, plan: planTrip(origin, ids) });
});

router.get("/pulse", (req, res) => {
  const origin = originFromQuery(req);
  res.json({ origin, pulse: pulseStats(origin), neighborhoods: NEIGHBORHOODS });
});

export default router;
