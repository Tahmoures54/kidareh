/**
 * SQLite Database Configuration & Management
 * ☁️ Liara & Docker Optimized
 */

import Database from "better-sqlite3";
import path     from "path";
import fs       from "fs";
import logger   from "./logger.js";
import { env }  from "./config/env.js";

// ============================================================================
// 1. Configuration & Paths (☁️ Docker / Liara Safe)
// ============================================================================

const isProd = process.env.NODE_ENV === "production";
const defaultDir = isProd ? "/data" : process.cwd(); 

let dbPath = "";

if (env.DATABASE_URL) {
  dbPath = path.isAbsolute(env.DATABASE_URL) ? env.DATABASE_URL : path.resolve(process.cwd(), env.DATABASE_URL);
} else if (process.env.DB_PATH) {
  dbPath = process.env.DB_PATH;
} else {
  dbPath = path.join(defaultDir, isProd ? "database/app.db" : "app.db");
}

const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.info(`📁 Created data directory: ${dataDir}`);
}

const backupDir = path.join(dataDir, "backups");

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

logger.info(`📂 Database Path: ${dbPath}`);

// ============================================================================
// 2. Connection
// ============================================================================

let db: Database.Database;

try {
  db = new Database(dbPath);
  logger.info("✅ Database connected");
} catch (err) {
  logger.error("❌ Database connection failed", err);
  process.exit(1);
}

// ============================================================================
// 3. Pragmas (🚀 Enterprise Performance)
// ============================================================================

try {
  db.pragma("journal_mode  = WAL");
  db.pragma("synchronous   = NORMAL");
  db.pragma("busy_timeout  = 5000"); 
  db.pragma("cache_size    = -64000"); 
  db.pragma("foreign_keys  = ON");
  db.pragma("temp_store    = MEMORY");
  db.pragma("mmap_size     = 30000000000");
  db.pragma("page_size     = 4096");
  db.pragma("auto_vacuum   = INCREMENTAL");
  logger.info("✅ Pragmas configured (WAL Mode Active)");
} catch (err) {
  logger.error("❌ Pragma config failed", err);
}

// ============================================================================
// 4. Schema Version
// ============================================================================

const SCHEMA_VERSION = 10; 

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT    DEFAULT CURRENT_TIMESTAMP
  )
`);

const getCurrentVersion = (): number => {
  try {
    const r = db.prepare("SELECT MAX(version) AS v FROM schema_migrations").get() as any;
    return r?.v || 0;
  } catch { return 0; }
};

// ============================================================================
// 5. Core Tables
// ============================================================================

const createTables = () => {
  db.exec(`
    /* ── کاربران ── */
    CREATE TABLE IF NOT EXISTS users (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      phone               TEXT    UNIQUE NOT NULL,
      role                TEXT    DEFAULT 'buyer'
                                  CHECK(role IN ('admin','support','seller','buyer','marketer')),
      name                TEXT,
      national_code       TEXT,       
      province            TEXT,       
      city                TEXT,       
      email               TEXT    UNIQUE,
      referral_code       TEXT    UNIQUE,
      wallet_balance      INTEGER DEFAULT 0,
      total_earned        INTEGER DEFAULT 0,
      total_withdrawn     INTEGER DEFAULT 0,
      is_profile_complete BOOLEAN DEFAULT 0,
      is_banned           BOOLEAN DEFAULT 0,
      ban_reason          TEXT,
      avatar_url          TEXT,
      bio                 TEXT,
      last_login_at       TEXT,
      created_at          TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at          TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── فروشگاه‌ها ── */
    CREATE TABLE IF NOT EXISTS stores (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id              INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name                 TEXT    NOT NULL,
      slug                 TEXT    UNIQUE,
      category             TEXT    NOT NULL,
      address              TEXT    NOT NULL,
      image_url            TEXT,
      cover_image_url      TEXT,
      lat                  REAL,
      lng                  REAL,
      city                 TEXT    NOT NULL,
      province             TEXT    NOT NULL,
      phone                TEXT,
      description          TEXT,
      rating               REAL    DEFAULT 4.5,
      has_business_license BOOLEAN DEFAULT 0,
      license_number       TEXT,    
      is_verified          BOOLEAN DEFAULT 0,
      total_products       INTEGER DEFAULT 0,
      total_views          INTEGER DEFAULT 0,
      total_followers      INTEGER DEFAULT 0,
      blue_tick_expires_at TEXT,
      created_at           TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at           TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── محصولات ── */
    CREATE TABLE IF NOT EXISTS products (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id          INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name              TEXT    NOT NULL,
      slug              TEXT,
      price             INTEGER NOT NULL DEFAULT 0,
      old_price         INTEGER,
      status            TEXT    DEFAULT 'موجود'
                                CHECK(status IN ('موجود','فقط ۱ عدد','ناموجود','به‌زودی')),
      badge             TEXT,
      moderation_status TEXT    DEFAULT 'pending'
                                CHECK(moderation_status IN ('pending','approved','rejected')),
      rejection_reason  TEXT,
      image_url         TEXT,
      images            TEXT,
      description       TEXT,
      category          TEXT,
      condition         TEXT    DEFAULT 'new',
      views             INTEGER DEFAULT 0,
      clicks            INTEGER DEFAULT 0,
      saves             INTEGER DEFAULT 0,
      city              TEXT    NOT NULL,
      province          TEXT    NOT NULL,
      is_featured       BOOLEAN DEFAULT 0,
      featured_until    TEXT,
      created_at        TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at        TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── ذخیره‌شده‌ها ── */
    CREATE TABLE IF NOT EXISTS saved_products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );

    /* ── گزارش‌ها ── */
    CREATE TABLE IF NOT EXISTS reports (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id    INTEGER REFERENCES users(id)             ON DELETE SET NULL,
      reason     TEXT    NOT NULL,
      status     TEXT    DEFAULT 'pending'
                         CHECK(status IN ('pending','reviewed','resolved','dismissed')),
      admin_note TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── اطلاع‌رسانی موجودی ── */
    CREATE TABLE IF NOT EXISTS notify_requests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      phone       TEXT,
      status      TEXT DEFAULT 'pending'
                       CHECK(status IN ('pending','notified','cancelled')),
      notified_at TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    /* ── نظرات ── */
    CREATE TABLE IF NOT EXISTS reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT,
      rating      INTEGER DEFAULT 5 CHECK(rating >= 1 AND rating <= 5),
      content     TEXT    NOT NULL,
      status      TEXT    DEFAULT 'pending'
                          CHECK(status IN ('pending','approved','rejected')),
      helpful_count INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── پیام‌ها ── */
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id     TEXT    NOT NULL,
      sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content     TEXT    NOT NULL,
      is_read     BOOLEAN DEFAULT 0,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── اعلان‌ها ── */
    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL,
      title      TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      data       TEXT,
      is_read    BOOLEAN DEFAULT 0,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── تراکنش‌های درگاه پرداخت ── */
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      amount      INTEGER NOT NULL,
      type        TEXT    NOT NULL DEFAULT 'badge_purchase'
                          CHECK(type IN ('badge_purchase','wallet_charge')),
      status      TEXT    DEFAULT 'pending'
                          CHECK(status IN ('pending','success','failed')),
      ref_id      TEXT,
      metadata    TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── کیف پول بازاریاب/فروشنده ── */
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      type        TEXT    NOT NULL
                          CHECK(type IN ('commission','withdrawal','bonus','refund')),
      amount      REAL    NOT NULL DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','approved','settled','rejected')),
      description TEXT,
      source      TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── موجودی نشان‌ها ── */
    CREATE TABLE IF NOT EXISTS badge_inventory (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_name  TEXT    NOT NULL,
      quantity    INTEGER NOT NULL DEFAULT 0,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_name)
    );

    /* ── خرید نشان‌ها (تاریخچه) ── */
    CREATE TABLE IF NOT EXISTS badge_purchases (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      badge_type    TEXT    NOT NULL,
      duration_days INTEGER NOT NULL,
      price         INTEGER NOT NULL,
      status        TEXT    DEFAULT 'active'
                            CHECK(status IN ('active','expired','cancelled')),
      expires_at    TEXT    NOT NULL,
      created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── تنظیمات ── */
    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      description TEXT,
      updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    /* ── Analytics ── */
    CREATE TABLE IF NOT EXISTS analytics (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT    NOT NULL,
      user_id    INTEGER,
      product_id INTEGER,
      data       TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── لینک‌های معرفی ── */
    CREATE TABLE IF NOT EXISTS referral_links (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code          TEXT    NOT NULL UNIQUE,
      is_active     BOOLEAN DEFAULT 1,
      created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    /* ── رویدادهای معرفی ── */
    CREATE TABLE IF NOT EXISTS referral_events (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code             TEXT    NOT NULL,
      reward_amount    INTEGER DEFAULT 0,
      status           TEXT    DEFAULT 'pending'
                               CHECK(status IN ('pending','approved','rejected')),
      created_at       TEXT    DEFAULT CURRENT_TIMESTAMP,
      approved_at      TEXT,
      updated_at       TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(referred_user_id)
    );

    /* ── دنبال‌کنندگان فروشگاه ── */
    CREATE TABLE IF NOT EXISTS store_followers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, store_id)
    );

    /* ── تیکت‌های پشتیبانی ── */
    CREATE TABLE IF NOT EXISTS support_tickets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL,
      status      TEXT    DEFAULT 'open'
                          CHECK(status IN ('open','in_progress','closed')),
      priority    TEXT    DEFAULT 'normal'
                          CHECK(priority IN ('low','normal','high')),
      category    TEXT    NOT NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `);
  logger.info("✅ Tables created");
};

createTables();

// ============================================================================
// 6. Indexes
// ============================================================================

const createIndexes = () => {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_phone    ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);

    CREATE INDEX IF NOT EXISTS idx_stores_user     ON stores(user_id);
    CREATE INDEX IF NOT EXISTS idx_stores_city     ON stores(city);
    CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);
    CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(lat, lng);

    CREATE INDEX IF NOT EXISTS idx_products_store    ON products(store_id);
    CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status, moderation_status);
    CREATE INDEX IF NOT EXISTS idx_products_city     ON products(city);
    CREATE INDEX IF NOT EXISTS idx_products_created  ON products(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_badge    ON products(badge) WHERE badge IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_saved_user    ON saved_products(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_product ON saved_products(product_id);

    CREATE INDEX IF NOT EXISTS idx_reports_product ON reports(product_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status  ON reports(status);

    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status  ON reviews(status);

    CREATE INDEX IF NOT EXISTS idx_messages_room     ON messages(room_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

    CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

    CREATE INDEX IF NOT EXISTS idx_wallet_user   ON wallet_transactions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_wallet_type   ON wallet_transactions(type);

    CREATE INDEX IF NOT EXISTS idx_badge_inv_user ON badge_inventory(user_id);

    CREATE INDEX IF NOT EXISTS idx_ref_links_owner    ON referral_links(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_ref_events_referrer ON referral_events(referrer_user_id);
    CREATE INDEX IF NOT EXISTS idx_ref_events_referred ON referral_events(referred_user_id);

    CREATE INDEX IF NOT EXISTS idx_followers_user  ON store_followers(user_id);
    CREATE INDEX IF NOT EXISTS idx_followers_store ON store_followers(store_id);

    CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type, created_at DESC);
  `);
  logger.info("✅ Indexes created");
};

createIndexes();

// ============================================================================
// 7. Triggers
// ============================================================================

const createTriggers = () => {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS users_updated_at
    AFTER UPDATE ON users BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS stores_updated_at
    AFTER UPDATE ON stores BEGIN
      UPDATE stores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS products_updated_at
    AFTER UPDATE ON products BEGIN
      UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS product_saved_inc
    AFTER INSERT ON saved_products BEGIN
      UPDATE products SET saves = saves + 1 WHERE id = NEW.product_id;
    END;

    CREATE TRIGGER IF NOT EXISTS product_saved_dec
    AFTER DELETE ON saved_products BEGIN
      UPDATE products
      SET saves = CASE WHEN saves > 0 THEN saves - 1 ELSE 0 END
      WHERE id = OLD.product_id;
    END;

    CREATE TRIGGER IF NOT EXISTS store_products_inc
    AFTER INSERT ON products BEGIN
      UPDATE stores SET total_products = total_products + 1 WHERE id = NEW.store_id;
    END;

    CREATE TRIGGER IF NOT EXISTS store_products_dec
    AFTER DELETE ON products BEGIN
      UPDATE stores
      SET total_products = CASE WHEN total_products > 0 THEN total_products - 1 ELSE 0 END
      WHERE id = OLD.store_id;
    END;

    CREATE TRIGGER IF NOT EXISTS followers_inc
    AFTER INSERT ON store_followers BEGIN
      UPDATE stores SET total_followers = total_followers + 1 WHERE id = NEW.store_id;
    END;

    CREATE TRIGGER IF NOT EXISTS followers_dec
    AFTER DELETE ON store_followers BEGIN
      UPDATE stores
      SET total_followers = CASE WHEN total_followers > 0 THEN total_followers - 1 ELSE 0 END
      WHERE id = OLD.store_id;
    END;
  `);
  logger.info("✅ Triggers created");
};

createTriggers();

// ============================================================================
// 8. Default Settings
// ============================================================================

const insertDefaultSettings = () => {
  const defaults: Array<[string, string, string]> = [
    ["REFERRAL_PERCENTAGE", "10",    "درصد پورسانت رفرال"],
    ["MIN_WITHDRAWAL",      "50000", "حداقل مبلغ برداشت (تومان)"],
    ["BLUE_TICK_DAYS",      "30",    "مدت اعتبار تیک آبی (روز)"],
    ["PAYPING_TOKEN",       "",      "توکن درگاه پرداخت PayPing"],
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description)
    VALUES (?, ?, ?)
  `);

  for (const [key, value, description] of defaults) {
    stmt.run(key, value, description);
  }
  logger.info("✅ Default settings inserted");
};

insertDefaultSettings();

// ============================================================================
// 9. Safe Migration Helper
// ============================================================================

const safeAlter = (sql: string, desc = ""): void => {
  try {
    db.exec(sql);
    if (desc) logger.info(`✅ Migration: ${desc}`);
  } catch (err: any) {
    const skip = [
      "duplicate column name",
      "already exists",
      "no such column",
    ];
    if (!skip.some(s => err.message.includes(s))) {
      logger.error(`❌ Migration error (${desc}):`, err.message);
    }
  }
};

// ============================================================================
// 10. Migrations
// ============================================================================

const runMigrations = () => {
  const current = getCurrentVersion();
  logger.info(`📊 Schema: ${current} → ${SCHEMA_VERSION}`);

  if (current < 1) {
    safeAlter(`ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`, "users.updated_at");
    safeAlter(`ALTER TABLE users ADD COLUMN total_earned INTEGER DEFAULT 0`,            "users.total_earned");
    safeAlter(`ALTER TABLE users ADD COLUMN total_withdrawn INTEGER DEFAULT 0`,         "users.total_withdrawn");
    safeAlter(`ALTER TABLE users ADD COLUMN ban_reason TEXT`,                           "users.ban_reason");
    safeAlter(`ALTER TABLE stores ADD COLUMN phone TEXT`,                               "stores.phone");
    safeAlter(`ALTER TABLE stores ADD COLUMN description TEXT`,                         "stores.description");
    safeAlter(`ALTER TABLE stores ADD COLUMN is_verified BOOLEAN DEFAULT 0`,            "stores.is_verified");
    safeAlter(`ALTER TABLE stores ADD COLUMN total_products INTEGER DEFAULT 0`,         "stores.total_products");
    safeAlter(`ALTER TABLE products ADD COLUMN rejection_reason TEXT`,                  "products.rejection_reason");
    safeAlter(`ALTER TABLE products ADD COLUMN saves INTEGER DEFAULT 0`,                "products.saves");
    safeAlter(`ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT 0`,          "products.is_featured");
    safeAlter(`ALTER TABLE products ADD COLUMN featured_until TEXT`,                    "products.featured_until");
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(1);
  }

  if (current < 2) {
    try {
      db.exec(`
        UPDATE products
        SET city     = (SELECT s.city     FROM stores s WHERE s.id = products.store_id),
            province = (SELECT s.province FROM stores s WHERE s.id = products.store_id)
        WHERE city IS NULL OR province IS NULL
      `);
    } catch {}
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(2);
  }

  if (current < 3) {
    try {
      db.exec(`
        UPDATE products SET moderation_status = 'approved'
        WHERE moderation_status IS NULL
      `);
    } catch {}
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(3);
  }

  if (current < 4) {
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(4);
  }

  if (current < 5) {
    safeAlter(`ALTER TABLE users   ADD COLUMN email TEXT UNIQUE`,                "users.email");
    safeAlter(`ALTER TABLE users   ADD COLUMN avatar_url TEXT`,                  "users.avatar_url");
    safeAlter(`ALTER TABLE users   ADD COLUMN bio TEXT`,                         "users.bio");
    safeAlter(`ALTER TABLE stores  ADD COLUMN slug TEXT UNIQUE`,                 "stores.slug");
    safeAlter(`ALTER TABLE stores  ADD COLUMN cover_image_url TEXT`,             "stores.cover_image_url");
    safeAlter(`ALTER TABLE stores  ADD COLUMN total_followers INTEGER DEFAULT 0`,"stores.total_followers");
    safeAlter(`ALTER TABLE stores  ADD COLUMN rating REAL DEFAULT 4.5`,          "stores.rating");
    safeAlter(`ALTER TABLE products ADD COLUMN slug TEXT`,                       "products.slug");
    safeAlter(`ALTER TABLE products ADD COLUMN old_price INTEGER`,               "products.old_price");
    safeAlter(`ALTER TABLE products ADD COLUMN images TEXT`,                     "products.images");
    safeAlter(`ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'new'`,    "products.condition");
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(5);
  }

  if (current < 6) {
    safeAlter(`ALTER TABLE stores ADD COLUMN blue_tick_expires_at TEXT`, "stores.blue_tick_expires_at");
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(6);
  }

  if (current < 7) {
    safeAlter(`ALTER TABLE referral_events ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`, "referral_events.updated_at");
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(7);
  }

  if (current < 8) {
    try {
      const count = (db.prepare("SELECT COUNT(*) AS c FROM transactions").get() as any)?.c ?? 0;
      if (count === 0) {
        db.exec(`
          DROP TABLE IF EXISTS transactions;
          CREATE TABLE transactions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id),
            amount     INTEGER NOT NULL,
            type       TEXT    NOT NULL DEFAULT 'badge_purchase'
                               CHECK(type IN ('badge_purchase','wallet_charge')),
            status     TEXT    DEFAULT 'pending'
                               CHECK(status IN ('pending','success','failed')),
            ref_id     TEXT,
            metadata   TEXT,
            created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT    DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id, status);
          CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        `);
        logger.info("✅ transactions table recreated with correct CHECK");
      }
    } catch (err: any) {
      logger.error("❌ v8 migration error:", err.message);
    }
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(8);
  }

  if (current < 9) {
    safeAlter(`ALTER TABLE stores ADD COLUMN license_number TEXT`, "stores.license_number");
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(9);
  }

  if (current < 10) {
    safeAlter(`ALTER TABLE users ADD COLUMN national_code TEXT`, "users.national_code");
    safeAlter(`ALTER TABLE users ADD COLUMN province TEXT`, "users.province");
    safeAlter(`ALTER TABLE users ADD COLUMN city TEXT`, "users.city");
    db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(10);
  }

  logger.info(`✅ Schema up to date (v${SCHEMA_VERSION})`);
};

runMigrations();

// ============================================================================
// 11. Backup
// ============================================================================

export const createBackup = (): string => {
  const ts         = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `backup-${ts}.db`);

  try {
    db.backup(backupPath);
    logger.info(`💾 Backup: ${backupPath}`);

    const files = fs
      .readdirSync(backupDir)
      .filter(f => f.startsWith("backup-"))
      .sort()
      .reverse();

    files.slice(7).forEach(old => {
      try { fs.unlinkSync(path.join(backupDir, old)); } catch {}
    });

    return backupPath;
  } catch (err) {
    logger.error("❌ Backup failed:", err);
    throw err;
  }
};

if (process.env.AUTO_BACKUP === "true") {
  setInterval(() => {
    try { createBackup(); } catch {}
  }, 24 * 60 * 60 * 1000);
  logger.info("🔄 Auto backup enabled");
}

// ============================================================================
// 12. Stats
// ============================================================================

export const getStats = () => {
  try {
    return db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users)                                        AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_profile_complete = 1)         AS active_users,
        (SELECT COUNT(*) FROM users WHERE is_banned = 1)                   AS banned_users,
        (SELECT COUNT(*) FROM stores)                                      AS total_stores,
        (SELECT COUNT(*) FROM stores WHERE is_verified = 1)                AS verified_stores,
        (SELECT COUNT(*) FROM products)                                    AS total_products,
        (SELECT COUNT(*) FROM products WHERE moderation_status='approved') AS approved_products,
        (SELECT COUNT(*) FROM products WHERE moderation_status='pending')  AS pending_products,
        (SELECT COUNT(*) FROM reviews)                                     AS total_reviews,
        (SELECT COUNT(*) FROM saved_products)                              AS total_saves,
        (SELECT COUNT(*) FROM messages)                                    AS total_messages,
        (SELECT COUNT(*) FROM transactions)                                AS total_transactions,
        (SELECT COUNT(*) FROM wallet_transactions)                         AS total_wallet_tx,
        (SELECT COUNT(*) FROM referral_events WHERE status='approved')     AS completed_referrals
    `).get();
  } catch (err) {
    logger.error("❌ Stats error:", err);
    return null;
  }
};

// ============================================================================
// 13. Safe Exporter (❌ Removed process.exit)
// ============================================================================

// 🛡️ Pro Tip: حالا فایل server.ts این متد را برای بسته شدن ایمن صدا می‌زند
export const closeDatabaseSafely = () => {
  logger.info("🔒 Closing database securely...");
  try {
    if (process.env.BACKUP_ON_SHUTDOWN === "true") createBackup();
    db.close();
    logger.info("✅ Database closed without killing process");
  } catch (err) {
    logger.error("❌ Database Close error:", err);
  }
};

export default db;
export type { Database as DatabaseType };
