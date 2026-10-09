import { Router, type Response } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import db from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { tripArrivalSchema, tripRequestSchema, tripStatusSchema } from "../../src/presence/tripSchema.js";
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

router.get("/listings/:id", (req, res): void => {
  const origin = originFromQuery(req);
  const listing = getListing(req.params.id);
  if (!listing) {
    res.status(404).json({ error: "کالا پیدا نشد" });
    return;
  }
  const enriched = enrichListing(listing, origin);
  const radar = buildRadar(origin, listing.sku);
  res.json({ listing: enriched, radar: radar[0] ?? null });
});

function tripOrigin(input: { lat?: number; lng?: number; label?: string }): PresenceOrigin {
  if (input.lat !== undefined && input.lng !== undefined) {
    return { lat: input.lat, lng: input.lng, label: input.label ?? DEFAULT_ORIGIN.label };
  }
  return DEFAULT_ORIGIN;
}

router.post("/trip", (req, res): void => {
  const parsed = tripRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "اطلاعات مسیر معتبر نیست.", details: parsed.error.issues });
    return;
  }
  const origin = tripOrigin(parsed.data);
  res.json({ origin, plan: planTrip(origin, parsed.data.listingIds) });
});

interface StoredTrip {
  id: string;
  user_id: number;
  origin_lat: number;
  origin_lng: number;
  origin_label: string;
  status: "planned" | "started" | "completed" | "cancelled";
  total_walk_minutes: number;
  total_km: number;
  total_toman: number;
  created_at: string;
  updated_at: string;
}

interface StoredTripItem {
  id: string;
  trip_id: string;
  listing_id: string;
  stop_order: number;
  item_order: number;
  store_id: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_open_hour: number;
  store_close_hour: number;
  product_name: string;
  price_toman: number;
  latitude: number;
  longitude: number;
  walk_from_previous_minutes: number;
  status: "pending" | "arrived" | "skipped";
  arrived_at: string | null;
}

router.post("/trips", requireAuth, (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "برای ذخیره مسیر وارد حساب شوید." });
    return;
  }

  const parsed = tripRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "اطلاعات مسیر معتبر نیست.", details: parsed.error.issues });
    return;
  }

  const origin = tripOrigin(parsed.data);
  const plan = planTrip(origin, parsed.data.listingIds);
  if (plan.stops.length === 0) {
    res.status(422).json({ error: "برای ذخیره مسیر، دست‌کم یک کالای معتبر انتخاب کنید." });
    return;
  }

  const tripId = randomUUID();
  const arrivalTokens = plan.stops.map((_stop, index) => ({
    stopOrder: index + 1,
    token: randomBytes(32).toString("hex"),
  }));
  const arrivalHashes = new Map<number, string>(
    arrivalTokens.map((entry): [number, string] => [
      entry.stopOrder,
      createHash("sha256").update(entry.token).digest("hex"),
    ]),
  );
  const insertTrip = db.prepare(`
    INSERT INTO trips (id, user_id, origin_lat, origin_lng, origin_label, status,
      total_walk_minutes, total_km, total_toman, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const insertItem = db.prepare(`
    INSERT INTO trip_items (
      id, trip_id, listing_id, stop_order, item_order, store_id, store_name,
      store_address, store_phone, store_open_hour, store_close_hour, product_name,
      price_toman, latitude, longitude, walk_from_previous_minutes, arrival_token_hash, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  const saveTrip = db.transaction(() => {
    insertTrip.run(
      tripId, userId, origin.lat, origin.lng, origin.label,
      plan.totalWalkMinutes, plan.totalKm, plan.totalToman,
    );
    plan.stops.forEach((stop, stopIndex) => {
      stop.listings.forEach((listing, itemIndex) => {
        const arrivalHash = arrivalHashes.get(stopIndex + 1);
        if (!arrivalHash) throw new Error("Missing arrival token hash for trip stop");
        insertItem.run(
          randomUUID(), tripId, listing.id, stopIndex + 1, itemIndex + 1,
          listing.storeId, listing.store.name, listing.store.address, listing.store.phone || "",
          listing.store.openHour, listing.store.closeHour, listing.name, listing.price,
          listing.store.lat, listing.store.lng, stop.walkFromPrev, arrivalHash,
        );
      });
    });
  });

  try {
    saveTrip();
    res.status(201).json({ tripId, status: "planned", origin, plan, arrivalTokens });
  } catch (error) {
    res.status(500).json({ error: "ذخیره مسیر انجام نشد. لطفاً دوباره تلاش کنید." });
  }
});

router.get("/trips", requireAuth, (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "برای مشاهده مسیرها وارد حساب شوید." });
    return;
  }

  const trips = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM trip_items i WHERE i.trip_id = t.id) AS item_count,
      (SELECT COUNT(DISTINCT i.store_id) FROM trip_items i WHERE i.trip_id = t.id) AS store_count
    FROM trips t
    WHERE t.user_id = ?
    ORDER BY t.updated_at DESC
    LIMIT 25
  `).all(userId) as Array<StoredTrip & { item_count: number; store_count: number }>;

  res.json({ trips });
});

router.get("/trips/:id", requireAuth, (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "برای مشاهده مسیر وارد حساب شوید." });
    return;
  }
  const tripId = req.params.id;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ? AND user_id = ?").get(tripId, userId) as StoredTrip | undefined;
  if (!trip) {
    res.status(404).json({ error: "مسیر پیدا نشد." });
    return;
  }
  const items = db.prepare(`
    SELECT * FROM trip_items
    WHERE trip_id = ?
    ORDER BY stop_order ASC, item_order ASC
  `).all(tripId) as StoredTripItem[];
  res.json({ trip, items });
});

router.post("/trips/:id/stops/:stopOrder/check-in", requireAuth, (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "برای تأیید حضور وارد حساب شوید." });
    return;
  }
  if (req.user?.role !== "seller" && req.user?.role !== "admin") {
    res.status(403).json({ error: "تأیید حضور فقط برای حساب فروشنده امکان‌پذیر است." });
    return;
  }

  const parsed = tripArrivalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "کد QR معتبر نیست.", details: parsed.error.issues });
    return;
  }

  const stopOrder = Number(req.params.stopOrder);
  if (!Number.isSafeInteger(stopOrder) || stopOrder < 1) {
    res.status(400).json({ error: "شماره توقف معتبر نیست." });
    return;
  }

  const tripId = req.params.id;
  const trip = db.prepare("SELECT status FROM trips WHERE id = ?").get(tripId) as { status: StoredTrip["status"] } | undefined;
  if (!trip) {
    res.status(404).json({ error: "مسیر پیدا نشد." });
    return;
  }
  if (trip.status !== "started") {
    res.status(409).json({ error: "ابتدا خریدار باید سفر را شروع کند." });
    return;
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const item = db.prepare(`
    SELECT store_phone FROM trip_items
    WHERE trip_id = ? AND stop_order = ? AND arrival_token_hash = ? AND status = 'pending'
    LIMIT 1
  `).get(tripId, stopOrder, tokenHash) as { store_phone: string } | undefined;
  if (!item) {
    res.status(404).json({ error: "این QR برای این توقف معتبر نیست یا قبلاً صادر نشده است." });
    return;
  }

  const sellerStore = db.prepare("SELECT id, phone FROM stores WHERE user_id = ? LIMIT 1")
    .get(userId) as { id: number; phone: string | null } | undefined;
  const normalizePhone = (value: string) =>
    value
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/[^0-9]/g, "");
  if (!sellerStore?.phone || normalizePhone(sellerStore.phone) !== normalizePhone(item.store_phone)) {
    res.status(403).json({ error: "این QR متعلق به فروشگاه ثبت‌شده شما نیست." });
    return;
  }

  const updated = db.prepare(`
    UPDATE trip_items
    SET status = 'arrived', arrived_at = CURRENT_TIMESTAMP
    WHERE trip_id = ? AND stop_order = ? AND arrival_token_hash = ? AND status = 'pending'
  `).run(tripId, stopOrder, tokenHash);
  if (updated.changes === 0) {
    res.status(409).json({ error: "این QR قبلاً استفاده شده است." });
    return;
  }

  res.json({ success: true, tripId, stopOrder, message: "حضور در فروشگاه تأیید شد." });
});

router.patch("/trips/:id/status", requireAuth, (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "برای تغییر وضعیت مسیر وارد حساب شوید." });
    return;
  }
  const parsed = tripStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "وضعیت جدید مسیر معتبر نیست.", details: parsed.error.issues });
    return;
  }
  const tripId = req.params.id;
  const trip = db.prepare("SELECT id, status FROM trips WHERE id = ? AND user_id = ?").get(tripId, userId) as { id: string; status: StoredTrip["status"] } | undefined;
  if (!trip) {
    res.status(404).json({ error: "مسیر پیدا نشد." });
    return;
  }

  const allowed =
    (trip.status === "planned" && ["started", "cancelled"].includes(parsed.data.status)) ||
    (trip.status === "started" && ["completed", "cancelled"].includes(parsed.data.status));
  if (!allowed) {
    res.status(409).json({ error: "این تغییر وضعیت برای مسیر ممکن نیست." });
    return;
  }

  db.prepare("UPDATE trips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
    .run(parsed.data.status, tripId, userId);
  res.json({ success: true, tripId, status: parsed.data.status });
});

router.get("/pulse", (req, res) => {
  const origin = originFromQuery(req);
  res.json({ origin, pulse: pulseStats(origin), neighborhoods: NEIGHBORHOODS });
});

export default router;
