// server/db.ts
/**
 * SQLite Database Configuration & Management
 * @version 2.0.0
 * @description مدیریت کامل دیتابیس SQLite با Migrations، Backup، و Safety Features
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import logger from "./logger.js";

// ============================================================================
// 1. Configuration & Paths
// ============================================================================

/**
 * مسیر پیش‌فرض دیتابیس
 */
const defaultDir = fs.existsSync("/data") ? "/data" : process.cwd();
const dataDir = process.env.DB_DIR || defaultDir;

// ایجاد دایرکتوری اگر موجود نباشد
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.info(`📁 Created data directory: ${dataDir}`);
}

const dbPath = process.env.DB_PATH || path.join(dataDir, "app.db");
const backupDir = path.join(dataDir, "backups");

// ایجاد دایرکتوری backup
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  logger.info(`📁 Created backup directory: ${backupDir}`);
}

logger.info(`📂 Database location: ${dbPath}`);
logger.info(`💾 Backup directory: ${backupDir}`);

// ============================================================================
// 2. Database Initialization
// ============================================================================

/**
 * اتصال به دیتابیس
 */
let db: Database.Database;

try {
  db = new Database(dbPath);
  logger.info("✅ Database connection established");
} catch (err) {
  logger.error("❌ Failed to connect to database", err);
  process.exit(1);
}

// ============================================================================
// 3. Pragmas Configuration
// ============================================================================

/**
 * تنظیم‌های بهینه‌سازی SQLite
 */
const configurePragmas = () => {
  try {
    db.pragma("journal_mode = WAL"); // Write-Ahead Logging برای بهترین concurrency
    db.pragma("synchronous = NORMAL"); // توازن بین امنیت و سرعت
    db.pragma("busy_timeout = 5000"); // 5 ثانیه timeout
    db.pragma("cache_size = -64000"); // 64MB cache
    db.pragma("foreign_keys = ON"); // فعال‌سازی Foreign Keys
    db.pragma("temp_store = MEMORY"); // ذخیره Temp در RAM
    db.pragma("mmap_size = 30000000000"); // Memory-mapped I/O
    db.pragma("page_size = 4096"); // صفحه‌بندی بهتر
    db.pragma("auto_vacuum = INCREMENTAL");
    db.pragma("incremental_vacuum(1000)");

    logger.info("✅ Database pragmas configured");
  } catch (err) {
    logger.error("❌ Failed to configure pragmas", err);
  }
};

configurePragmas();

// ============================================================================
// 4. Schema Version Management
// ============================================================================

/**
 * ورژن فعلی Schema
 * @description هر بار که تغییری در ساختار دیتابیس انجام می‌شود، این عدد افزایش می‌یابد
 */
const SCHEMA_VERSION = 5;

/**
 * جدول برای ردیابی Migrations
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/**
 * دریافت ورژن فعلی Schema
 */
const getCurrentVersion = (): number => {
  try {
    const result = db
      .prepare("SELECT MAX(version) as version FROM schema_migrations")
      .get() as any;
    return result?.version || 0;
  } catch {
    return 0;
  }
};

// ============================================================================
// 5. Core Tables Schema
// ============================================================================

/**
 * ایجاد تمام جداول اصلی
 */
const createTables = () => {
  db.exec(`
    -- جدول کاربران
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'buyer' CHECK(role IN ('admin', 'support', 'seller', 'buyer', 'marketer')),
      name TEXT,
      email TEXT UNIQUE,
      referral_code TEXT UNIQUE,
      wallet_balance INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      total_withdrawn INTEGER DEFAULT 0,
      is_profile_complete BOOLEAN DEFAULT 0,
      is_banned BOOLEAN DEFAULT 0,
      ban_reason TEXT,
      avatar_url TEXT,
      bio TEXT,
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- جدول فروشگاه‌ها
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      category TEXT NOT NULL,
      address TEXT NOT NULL,
      image_url TEXT,
      cover_image_url TEXT,
      lat REAL,
      lng REAL,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      phone TEXT,
      description TEXT,
      rating REAL DEFAULT 4.5,
      has_business_license BOOLEAN DEFAULT 0,
      is_verified BOOLEAN DEFAULT 0,
      total_products INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      total_followers INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- جدول محصولات
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      old_price INTEGER,
      status TEXT DEFAULT 'موجود' CHECK(status IN ('موجود', 'فقط ۱ عدد', 'ناموجود', 'به‌زودی')),
      badge TEXT,
      moderation_status TEXT DEFAULT 'pending' CHECK(moderation_status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      image_url TEXT,
      images TEXT,
      description TEXT,
      category TEXT,
      condition TEXT DEFAULT 'new',
      views INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      is_featured BOOLEAN DEFAULT 0,
      featured_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
    );

    -- جدول محصولات ذخیره شده
    CREATE TABLE IF NOT EXISTS saved_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    -- جدول گزارش‌ها
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    -- جدول درخواست‌های اطلاع‌رسانی
    CREATE TABLE IF NOT EXISTS notify_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      phone TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'notified', 'cancelled')),
      notified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    -- جدول نظرات
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      author_name TEXT,
      rating INTEGER DEFAULT 5 CHECK(rating >= 1 AND rating <= 5),
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      helpful_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    -- جدول پیام‌ها
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- جدول اطلاع‌رسانی‌ها
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- جدول تراکنش‌ها (کیف پول)
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('commission', 'withdrawal', 'refund', 'bonus', 'penalty')),
      amount INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      reference_id TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- جدول خرید نشان‌ها
    CREATE TABLE IF NOT EXISTS badge_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      badge_type TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      price INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );

    -- جدول تنظیمات
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- جدول Analytics
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      product_id INTEGER,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- جدول لینک‌های معرفی
    CREATE TABLE IF NOT EXISTS referral_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL,
      code TEXT NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- جدول رویدادهای معرفی
    CREATE TABLE IF NOT EXISTS referral_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_user_id INTEGER NOT NULL,
      referred_user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      reward_amount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(referred_user_id)
    );

    -- جدول متفقین درخواست‌های پشتیبانی
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'closed')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high')),
      category TEXT NOT NULL,
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  logger.info("✅ All tables created successfully");
};

createTables();

// ============================================================================
// 6. Indexes
// ============================================================================

/**
 * ایجاد Index‌های بهینه‌سازی
 */
const createIndexes = () => {
  db.exec(`
    -- Users Indexes
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Stores Indexes
    CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
    CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
    CREATE INDEX IF NOT EXISTS idx_stores_province ON stores(province);
    CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);
    CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_stores_verified ON stores(is_verified);

    -- Products Indexes
    CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, moderation_status);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_city ON products(city);
    CREATE INDEX IF NOT EXISTS idx_products_province ON products(province);
    CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_badge ON products(badge) WHERE badge IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, featured_until);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

    -- Saved Products Indexes
    CREATE INDEX IF NOT EXISTS idx_saved_user_id ON saved_products(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_product_id ON saved_products(product_id);

    -- Reports Indexes
    CREATE INDEX IF NOT EXISTS idx_reports_product_id ON reports(product_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

    -- Reviews Indexes
    CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

    -- Messages Indexes
    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

    -- Notifications Indexes
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

    -- Transactions Indexes
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

    -- Analytics Indexes
    CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics(user_id);

    -- Referral Indexes
    CREATE INDEX IF NOT EXISTS idx_referral_links_owner ON referral_links(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_user_id, created_at DESC);
  `);

  logger.info("✅ All indexes created successfully");
};

createIndexes();

// ============================================================================
// 7. Triggers
// ============================================================================

/**
 * ایجاد Trigger‌های خودکار
 */
const createTriggers = () => {
  db.exec(`
    -- بروزرسانی خودکار updated_at برای users
    CREATE TRIGGER IF NOT EXISTS users_updated_at
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- بروزرسانی خودکار updated_at برای stores
    CREATE TRIGGER IF NOT EXISTS stores_updated_at
    AFTER UPDATE ON stores
    BEGIN
      UPDATE stores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- بروزرسانی خودکار updated_at برای products
    CREATE TRIGGER IF NOT EXISTS products_updated_at
    AFTER UPDATE ON products
    BEGIN
      UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- افزایش saves هنگام ذخیره محصول
    CREATE TRIGGER IF NOT EXISTS product_saved_increment
    AFTER INSERT ON saved_products
    BEGIN
      UPDATE products SET saves = saves + 1 WHERE id = NEW.product_id;
    END;

    -- کاهش saves هنگام حذف ذخیره محصول
    CREATE TRIGGER IF NOT EXISTS product_saved_decrement
    AFTER DELETE ON saved_products
    BEGIN
      UPDATE products SET saves = CASE WHEN saves > 0 THEN saves - 1 ELSE 0 END WHERE id = OLD.product_id;
    END;

    -- افزایش total_products هنگام اضافه کردن محصول
    CREATE TRIGGER IF NOT EXISTS store_products_increment
    AFTER INSERT ON products
    BEGIN
      UPDATE stores SET total_products = total_products + 1 WHERE id = NEW.store_id;
    END;

    -- کاهش total_products هنگام حذف محصول
    CREATE TRIGGER IF NOT EXISTS store_products_decrement
    AFTER DELETE ON products
    BEGIN
      UPDATE stores SET total_products = CASE WHEN total_products > 0 THEN total_products - 1 ELSE 0 END WHERE id = OLD.store_id;
    END;
  `);

  logger.info("✅ All triggers created successfully");
};

createTriggers();

// ============================================================================
// 8. Safe Migration System
// ============================================================================

/**
 * اجرای Migration امن
 */
const safeAlter = (sql: string, description = ""): boolean => {
  try {
    db.exec(sql);
    if (description) logger.info(`✅ Migration: ${description}`);
    return true;
  } catch (err: any) {
    const ignorable = ["duplicate column name", "already exists", "no such column"];
    if (!ignorable.some((msg) => err.message.includes(msg))) {
      logger.error(`❌ Migration Error: ${description}`, { error: err.message, sql });
      return false;
    }
    return true;
  }
};

/**
 * اجرای تمام Migration‌های معلق
 */
const runMigrations = () => {
  const currentVersion = getCurrentVersion();
  logger.info(`📊 Current schema version: ${currentVersion}/${SCHEMA_VERSION}`);

  // Migration v1: اضافه کردن ستون‌های جدید
  if (currentVersion < 1) {
    logger.info("🔄 Running migration v1...");
    safeAlter(`ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, "Add users.updated_at");
    safeAlter(`ALTER TABLE users ADD COLUMN total_earned INTEGER DEFAULT 0`, "Add users.total_earned");
    safeAlter(`ALTER TABLE users ADD COLUMN total_withdrawn INTEGER DEFAULT 0`, "Add users.total_withdrawn");
    safeAlter(`ALTER TABLE users ADD COLUMN ban_reason TEXT`, "Add users.ban_reason");
    safeAlter(`ALTER TABLE stores ADD COLUMN phone TEXT`, "Add stores.phone");
    safeAlter(`ALTER TABLE stores ADD COLUMN description TEXT`, "Add stores.description");
    safeAlter(`ALTER TABLE stores ADD COLUMN is_verified BOOLEAN DEFAULT 0`, "Add stores.is_verified");
    safeAlter(`ALTER TABLE stores ADD COLUMN total_products INTEGER DEFAULT 0`, "Add stores.total_products");
    safeAlter(`ALTER TABLE stores ADD COLUMN total_views INTEGER DEFAULT 0`, "Add stores.total_views");
    safeAlter(`ALTER TABLE products ADD COLUMN rejection_reason TEXT`, "Add products.rejection_reason");
    safeAlter(`ALTER TABLE products ADD COLUMN saves INTEGER DEFAULT 0`, "Add products.saves");
    safeAlter(`ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT 0`, "Add products.is_featured");
    safeAlter(`ALTER TABLE products ADD COLUMN featured_until DATETIME`, "Add products.featured_until");

    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(1);
  }

  // Migration v2: backfill location data
  if (currentVersion < 2) {
    logger.info("🔄 Running migration v2...");
    try {
      db.exec(`
        UPDATE products
        SET
          city = (SELECT s.city FROM stores s WHERE s.id = products.store_id),
          province = (SELECT s.province FROM stores s WHERE s.id = products.store_id)
        WHERE (city IS NULL OR province IS NULL)
      `);
      logger.info("✅ Backfilled products location data");
    } catch (err: any) {
      logger.error("❌ Backfill error:", err.message);
    }

    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(2);
  }

  // Migration v3: تنظیم moderation status
  if (currentVersion < 3) {
    logger.info("🔄 Running migration v3...");
    try {
      db.exec(`UPDATE products SET moderation_status = 'approved' WHERE moderation_status IS NULL`);
      logger.info("✅ Updated legacy moderation statuses");
    } catch {}

    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(3);
  }

  // Migration v4: اضافه کردن جداول Referral
  if (currentVersion < 4) {
    logger.info("🔄 Running migration v4 (referral tables)...");
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS referral_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_user_id INTEGER NOT NULL,
          code TEXT NOT NULL UNIQUE,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS referral_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_user_id INTEGER NOT NULL,
          referred_user_id INTEGER NOT NULL,
          code TEXT NOT NULL,
          reward_amount INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_at DATETIME,
          FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(referred_user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_referral_links_owner ON referral_links(owner_user_id);
        CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_user_id, created_at DESC);
      `);
      logger.info("✅ Referral tables created");
    } catch (err: any) {
      logger.error("❌ Migration v4 error:", err.message);
    }

    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(4);
  }

  // Migration v5: اضافه کردن rating به stores
  if (currentVersion < 5) {
    logger.info("🔄 Running migration v5 (add rating to stores)...");
    safeAlter(`ALTER TABLE stores ADD COLUMN rating REAL DEFAULT 4.5`, "Add stores.rating");
    safeAlter(`ALTER TABLE users ADD COLUMN email TEXT UNIQUE`, "Add users.email");
    safeAlter(`ALTER TABLE users ADD COLUMN avatar_url TEXT`, "Add users.avatar_url");
    safeAlter(`ALTER TABLE users ADD COLUMN bio TEXT`, "Add users.bio");
    safeAlter(`ALTER TABLE stores ADD COLUMN slug TEXT UNIQUE`, "Add stores.slug");
    safeAlter(`ALTER TABLE stores ADD COLUMN cover_image_url TEXT`, "Add stores.cover_image_url");
    safeAlter(`ALTER TABLE stores ADD COLUMN total_followers INTEGER DEFAULT 0`, "Add stores.total_followers");
    safeAlter(`ALTER TABLE products ADD COLUMN slug TEXT`, "Add products.slug");
    safeAlter(`ALTER TABLE products ADD COLUMN old_price INTEGER`, "Add products.old_price");
    safeAlter(`ALTER TABLE products ADD COLUMN images TEXT`, "Add products.images");
    safeAlter(`ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'new'`, "Add products.condition");

    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(5);
  }

  logger.info(`✅ Schema is up to date (v${SCHEMA_VERSION})`);
};

runMigrations();

// ============================================================================
// 9. Database Backup
// ============================================================================

/**
 * ایجاد Backup دیتابیس
 */
export const createBackup = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

  try {
    db.backup(backupPath);
    logger.info(`💾 Database backup created: ${backupPath}`);

    // حذف backup‌های قدیمی (نگهداری حداکثر 7 backup)
    const backups = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("backup-"))
      .sort()
      .reverse();

    backups.slice(7).forEach((oldBackup) => {
      try {
        fs.unlinkSync(path.join(backupDir, oldBackup));
        logger.info(`🗑️ Removed old backup: ${oldBackup}`);
      } catch (err) {
        logger.error(`❌ Failed to remove backup ${oldBackup}:`, err);
      }
    });

    return backupPath;
  } catch (err) {
    logger.error("❌ Backup failed:", err);
    throw err;
  }
};

// Backup خودکار هر 24 ساعت
if (process.env.AUTO_BACKUP === "true") {
  setInterval(() => {
    try {
      createBackup();
    } catch (err) {
      logger.error("❌ Auto backup failed:", err);
    }
  }, 24 * 60 * 60 * 1000);

  logger.info("🔄 Auto backup enabled (every 24 hours)");
}

// ============================================================================
// 10. Database Statistics
// ============================================================================

/**
 * دریافت آمار دیتابیس
 */
export const getStats = () => {
  try {
    return db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_profile_complete = 1) as active_users,
          (SELECT COUNT(*) FROM users WHERE is_banned = 1) as banned_users,
          (SELECT COUNT(*) FROM stores) as total_stores,
          (SELECT COUNT(*) FROM stores WHERE is_verified = 1) as verified_stores,
          (SELECT COUNT(*) FROM products) as total_products,
          (SELECT COUNT(*) FROM products WHERE moderation_status = 'approved') as approved_products,
          (SELECT COUNT(*) FROM products WHERE moderation_status = 'pending') as pending_products,
          (SELECT COUNT(*) FROM reviews) as total_reviews,
          (SELECT COUNT(*) FROM saved_products) as total_saves,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM transactions) as total_transactions,
          (SELECT SUM(wallet_balance) FROM users) as total_wallet_balance,
          (SELECT COUNT(*) FROM referral_events WHERE status = 'approved') as completed_referrals
      `)
      .get();
  } catch (err) {
    logger.error("❌ Failed to get stats:", err);
    return null;
  }
};

// ============================================================================
// 11. Graceful Shutdown
// ============================================================================

/**
 * بستن ایمن دیتابیس
 */
const closeDatabase = () => {
  logger.info("🔒 Closing SQLite database safely...");
  try {
    if (process.env.BACKUP_ON_SHUTDOWN === "true") {
      createBackup();
    }
    db.close();
    logger.info("✅ Database closed successfully");
  } catch (err) {
    logger.error("❌ Error closing database", err);
  }
  process.exit(0);
};

// Handle graceful shutdown
process.on("SIGINT", closeDatabase);
process.on("SIGTERM", closeDatabase);

// ============================================================================
// 12. Export
// ============================================================================

export default db;

/**
 * Type Definitions
 */
export type {
  Database as DatabaseType,
};