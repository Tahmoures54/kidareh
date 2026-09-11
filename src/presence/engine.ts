import { CATEGORY_META, DEFAULT_ORIGIN, LISTINGS, NEIGHBORHOODS, STORES } from "./catalog";
import {
  formatKm,
  formatWalk,
  haversineKm,
  isOpenAt,
  minutesUntilClose,
  orderByWalk,
  toFa,
  walkMinutes,
} from "./geo";
import type {
  EnrichedListing,
  GeoPoint,
  HoldRecord,
  Neighborhood,
  PresenceListing,
  PresenceOrigin,
  PresenceQuery,
  PresenceStore,
  RadarGroup,
  TripPlan,
} from "./types";

const storeById = new Map(STORES.map((s) => [s.id, s]));
const listingById = new Map(LISTINGS.map((l) => [l.id, l]));
const neighborhoodById = new Map(NEIGHBORHOODS.map((n) => [n.id, n]));

export function getNeighborhood(id: string): Neighborhood | undefined {
  return neighborhoodById.get(id as Neighborhood["id"]);
}

export function getStore(id: string): PresenceStore | undefined {
  return storeById.get(id);
}

export function getListing(id: string): PresenceListing | undefined {
  return listingById.get(id);
}

export function freshnessLabel(minutesAgo: number): string {
  if (minutesAgo <= 2) return "همین الآن به‌روز شد";
  if (minutesAgo < 60) return `${toFa(minutesAgo)} دقیقه پیش`;
  const hours = Math.round(minutesAgo / 60);
  return `${toFa(hours)} ساعت پیش`;
}

export function stockLabel(stock: number): string {
  if (stock <= 0) return "ناموجود";
  if (stock === 1) return "فقط ۱ عدد";
  if (stock <= 3) return `فقط ${toFa(stock)} عدد`;
  return `${toFa(stock)} عدد در ویترین`;
}

export function enrichListing(
  listing: PresenceListing,
  origin: GeoPoint,
  at: Date = new Date()
): EnrichedListing | null {
  const store = storeById.get(listing.storeId);
  if (!store) return null;
  const neighborhood = neighborhoodById.get(store.neighborhood);
  if (!neighborhood) return null;
  const distanceKm = haversineKm(origin, { lat: store.lat, lng: store.lng });
  const openNow = isOpenAt(store.openHour, store.closeHour, at);
  const savings = listing.oldPrice && listing.oldPrice > listing.price ? listing.oldPrice - listing.price : 0;
  return {
    ...listing,
    store,
    neighborhood,
    distanceKm,
    walkMinutes: walkMinutes(distanceKm),
    openNow,
    closesInMinutes: minutesUntilClose(store.openHour, store.closeHour, at),
    savings,
    savingsPct: savings && listing.oldPrice ? Math.round((savings / listing.oldPrice) * 100) : 0,
    freshnessLabel: freshnessLabel(listing.updatedMinutesAgo),
    stockLabel: stockLabel(listing.stock),
  };
}

export function enrichAll(origin: GeoPoint, at?: Date): EnrichedListing[] {
  return LISTINGS.map((l) => enrichListing(l, origin, at)).filter((x): x is EnrichedListing => Boolean(x));
}

function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

export function searchListings(origin: PresenceOrigin, query: PresenceQuery = {}, at?: Date): EnrichedListing[] {
  const q = query.q ? normalizeQuery(query.q) : "";
  let items = enrichAll(origin, at);

  if (q) {
    items = items.filter((item) => {
      const hay = normalizeQuery(
        `${item.name} ${item.skuLabel} ${item.brand} ${item.store.name} ${item.neighborhood.name} ${item.specs.join(" ")} ${item.category}`
      );
      return q.split(" ").every((part) => hay.includes(part));
    });
  }
  if (query.category && query.category !== "all") {
    items = items.filter((item) => item.category === query.category);
  }
  if (query.radiusKm != null) {
    items = items.filter((item) => item.distanceKm <= query.radiusKm!);
  }
  if (query.maxWalkMinutes != null) {
    items = items.filter((item) => item.walkMinutes <= query.maxWalkMinutes!);
  }
  if (query.openNow) items = items.filter((item) => item.openNow);
  if (query.verifiedOnly) items = items.filter((item) => item.store.verified);
  if (query.inStock !== false) items = items.filter((item) => item.stock > 0);
  if (query.holdable) items = items.filter((item) => item.holdable);

  const sort = query.sort ?? "nearest";
  items.sort((a, b) => {
    if (sort === "cheapest") return a.price - b.price;
    if (sort === "newest") return a.updatedMinutesAgo - b.updatedMinutesAgo;
    if (sort === "trust") return b.store.trustScore - a.store.trustScore || a.walkMinutes - b.walkMinutes;
    return a.walkMinutes - b.walkMinutes || a.price - b.price;
  });
  return items;
}

export function buildRadar(origin: PresenceOrigin, sku?: string, at?: Date): RadarGroup[] {
  const items = enrichAll(origin, at).filter((i) => i.stock > 0 && (!sku || i.sku === sku));
  const groups = new Map<string, EnrichedListing[]>();
  for (const item of items) {
    const arr = groups.get(item.sku) ?? [];
    arr.push(item);
    groups.set(item.sku, arr);
  }
  const result: RadarGroup[] = [];
  for (const [key, listings] of groups) {
    if (listings.length < 1) continue;
    const byPrice = [...listings].sort((a, b) => a.price - b.price);
    const byWalk = [...listings].sort((a, b) => a.walkMinutes - b.walkMinutes);
    const cheapest = byPrice[0];
    const nearest = byWalk[0];
    result.push({
      sku: key,
      label: cheapest.skuLabel,
      category: cheapest.category,
      listings: byPrice,
      cheapest,
      nearest,
      spreadToman: byPrice[byPrice.length - 1].price - cheapest.price,
      storeCount: listings.length,
    });
  }
  return result
    .filter((g) => g.storeCount >= 2)
    .sort((a, b) => b.spreadToman - a.spreadToman || a.cheapest.walkMinutes - b.cheapest.walkMinutes);
}

export function planTrip(origin: PresenceOrigin, listingIds: string[], at?: Date): TripPlan {
  const unique = [...new Set(listingIds)];
  const listings = unique
    .map((id) => {
      const raw = listingById.get(id);
      return raw ? enrichListing(raw, origin, at) : null;
    })
    .filter((x): x is EnrichedListing => Boolean(x));

  const ordered = orderByWalk(
    origin,
    listings.map((l) => ({ ...l, lat: l.store.lat, lng: l.store.lng }))
  );

  let cursor: GeoPoint = origin;
  let cumulative = 0;
  let totalKm = 0;
  const stops = ordered.map((listing) => {
    const km = haversineKm(cursor, { lat: listing.store.lat, lng: listing.store.lng });
    const walk = walkMinutes(km);
    cumulative += walk;
    totalKm += km;
    cursor = { lat: listing.store.lat, lng: listing.store.lng };
    return { listing, walkFromPrev: walk, cumulativeWalk: cumulative };
  });

  return {
    stops,
    totalWalkMinutes: cumulative,
    totalKm,
    totalToman: stops.reduce((sum, s) => sum + s.listing.price, 0),
    stores: new Set(stops.map((s) => s.listing.storeId)).size,
  };
}

export function makePickupCode(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n * 33 + seed.charCodeAt(i)) >>> 0;
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[n % alphabet.length];
    n = Math.imul(n, 1664525) + 1013904223;
    n >>>= 0;
  }
  return code;
}

export function createHold(listingId: string, holdMinutes: number, now = Date.now()): HoldRecord {
  const listing = listingById.get(listingId);
  if (!listing) throw new Error("listing_not_found");
  if (!listing.holdable) throw new Error("not_holdable");
  if (listing.stock <= 0) throw new Error("out_of_stock");
  const store = storeById.get(listing.storeId);
  if (!store) throw new Error("store_not_found");
  const neighborhood = neighborhoodById.get(store.neighborhood);
  const id = `hld_${now.toString(36)}_${listingId.slice(-4)}`;
  const minutes = [30, 45, 90].includes(holdMinutes) ? holdMinutes : 45;
  return {
    id,
    listingId,
    sku: listing.sku,
    productName: listing.name,
    storeName: store.name,
    neighborhood: neighborhood?.name ?? "",
    price: listing.price,
    pickupCode: makePickupCode(`${id}:${listingId}:${now}`),
    holdMinutes: minutes,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + minutes * 60_000).toISOString(),
    status: "requested",
    image: listing.image,
    storeLat: store.lat,
    storeLng: store.lng,
    guest: true,
  };
}

export function holdStatus(hold: HoldRecord, now = Date.now()): HoldRecord["status"] {
  if (["completed", "cancelled"].includes(hold.status)) return hold.status;
  if (new Date(hold.expiresAt).getTime() <= now) return "expired";
  return hold.status;
}

export function pulseStats(origin: PresenceOrigin, at?: Date) {
  const items = enrichAll(origin, at);
  const openStores = new Set(items.filter((i) => i.openNow).map((i) => i.storeId)).size;
  const inWalk15 = items.filter((i) => i.walkMinutes <= 15 && i.stock > 0).length;
  const liveUpdates = items.filter((i) => i.updatedMinutesAgo <= 10).length;
  const verified = items.filter((i) => i.store.verified).length;
  return {
    listings: items.length,
    openStores,
    inWalk15,
    liveUpdates,
    verified,
    neighborhoods: NEIGHBORHOODS.length,
  };
}

export function compareCopy() {
  return [
    { axis: "زمان تا کالا", digikala: "۲ تا ۵ روز ارسال", divar: "نامشخص", kidareh: "۷ تا ۲۰ دقیقه پیاده" },
    { axis: "دیدن کالا", digikala: "بعد از پرداخت", divar: "عکس نامطمئن", kidareh: "قبل از پرداخت، در ویترین" },
    { axis: "قیمت محله", digikala: "یک انبار مرکزی", divar: "چانه‌زنی پنهان", kidareh: "رادار قیمت فروشگاه‌های اطراف" },
    { axis: "موجودی", digikala: "انبار", divar: "شاید باشد", kidareh: "زنده، با دقیقهٔ به‌روزرسانی" },
    { axis: "اعتماد", digikala: "برند پلتفرم", divar: "فروشنده ناشناس", kidareh: "فروشگاه تأییدشده + کد تحویل" },
  ];
}

export function mapsWalkUrl(origin: GeoPoint, dest: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=walking`;
}

export function mapsMultiStopUrl(origin: GeoPoint, points: GeoPoint[]): string {
  if (points.length === 0) return mapsWalkUrl(origin, origin);
  const dest = points[points.length - 1];
  const way = points.slice(0, -1).map((p) => `${p.lat},${p.lng}`).join("|");
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=walking`;
  return way ? `${base}&waypoints=${encodeURIComponent(way)}` : base;
}

export function formatToman(n: number): string {
  return `${toFa(Math.round(n))} تومان`;
}

export function formatCompactToman(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const text = m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "");
    return `${toFa(Number(text))} میلیون`;
  }
  if (n >= 1000) return `${toFa(Math.round(n / 1000))} هزار`;
  return toFa(n);
}

export {
  CATEGORY_META,
  DEFAULT_ORIGIN,
  LISTINGS,
  NEIGHBORHOODS,
  STORES,
  formatKm,
  formatWalk,
  haversineKm,
  toFa,
  walkMinutes,
};
