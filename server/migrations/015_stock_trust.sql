-- Kidareh migration 015: stock freshness and confidence.
-- Idempotent equivalent of the migration in server/db.ts.
ALTER TABLE products ADD COLUMN last_stock_confirmed_at TEXT;
ALTER TABLE products ADD COLUMN stock_confidence REAL NOT NULL DEFAULT 0.5
  CHECK (stock_confidence >= 0 AND stock_confidence <= 1);
CREATE INDEX IF NOT EXISTS idx_products_stock_confirmation
  ON products(last_stock_confirmed_at, stock_confidence);
