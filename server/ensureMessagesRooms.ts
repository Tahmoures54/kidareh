/**
 * messages_rooms bootstrap — ensures chat rooms table exists
 */
import db from "./db.js";
import logger from "./logger.js";

export function ensureMessagesRooms() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages_rooms (
        room_id     TEXT    PRIMARY KEY,
        user1_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
        created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
        updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_messages_rooms_user1 ON messages_rooms(user1_id);
      CREATE INDEX IF NOT EXISTS idx_messages_rooms_user2 ON messages_rooms(user2_id);
      CREATE INDEX IF NOT EXISTS idx_messages_rooms_updated ON messages_rooms(updated_at DESC);
    `);

    const count = (db.prepare("SELECT COUNT(*) AS c FROM messages_rooms").get() as any)?.c ?? 0;
    if (count === 0) {
      try {
        db.exec(`
          INSERT OR IGNORE INTO messages_rooms (room_id, user1_id, user2_id, created_at, updated_at)
          SELECT
            m.room_id,
            MIN(CASE WHEN m.sender_id < m.receiver_id THEN m.sender_id ELSE m.receiver_id END),
            MAX(CASE WHEN m.sender_id > m.receiver_id THEN m.sender_id ELSE m.receiver_id END),
            MIN(m.created_at),
            MAX(m.created_at)
          FROM messages m
          GROUP BY m.room_id
        `);
        logger.info("✅ messages_rooms backfilled");
      } catch (e: any) {
        logger.warn("messages_rooms backfill skipped:", e?.message);
      }
    }

    try {
      db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (11)").run();
    } catch {}

    logger.info("✅ messages_rooms ready");
  } catch (err) {
    logger.error("ensureMessagesRooms failed:", err);
  }
}
