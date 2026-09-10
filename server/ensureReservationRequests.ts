/** Reservation request bootstrap. Keeps the flow additive and safe for existing SQLite databases. */
import db from "./db.js";
import logger from "./logger.js";

export function ensureReservationRequests() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reservation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        room_id TEXT NOT NULL,
        price_snapshot REAL,
        status TEXT NOT NULL DEFAULT 'requested',
        note TEXT,
        expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        CHECK (status IN ('requested','seller_confirmed','ready_for_pickup','completed','cancelled','expired'))
      );
      CREATE INDEX IF NOT EXISTS idx_reservation_requester ON reservation_requests(requester_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reservation_seller ON reservation_requests(seller_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reservation_product ON reservation_requests(product_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_active_reservation_request
        ON reservation_requests(requester_id, product_id)
        WHERE status IN ('requested','seller_confirmed','ready_for_pickup');
    `);
    logger.info("✅ reservation_requests ready");
  } catch (err) {
    logger.error("ensureReservationRequests failed:", err);
  }
}
