-- Kidareh migration 014: persistent trip plans and per-item route snapshots.
-- Safe to run repeatedly; server/db.ts applies the same migration transactionally.
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_lat REAL NOT NULL,
  origin_lng REAL NOT NULL,
  origin_label TEXT NOT NULL DEFAULT 'موقعیت شما',
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'started', 'completed', 'cancelled')),
  total_walk_minutes INTEGER NOT NULL DEFAULT 0 CHECK (total_walk_minutes >= 0),
  total_km REAL NOT NULL DEFAULT 0 CHECK (total_km >= 0),
  total_toman INTEGER NOT NULL DEFAULT 0 CHECK (total_toman >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trip_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  stop_order INTEGER NOT NULL CHECK (stop_order >= 1),
  item_order INTEGER NOT NULL CHECK (item_order >= 1),
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_address TEXT NOT NULL DEFAULT '',
  store_phone TEXT NOT NULL DEFAULT '',
  store_open_hour INTEGER NOT NULL,
  store_close_hour INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  price_toman INTEGER NOT NULL CHECK (price_toman >= 0),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  walk_from_previous_minutes INTEGER NOT NULL DEFAULT 0 CHECK (walk_from_previous_minutes >= 0),
  arrival_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'arrived', 'skipped')),
  arrived_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (trip_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_trips_user_updated ON trips(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_items_trip_stop ON trip_items(trip_id, stop_order, item_order);
CREATE INDEX IF NOT EXISTS idx_trip_items_arrival_token ON trip_items(trip_id, stop_order, arrival_token_hash, status);
