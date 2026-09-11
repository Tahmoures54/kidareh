import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { installProductFtsTriggers, installStoreFtsTriggers } from "../../../server/services/ftsTriggers";

function memoryMarketplace() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      city TEXT,
      province TEXT,
      address TEXT,
      total_products INTEGER DEFAULT 0,
      total_followers INTEGER DEFAULT 0,
      updated_at TEXT
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      city TEXT,
      status TEXT,
      views INTEGER DEFAULT 0,
      updated_at TEXT
    );
    CREATE TABLE store_followers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL
    );
    CREATE VIRTUAL TABLE products_fts USING fts5(
      name, description, category, store_name, city,
      tokenize = 'unicode61 remove_diacritics 2'
    );
    CREATE VIRTUAL TABLE stores_fts USING fts5(
      name, description, category, city, province, address,
      tokenize = 'unicode61 remove_diacritics 2'
    );
    CREATE TRIGGER store_products_inc AFTER INSERT ON products BEGIN
      UPDATE stores SET total_products = total_products + 1 WHERE id = NEW.store_id;
    END;
    CREATE TRIGGER followers_inc AFTER INSERT ON store_followers BEGIN
      UPDATE stores SET total_followers = total_followers + 1 WHERE id = NEW.store_id;
    END;
  `);
  installProductFtsTriggers(db);
  installStoreFtsTriggers(db);
  return db;
}

describe("FTS marketplace write path", () => {
  it("lets product create, store update, follow, and view increment succeed", () => {
    const db = memoryMarketplace();

    db.prepare(
      `INSERT INTO stores (user_id, name, description, category, city, province, address)
       VALUES (1, 'مغازه من', '', 'عمومی', 'تهران', 'تهران', 'شهر تهران')`
    ).run();

    expect(() => {
      db.prepare("UPDATE stores SET name = ? WHERE id = 1").run("ویترین گل یاس");
    }).not.toThrow();

    expect(() => {
      db.prepare(
        `INSERT INTO products (store_id, name, description, category, city, status)
         VALUES (1, 'گلدان سرامیک', 'دست‌ساز', 'خانه', 'تهران', 'موجود')`
      ).run();
    }).not.toThrow();

    expect(() => {
      db.prepare("INSERT INTO store_followers (user_id, store_id) VALUES (2, 1)").run();
    }).not.toThrow();

    expect(() => {
      db.prepare("UPDATE products SET views = views + 1 WHERE id = 1").run();
    }).not.toThrow();

    const store = db.prepare("SELECT name, total_products, total_followers FROM stores WHERE id = 1").get() as any;
    expect(store.name).toBe("ویترین گل یاس");
    expect(store.total_products).toBe(1);
    expect(store.total_followers).toBe(1);

    const productFts = db.prepare("SELECT name, store_name FROM products_fts WHERE rowid = 1").get() as any;
    expect(productFts.name).toBe("گلدان سرامیک");
    expect(productFts.store_name).toBe("ویترین گل یاس");

    const storeFts = db.prepare("SELECT name FROM stores_fts WHERE rowid = 1").get() as any;
    expect(storeFts.name).toBe("ویترین گل یاس");

    db.close();
  });
});
