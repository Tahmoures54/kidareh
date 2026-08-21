/**
 * SQLite FTS5 indexes for Persian product & store search
 */

import db from "../db.js";
import logger from "../logger.js";
import { normalizePersian, buildFtsMatchQuery } from "./persianText.js";

let ftsReady = false;

function tableExists(name: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = ?")
    .get(name) as { name: string } | undefined;
  return !!row;
}

/** Create FTS tables + triggers + initial backfill */
export function ensureFts(): void {
  if (ftsReady) return;

  try {
    // Verify FTS5 is available
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_probe USING fts5(x)`);
    db.exec(`DROP TABLE IF EXISTS _fts5_probe`);
  } catch (err: any) {
    logger.error("FTS5 not available in this SQLite build:", err?.message);
    return;
  }

  try {
    // ── products_fts ──
    if (!tableExists("products_fts")) {
      db.exec(`
        CREATE VIRTUAL TABLE products_fts USING fts5(
          name,
          description,
          category,
          store_name,
          city,
          tokenize = 'unicode61 remove_diacritics 2'
        );
      `);
      logger.info("✅ Created products_fts");
    }

    // ── stores_fts ──
    if (!tableExists("stores_fts")) {
      db.exec(`
        CREATE VIRTUAL TABLE stores_fts USING fts5(
          name,
          description,
          category,
          city,
          province,
          address,
          tokenize = 'unicode61 remove_diacritics 2'
        );
      `);
      logger.info("✅ Created stores_fts");
    }

    createProductTriggers();
    createStoreTriggers();

    // Backfill if empty
    const pCount = (db.prepare("SELECT COUNT(*) AS c FROM products_fts").get() as any)?.c ?? 0;
    const prodTotal = (db.prepare("SELECT COUNT(*) AS c FROM products").get() as any)?.c ?? 0;
    if (pCount === 0 && prodTotal > 0) {
      rebuildProductsFts();
    }

    const sCount = (db.prepare("SELECT COUNT(*) AS c FROM stores_fts").get() as any)?.c ?? 0;
    const storeTotal = (db.prepare("SELECT COUNT(*) AS c FROM stores").get() as any)?.c ?? 0;
    if (sCount === 0 && storeTotal > 0) {
      rebuildStoresFts();
    }

    ftsReady = true;
    logger.info("✅ FTS5 ready (products + stores)");
  } catch (err: any) {
    logger.error("ensureFts failed:", err?.message);
  }
}

function createProductTriggers() {
  db.exec(`
    DROP TRIGGER IF EXISTS products_fts_ai;
    DROP TRIGGER IF EXISTS products_fts_ad;
    DROP TRIGGER IF EXISTS products_fts_au;

    CREATE TRIGGER products_fts_ai AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(rowid, name, description, category, store_name, city)
      VALUES (
        NEW.id,
        NEW.name,
        COALESCE(NEW.description, ''),
        COALESCE(NEW.category, ''),
        COALESCE((SELECT name FROM stores WHERE id = NEW.store_id), ''),
        COALESCE(NEW.city, '')
      );
    END;

    CREATE TRIGGER products_fts_ad AFTER DELETE ON products BEGIN
      INSERT INTO products_fts(products_fts, rowid) VALUES('delete', OLD.id);
    END;

    CREATE TRIGGER products_fts_au AFTER UPDATE ON products BEGIN
      INSERT INTO products_fts(products_fts, rowid) VALUES('delete', OLD.id);
      INSERT INTO products_fts(rowid, name, description, category, store_name, city)
      VALUES (
        NEW.id,
        NEW.name,
        COALESCE(NEW.description, ''),
        COALESCE(NEW.category, ''),
        COALESCE((SELECT name FROM stores WHERE id = NEW.store_id), ''),
        COALESCE(NEW.city, '')
      );
    END;
  `);
}

function createStoreTriggers() {
  db.exec(`
    DROP TRIGGER IF EXISTS stores_fts_ai;
    DROP TRIGGER IF EXISTS stores_fts_ad;
    DROP TRIGGER IF EXISTS stores_fts_au;
    DROP TRIGGER IF EXISTS stores_fts_name_cascade;

    CREATE TRIGGER stores_fts_ai AFTER INSERT ON stores BEGIN
      INSERT INTO stores_fts(rowid, name, description, category, city, province, address)
      VALUES (
        NEW.id,
        NEW.name,
        COALESCE(NEW.description, ''),
        COALESCE(NEW.category, ''),
        COALESCE(NEW.city, ''),
        COALESCE(NEW.province, ''),
        COALESCE(NEW.address, '')
      );
    END;

    CREATE TRIGGER stores_fts_ad AFTER DELETE ON stores BEGIN
      INSERT INTO stores_fts(stores_fts, rowid) VALUES('delete', OLD.id);
    END;

    CREATE TRIGGER stores_fts_au AFTER UPDATE ON stores BEGIN
      INSERT INTO stores_fts(stores_fts, rowid) VALUES('delete', OLD.id);
      INSERT INTO stores_fts(rowid, name, description, category, city, province, address)
      VALUES (
        NEW.id,
        NEW.name,
        COALESCE(NEW.description, ''),
        COALESCE(NEW.category, ''),
        COALESCE(NEW.city, ''),
        COALESCE(NEW.province, ''),
        COALESCE(NEW.address, '')
      );
    END;

    -- When store name changes, refresh product FTS store_name field
    CREATE TRIGGER stores_fts_name_cascade AFTER UPDATE OF name ON stores BEGIN
      UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE store_id = NEW.id;
    END;
  `);
}

export function rebuildProductsFts(): void {
  const tx = db.transaction(() => {
    db.exec(`DELETE FROM products_fts`);
    const rows = db
      .prepare(
        `SELECT p.id, p.name, p.description, p.category, p.city, s.name AS store_name
         FROM products p LEFT JOIN stores s ON s.id = p.store_id`
      )
      .all() as any[];

    const ins = db.prepare(
      `INSERT INTO products_fts(rowid, name, description, category, store_name, city)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const r of rows) {
      ins.run(
        r.id,
        normalizePersian(r.name),
        normalizePersian(r.description),
        normalizePersian(r.category),
        normalizePersian(r.store_name),
        normalizePersian(r.city)
      );
    }
  });
  tx();
  logger.info(`🔄 products_fts rebuilt`);
}

export function rebuildStoresFts(): void {
  const tx = db.transaction(() => {
    db.exec(`DELETE FROM stores_fts`);
    const rows = db.prepare(`SELECT id, name, description, category, city, province, address FROM stores`).all() as any[];
    const ins = db.prepare(
      `INSERT INTO stores_fts(rowid, name, description, category, city, province, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of rows) {
      ins.run(
        r.id,
        normalizePersian(r.name),
        normalizePersian(r.description),
        normalizePersian(r.category),
        normalizePersian(r.city),
        normalizePersian(r.province),
        normalizePersian(r.address)
      );
    }
  });
  tx();
  logger.info(`🔄 stores_fts rebuilt`);
}

/**
 * Returns ordered product rowids matching FTS query (best rank first).
 * Empty array if no match or FTS unavailable.
 */
export function searchProductIdsFts(rawQuery: string, limit = 500): number[] {
  if (!ftsReady && !tableExists("products_fts")) return [];
  const match = buildFtsMatchQuery(rawQuery);
  if (!match) return [];

  try {
    const rows = db
      .prepare(
        `SELECT rowid AS id
         FROM products_fts
         WHERE products_fts MATCH ?
         ORDER BY bm25(products_fts)
         LIMIT ?`
      )
      .all(match, limit) as { id: number }[];
    return rows.map((r) => r.id);
  } catch (err: any) {
    // malformed MATCH → empty (caller may fall back to LIKE)
    logger.warn("products FTS MATCH error:", err?.message, "query:", match);
    return [];
  }
}

export function searchStoreIdsFts(rawQuery: string, limit = 500): number[] {
  if (!ftsReady && !tableExists("stores_fts")) return [];
  const match = buildFtsMatchQuery(rawQuery);
  if (!match) return [];

  try {
    const rows = db
      .prepare(
        `SELECT rowid AS id
         FROM stores_fts
         WHERE stores_fts MATCH ?
         ORDER BY bm25(stores_fts)
         LIMIT ?`
      )
      .all(match, limit) as { id: number }[];
    return rows.map((r) => r.id);
  } catch (err: any) {
    logger.warn("stores FTS MATCH error:", err?.message);
    return [];
  }
}

export function isFtsReady(): boolean {
  return ftsReady || tableExists("products_fts");
}
