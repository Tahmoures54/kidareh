/**
 * SQLite FTS5 indexes for Persian product & store search
 */

import db from "../db.js";
import logger from "../logger.js";
import { normalizePersian, buildFtsMatchQuery } from "./persianText.js";
import { installProductFtsTriggers, installStoreFtsTriggers } from "./ftsTriggers.js";

let ftsReady = false;

function tableExists(name: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = ?")
    .get(name) as { name: string } | undefined;
  return !!row;
}

export function ensureFts(): void {
  if (ftsReady) return;

  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_probe USING fts5(x)`);
    db.exec(`DROP TABLE IF EXISTS _fts5_probe`);
  } catch (err: any) {
    logger.error("FTS5 not available in this SQLite build:", err?.message);
    return;
  }

  try {
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
      logger.info("Created products_fts");
    }

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
      logger.info("Created stores_fts");
    }

    createProductTriggers();
    createStoreTriggers();

    const pCount = (db.prepare("SELECT COUNT(*) AS c FROM products_fts").get() as any)?.c ?? 0;
    const prodTotal = (db.prepare("SELECT COUNT(*) AS c FROM products").get() as any)?.c ?? 0;
    if (pCount !== prodTotal) rebuildProductsFts();

    const sCount = (db.prepare("SELECT COUNT(*) AS c FROM stores_fts").get() as any)?.c ?? 0;
    const storeTotal = (db.prepare("SELECT COUNT(*) AS c FROM stores").get() as any)?.c ?? 0;
    if (sCount !== storeTotal) rebuildStoresFts();

    ftsReady = true;
    logger.info("FTS5 ready (products + stores)");
  } catch (err: any) {
    logger.error("ensureFts failed:", err?.message);
  }
}

function createProductTriggers() {
  installProductFtsTriggers(db);
}

function createStoreTriggers() {
  installStoreFtsTriggers(db);
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
  logger.info("products_fts rebuilt");
}

export function rebuildStoresFts(): void {
  const tx = db.transaction(() => {
    db.exec(`DELETE FROM stores_fts`);
    const rows = db
      .prepare(`SELECT id, name, description, category, city, province, address FROM stores`)
      .all() as any[];
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
  logger.info("stores_fts rebuilt");
}

export function searchProductIdsFts(rawQuery: string, limit = 500): number[] {
  if (!ftsReady && !tableExists("products_fts")) return [];
  const match = buildFtsMatchQuery(rawQuery);
  if (!match) return [];
  try {
    const rows = db
      .prepare(
        `SELECT rowid AS id FROM products_fts
         WHERE products_fts MATCH ?
         ORDER BY bm25(products_fts)
         LIMIT ?`
      )
      .all(match, limit) as { id: number }[];
    return rows.map((r) => r.id);
  } catch (err: any) {
    logger.warn("products FTS MATCH error:", err?.message);
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
        `SELECT rowid AS id FROM stores_fts
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
