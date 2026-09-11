import { Router } from "express";
import db from "../db.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { createHold, getListing, getStore } from "../../src/presence/engine.js";
import logger from "../logger.js";

const router = Router();

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT UNIQUE NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_key TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      product_id INTEGER,
      status TEXT NOT NULL DEFAULT 'requested'
        CHECK(status IN ('requested','seller_confirmed','ready_for_pickup','completed','cancelled','expired')),
      price_snapshot INTEGER NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      store_name_snapshot TEXT NOT NULL,
      pickup_code TEXT NOT NULL,
      hold_minutes INTEGER NOT NULL DEFAULT 45,
      expires_at TEXT NOT NULL,
      room_id TEXT,
      image_url TEXT,
      store_lat REAL,
      store_lng REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reservations_buyer ON reservations(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(pickup_code);
  `);
} catch (e: any) {
  logger.error("reservations table:", e?.message);
}

const TRANSITIONS: Record<string, string[]> = {
  requested: ["seller_confirmed", "cancelled"],
  seller_confirmed: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
};

function rowToJson(row: any) {
  return {
    id: row.public_id,
    dbId: row.id,
    buyer_id: row.buyer_id,
    listing_id: row.listing_id,
    product_id: row.product_id,
    status: row.status,
    price_snapshot: row.price_snapshot,
    product_name_snapshot: row.product_name_snapshot,
    store_name_snapshot: row.store_name_snapshot,
    pickup_code: row.pickup_code,
    hold_minutes: row.hold_minutes,
    expires_at: row.expires_at,
    created_at: row.created_at,
    room_id: row.room_id,
    image: row.image_url,
    storeLat: row.store_lat,
    storeLng: row.store_lng,
  };
}

function expireStale() {
  db.prepare(
    `UPDATE reservations SET status = 'expired', updated_at = CURRENT_TIMESTAMP
     WHERE status IN ('requested','seller_confirmed','ready_for_pickup') AND expires_at <= CURRENT_TIMESTAMP`
  ).run();
}

router.get("/", requireAuth, (req: AuthRequest, res) => {
  expireStale();
  const rows = db
    .prepare(`SELECT * FROM reservations WHERE buyer_id = ? ORDER BY datetime(created_at) DESC`)
    .all(req.user!.id);
  res.json({ reservations: rows.map(rowToJson) });
});

router.post("/", requireAuth, (req: AuthRequest, res) => {
  const listingId = String(req.body?.listingId || req.body?.listing_id || "");
  const holdMinutes = Number(req.body?.holdMinutes ?? req.body?.hold_minutes ?? 45);
  try {
    const hold = createHold(listingId, holdMinutes);
    const listing = getListing(listingId);
    const store = listing ? getStore(listing.storeId) : undefined;
    db.prepare(
      `INSERT INTO reservations (
        public_id, buyer_id, seller_key, listing_id, status, price_snapshot,
        product_name_snapshot, store_name_snapshot, pickup_code, hold_minutes,
        expires_at, image_url, store_lat, store_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      hold.id,
      req.user!.id,
      store?.id ?? "store",
      listingId,
      hold.status,
      hold.price,
      hold.productName,
      hold.storeName,
      hold.pickupCode,
      hold.holdMinutes,
      hold.expiresAt,
      hold.image,
      hold.storeLat,
      hold.storeLng
    );
    res.status(201).json({ reservation: hold });
  } catch (err: any) {
    const map: Record<string, [number, string]> = {
      listing_not_found: [404, "کالا پیدا نشد"],
      not_holdable: [400, "این کالا قابل رزرو نیست"],
      out_of_stock: [409, "موجودی تمام شده"],
      store_not_found: [404, "فروشگاه پیدا نشد"],
    };
    const hit = map[err?.message];
    if (hit) return res.status(hit[0]).json({ error: hit[1] });
    logger.error("create reservation", err);
    res.status(500).json({ error: "رزرو ثبت نشد" });
  }
});

router.patch("/:id/status", requireAuth, (req: AuthRequest, res) => {
  expireStale();
  const next = String(req.body?.status || "");
  const row = db
    .prepare(`SELECT * FROM reservations WHERE public_id = ? OR id = ?`)
    .get(req.params.id, Number(req.params.id) || -1) as any;
  if (!row) return res.status(404).json({ error: "رزرو پیدا نشد" });
  if (Number(row.buyer_id) !== Number(req.user!.id) && req.user!.role !== "admin" && req.user!.role !== "seller") {
    return res.status(403).json({ error: "دسترسی ندارید" });
  }
  const allowed = TRANSITIONS[row.status] || [];
  if (!allowed.includes(next)) {
    return res.status(400).json({ error: "این تغییر وضعیت مجاز نیست" });
  }
  db.prepare(`UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(next, row.id);
  const updated = db.prepare(`SELECT * FROM reservations WHERE id = ?`).get(row.id);
  res.json({ reservation: rowToJson(updated) });
});

export default router;
