import type { EnrichedListing, GeoPoint } from "./types";

export interface StoreCluster {
  key: string;
  items: EnrichedListing[];
  center: GeoPoint;
}

/**
 * خوشه‌بندی قطعی و سبک برای مارکرهای نقشه.
 * اندازه سلول با zoom تغییر می‌کند؛ داده‌ها فقط برای نمایش گروه‌بندی می‌شوند و تغییری در موجودی نمی‌دهند.
 */
export function clusterStores(listings: readonly EnrichedListing[], zoom: number): StoreCluster[] {
  const safeZoom = Number.isFinite(zoom) ? Math.min(22, Math.max(1, zoom)) : 14;
  const cellSize = 0.08 / 2 ** Math.max(0, safeZoom - 10);
  const buckets = new Map<string, EnrichedListing[]>();

  for (const listing of listings) {
    if (!Number.isFinite(listing.store.lat) || !Number.isFinite(listing.store.lng)) continue;
    const key = `${Math.floor(listing.store.lat / cellSize)}:${Math.floor(listing.store.lng / cellSize)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(listing);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries()).map(([key, items]) => ({
    key,
    items,
    center: {
      lat: items.reduce((sum, item) => sum + item.store.lat, 0) / items.length,
      lng: items.reduce((sum, item) => sum + item.store.lng, 0) / items.length,
    },
  }));
}
