import type { EnrichedListing } from "./types";

export interface ListingCluster<T extends EnrichedListing = EnrichedListing> {
  id: string;
  lat: number;
  lng: number;
  listings: T[];
}

/**
 * خوشه‌بندی سبک برای نقشه:
 * در zoom پایین، نقاط داخل یک سلول جغرافیایی جمع می‌شوند؛ از zoom 17 به بعد
 * هر فروشگاه مستقل نمایش داده می‌شود تا انتخاب دقیق ممکن باشد.
 */
export function clusterListings<T extends EnrichedListing>(
  listings: readonly T[],
  zoom: number,
): ListingCluster<T>[] {
  if (zoom >= 17) {
    return listings.map((listing) => ({
      id: `store:${listing.storeId}`,
      lat: listing.store.lat,
      lng: listing.store.lng,
      listings: [listing],
    }));
  }

  const cellSize = 90 / 2 ** Math.max(1, zoom);
  const buckets = new Map<string, T[]>();

  for (const listing of listings) {
    const { lat, lng } = listing.store;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const row = Math.floor(lat / cellSize);
    const column = Math.floor(lng / cellSize);
    const key = `cell:${row}:${column}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(listing);
    else buckets.set(key, [listing]);
  }

  return [...buckets.entries()].map(([id, items]) => ({
    id,
    lat: items.reduce((sum, item) => sum + item.store.lat, 0) / items.length,
    lng: items.reduce((sum, item) => sum + item.store.lng, 0) / items.length,
    listings: items,
  }));
}
