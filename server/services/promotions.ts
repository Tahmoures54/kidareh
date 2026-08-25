/**
 * Promotions — based on seller psychology analysis:
 * tangible visibility (banner) + ranked badges + trial + ROI stats
 */

import db from "../db.js";
import logger from "../logger.js";

export type PackageId =
  | "trial_boost_3d"
  | "search_boost_7d"
  | "search_boost_30d"
  | "homepage_banner_7d"
  | "homepage_banner_30d"
  | "visibility_bundle_7d"
  | "blue_tick_30d";

export interface PromoPackage {
  id: PackageId;
  name: string;
  desc: string;
  price: number; // تومان
  days: number;
  features: {
    searchBoost?: boolean;
    homepageBanner?: boolean;
    blueTick?: boolean;
    productFeature?: boolean;
  };
  psychologyHook: string; // why seller buys
  trial?: boolean;
}

/** Catalog aligned with psych analysis */
export const PROMO_CATALOG: PromoPackage[] = [
  {
    id: "trial_boost_3d",
    name: "آزمایش دیده شدن (۳ روز)",
    desc: "اولویت در جستجوی شهر شما — بدون ریسک، اثر را ببینید",
    price: 9000,
    days: 3,
    features: { searchBoost: true, productFeature: true },
    psychologyHook: "پکیج آزمایشی کوچک قبل از تعهد",
    trial: true,
  },
  {
    id: "search_boost_7d",
    name: "نشان ویژه جستجو (۷ روز)",
    desc: "کالاهایتان بالاتر از نتایج عادی در همان شهر/دسته نمایش داده می‌شوند",
    price: 49000,
    days: 7,
    features: { searchBoost: true, productFeature: true },
    psychologyHook: "اثر رتبه واقعی، نه فقط برچسب رنگی",
  },
  {
    id: "search_boost_30d",
    name: "نشان ویژه جستجو (۳۰ روز)",
    desc: "یک ماه اولویت در نتایج جستجو",
    price: 149000,
    days: 30,
    features: { searchBoost: true, productFeature: true },
    psychologyHook: "تعهد ماهانه با تخفیف نسبت به هفتگی",
  },
  {
    id: "homepage_banner_7d",
    name: "بنر صفحه اصلی (۷ روز)",
    desc: "نمایش فروشگاه شما در بنر بالای صفحه اصلی برای کاربران همان شهر — با برچسب آگهی",
    price: 99000,
    days: 7,
    features: { homepageBanner: true },
    psychologyHook: "ملموس مثل ویترین — عکس مغازه بالای صفحه",
  },
  {
    id: "homepage_banner_30d",
    name: "بنر صفحه اصلی (۳۰ روز)",
    desc: "یک ماه حضور در بنر اسپانسر محلی",
    price: 299000,
    days: 30,
    features: { homepageBanner: true },
    psychologyHook: "اجاره ویترین دیجیتال ماهانه",
  },
  {
    id: "visibility_bundle_7d",
    name: "بسته دیده شدن کامل (۷ روز)",
    desc: "بنر صفحه اصلی + اولویت جستجو + نشان ویژه روی کالاها",
    price: 129000,
    days: 7,
    features: { homepageBanner: true, searchBoost: true, productFeature: true },
    psychologyHook: "باندل — ارزش بیشتر از خرید جداگانه",
  },
  {
    id: "blue_tick_30d",
    name: "تیک آبی فروشگاه (۳۰ روز)",
    desc: "نماد اعتماد برای خریدار حضوری — جواز/اعتبار",
    price: 79000,
    days: 30,
    features: { blueTick: true },
    psychologyHook: "هویت حرفه‌ای و اعتماد قبل از مراجعه",
  },
];

export function getPackage(id: string): PromoPackage | undefined {
  return PROMO_CATALOG.find((p) => p.id === id);
}

export function ensurePromotionTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sponsored_slots (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_id    TEXT    NOT NULL,
      city          TEXT    NOT NULL,
      title         TEXT,
      image_url     TEXT,
      status        TEXT    NOT NULL DEFAULT 'active'
                            CHECK(status IN ('pending','active','expired','cancelled')),
      starts_at     TEXT    NOT NULL,
      ends_at       TEXT    NOT NULL,
      impressions   INTEGER DEFAULT 0,
      clicks        INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS store_promotions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_id    TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'active'
                            CHECK(status IN ('active','expired','cancelled')),
      search_boost  INTEGER DEFAULT 0,
      starts_at     TEXT    NOT NULL,
      ends_at       TEXT    NOT NULL,
      views_at_start INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sponsored_city_active
      ON sponsored_slots(city, status, ends_at);
    CREATE INDEX IF NOT EXISTS idx_store_promo_active
      ON store_promotions(store_id, status, ends_at);
  `);

  // default settings prices (optional override)
  const defaults: Array<[string, string, string]> = [
    ["PROMO_ENABLED", "true", "فعال بودن سیستم تبلیغات"],
    ["PROMO_MAX_BANNERS_PER_CITY", "5", "حداکثر بنر فعال همزمان در هر شهر"],
  ];
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`
  );
  for (const row of defaults) stmt.run(...row);

  expireStalePromotions();
  logger.info("Promotion tables ready");
}

export function expireStalePromotions(): void {
  try {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE sponsored_slots SET status = 'expired'
       WHERE status = 'active' AND ends_at < ?`
    ).run(now);
    db.prepare(
      `UPDATE store_promotions SET status = 'expired'
       WHERE status = 'active' AND ends_at < ?`
    ).run(now);
    // clear featured flags when promo ends
    db.prepare(
      `UPDATE products SET is_featured = 0, featured_until = NULL, badge = NULL
       WHERE is_featured = 1 AND featured_until IS NOT NULL AND featured_until < ?`
    ).run(now);
  } catch (err) {
    logger.warn("expireStalePromotions:", err);
  }
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Activate package after successful payment */
export function activatePromotionPackage(
  userId: number,
  packageId: string
): { ok: boolean; error?: string } {
  const pkg = getPackage(packageId);
  if (!pkg) return { ok: false, error: "پکیج نامعتبر" };

  const store = db
    .prepare(`SELECT id, city, name, image_url, total_views FROM stores WHERE user_id = ?`)
    .get(userId) as any;
  if (!store) return { ok: false, error: "ابتدا فروشگاه خود را تکمیل کنید" };

  const now = new Date();
  const ends = addDays(now, pkg.days);
  const startsAt = now.toISOString();
  const endsAt = ends.toISOString();

  const tx = db.transaction(() => {
    if (pkg.features.blueTick) {
      const current = db
        .prepare(`SELECT blue_tick_expires_at FROM stores WHERE id = ?`)
        .get(store.id) as any;
      let base = current?.blue_tick_expires_at
        ? new Date(current.blue_tick_expires_at)
        : now;
      if (base < now) base = now;
      const tickEnd = addDays(base, pkg.days);
      db.prepare(
        `UPDATE stores SET blue_tick_expires_at = ?, is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(tickEnd.toISOString(), store.id);
    }

    if (pkg.features.searchBoost || pkg.features.productFeature) {
      db.prepare(
        `INSERT INTO store_promotions
          (store_id, user_id, package_id, status, search_boost, starts_at, ends_at, views_at_start)
         VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`
      ).run(
        store.id,
        userId,
        pkg.id,
        pkg.features.searchBoost ? 1 : 0,
        startsAt,
        endsAt,
        Number(store.total_views ?? 0)
      );

      // feature all approved products of store for ranking
      db.prepare(
        `UPDATE products
         SET is_featured = 1,
             featured_until = ?,
             badge = COALESCE(badge, 'ویژه'),
             updated_at = CURRENT_TIMESTAMP
         WHERE store_id = ? AND moderation_status = 'approved'`
      ).run(endsAt, store.id);
    }

    if (pkg.features.homepageBanner) {
      const maxRow = db
        .prepare(`SELECT value FROM settings WHERE key = 'PROMO_MAX_BANNERS_PER_CITY'`)
        .get() as any;
      const maxBanners = Number(maxRow?.value ?? 5);
      const activeCount = (
        db
          .prepare(
            `SELECT COUNT(*) AS c FROM sponsored_slots
             WHERE city = ? AND status = 'active' AND ends_at > ?`
          )
          .get(store.city || "تهران", startsAt) as any
      )?.c ?? 0;

      if (activeCount >= maxBanners) {
        // still allow — queue is rotation; just log
        logger.info(`City ${store.city} has ${activeCount} active banners (max ${maxBanners})`);
      }

      db.prepare(
        `INSERT INTO sponsored_slots
          (store_id, user_id, package_id, city, title, image_url, status, starts_at, ends_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      ).run(
        store.id,
        userId,
        pkg.id,
        store.city || "تهران",
        store.name,
        store.image_url || null,
        startsAt,
        endsAt
      );
    }
  });

  tx();
  logger.info(`Promotion activated: ${packageId} for store ${store.id} user ${userId}`);
  return { ok: true };
}

/** Active homepage banners for a city (public) */
export function getActiveSponsoredBanners(city: string, limit = 5) {
  expireStalePromotions();
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `
      SELECT ss.id, ss.store_id, ss.title, ss.image_url, ss.city, ss.ends_at,
             s.name AS store_name, s.category, s.address,
             s.has_business_license, s.is_verified, s.blue_tick_expires_at
      FROM sponsored_slots ss
      JOIN stores s ON s.id = ss.store_id
      WHERE ss.status = 'active'
        AND ss.ends_at > ?
        AND (ss.city = ? OR ? = '')
      ORDER BY ss.created_at DESC
      LIMIT ?
    `
    )
    .all(now, city || "", city || "", limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    storeId: r.store_id,
    title: r.title || r.store_name,
    imageUrl: r.image_url,
    city: r.city,
    category: r.category,
    address: r.address,
    verified: Boolean(r.is_verified || r.has_business_license),
    blueTick: r.blue_tick_expires_at && new Date(r.blue_tick_expires_at) > new Date(),
    endsAt: r.ends_at,
    isAd: true as const, // mandatory label for trust
  }));
}

export function recordBannerImpression(slotId: number) {
  try {
    db.prepare(`UPDATE sponsored_slots SET impressions = impressions + 1 WHERE id = ?`).run(slotId);
  } catch {}
}

export function recordBannerClick(slotId: number) {
  try {
    db.prepare(`UPDATE sponsored_slots SET clicks = clicks + 1 WHERE id = ?`).run(slotId);
  } catch {}
}

/** Seller ROI: views before promo vs now + banner metrics */
export function getSellerPromoStats(userId: number) {
  expireStalePromotions();
  const store = db.prepare(`SELECT id, total_views, name FROM stores WHERE user_id = ?`).get(userId) as any;
  if (!store) return null;

  const promos = db
    .prepare(
      `SELECT * FROM store_promotions WHERE store_id = ? ORDER BY created_at DESC LIMIT 20`
    )
    .all(store.id) as any[];

  const banners = db
    .prepare(
      `SELECT * FROM sponsored_slots WHERE store_id = ? ORDER BY created_at DESC LIMIT 20`
    )
    .all(store.id) as any[];

  const nowViews = Number(store.total_views ?? 0);

  return {
    storeId: store.id,
    storeName: store.name,
    currentViews: nowViews,
    promos: promos.map((p) => ({
      packageId: p.package_id,
      status: p.status,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      viewsAtStart: p.views_at_start,
      viewsDelta: nowViews - Number(p.views_at_start ?? 0),
      searchBoost: Boolean(p.search_boost),
    })),
    banners: banners.map((b) => ({
      id: b.id,
      packageId: b.package_id,
      status: b.status,
      city: b.city,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      impressions: b.impressions,
      clicks: b.clicks,
      ctr: b.impressions > 0 ? Math.round((b.clicks / b.impressions) * 1000) / 10 : 0,
    })),
  };
}

/** Store IDs with active search boost (for ranking) */
export function getBoostedStoreIds(city?: string): Set<number> {
  expireStalePromotions();
  const now = new Date().toISOString();
  let rows: any[];
  if (city) {
    rows = db
      .prepare(
        `SELECT sp.store_id FROM store_promotions sp
         JOIN stores s ON s.id = sp.store_id
         WHERE sp.status = 'active' AND sp.search_boost = 1 AND sp.ends_at > ?
           AND s.city = ?`
      )
      .all(now, city) as any[];
  } else {
    rows = db
      .prepare(
        `SELECT store_id FROM store_promotions
         WHERE status = 'active' AND search_boost = 1 AND ends_at > ?`
      )
      .all(now) as any[];
  }
  return new Set(rows.map((r) => Number(r.store_id)));
}
