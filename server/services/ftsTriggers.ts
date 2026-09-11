/**
 * FTS5 sync triggers. SQLite 3.45 rejects
 * INSERT INTO <fts>(<fts>, rowid) VALUES('delete', id)
 * with "SQL logic error". DELETE FROM rowid works.
 */

const NORM_SQL = (col: string) =>
  `REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${col}, ''), char(1610), char(1740)), char(1603), char(1705)), char(8204), ' '), char(1600), '')`;

export interface ExecDb {
  exec(sql: string): unknown;
}

export function installProductFtsTriggers(database: ExecDb): void {
  database.exec(`
    DROP TRIGGER IF EXISTS products_fts_ai;
    DROP TRIGGER IF EXISTS products_fts_ad;
    DROP TRIGGER IF EXISTS products_fts_au;

    CREATE TRIGGER products_fts_ai AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(rowid, name, description, category, store_name, city)
      VALUES (
        NEW.id,
        ${NORM_SQL("NEW.name")},
        ${NORM_SQL("NEW.description")},
        ${NORM_SQL("NEW.category")},
        ${NORM_SQL("(SELECT name FROM stores WHERE id = NEW.store_id)")},
        ${NORM_SQL("NEW.city")}
      );
    END;

    CREATE TRIGGER products_fts_ad AFTER DELETE ON products BEGIN
      DELETE FROM products_fts WHERE rowid = OLD.id;
    END;

    CREATE TRIGGER products_fts_au AFTER UPDATE ON products BEGIN
      DELETE FROM products_fts WHERE rowid = OLD.id;
      INSERT INTO products_fts(rowid, name, description, category, store_name, city)
      VALUES (
        NEW.id,
        ${NORM_SQL("NEW.name")},
        ${NORM_SQL("NEW.description")},
        ${NORM_SQL("NEW.category")},
        ${NORM_SQL("(SELECT name FROM stores WHERE id = NEW.store_id)")},
        ${NORM_SQL("NEW.city")}
      );
    END;
  `);
}

export function installStoreFtsTriggers(database: ExecDb): void {
  database.exec(`
    DROP TRIGGER IF EXISTS stores_fts_ai;
    DROP TRIGGER IF EXISTS stores_fts_ad;
    DROP TRIGGER IF EXISTS stores_fts_au;
    DROP TRIGGER IF EXISTS stores_fts_name_cascade;

    CREATE TRIGGER stores_fts_ai AFTER INSERT ON stores BEGIN
      INSERT INTO stores_fts(rowid, name, description, category, city, province, address)
      VALUES (
        NEW.id,
        ${NORM_SQL("NEW.name")},
        ${NORM_SQL("NEW.description")},
        ${NORM_SQL("NEW.category")},
        ${NORM_SQL("NEW.city")},
        ${NORM_SQL("NEW.province")},
        ${NORM_SQL("NEW.address")}
      );
    END;

    CREATE TRIGGER stores_fts_ad AFTER DELETE ON stores BEGIN
      DELETE FROM stores_fts WHERE rowid = OLD.id;
    END;

    CREATE TRIGGER stores_fts_au AFTER UPDATE ON stores BEGIN
      DELETE FROM stores_fts WHERE rowid = OLD.id;
      INSERT INTO stores_fts(rowid, name, description, category, city, province, address)
      VALUES (
        NEW.id,
        ${NORM_SQL("NEW.name")},
        ${NORM_SQL("NEW.description")},
        ${NORM_SQL("NEW.category")},
        ${NORM_SQL("NEW.city")},
        ${NORM_SQL("NEW.province")},
        ${NORM_SQL("NEW.address")}
      );
    END;

    CREATE TRIGGER stores_fts_name_cascade AFTER UPDATE OF name ON stores BEGIN
      UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE store_id = NEW.id;
    END;
  `);
}
