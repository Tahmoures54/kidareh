import type { GeoPoint } from "./types";

const EARTH_KM = 6371;
const WALK_KMH = 4.8;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * sinLng * sinLng;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function walkMinutes(km: number, speedKmh = WALK_KMH): number {
  if (!Number.isFinite(km) || km < 0) return 0;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

export function formatWalk(minutes: number): string {
  if (minutes < 1) return "کمتر از یک دقیقه";
  if (minutes < 60) return `${toFa(minutes)} دقیقه پیاده`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${toFa(hours)} ساعت پیاده`;
  return `${toFa(hours)} ساعت و ${toFa(rest)} دقیقه`;
}

export function formatKm(km: number): string {
  if (km < 0.1) return `${toFa(Math.round(km * 1000))} متر`;
  if (km < 1) return `${toFa(Math.round(km * 1000))} متر`;
  return `${km.toFixed(1).replace(".", "٫")} کیلومتر`;
}

/** Store hours are Tehran wall-clock, not the visitor's OS timezone. */
export function tehranHourFloat(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour + minute / 60;
}

export function isOpenAt(openHour: number, closeHour: number, at: Date = new Date()): boolean {
  if (openHour === closeHour) return false;
  const hour = tehranHourFloat(at);
  if (closeHour > openHour) return hour >= openHour && hour < closeHour;
  return hour >= openHour || hour < closeHour;
}

export function minutesUntilClose(openHour: number, closeHour: number, at: Date = new Date()): number | null {
  if (!isOpenAt(openHour, closeHour, at)) return null;
  const hour = tehranHourFloat(at);
  const remaining = closeHour > hour ? closeHour - hour : 24 - hour + closeHour;
  return Math.max(1, Math.round(remaining * 60));
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function toFa(n: number | string): string {
  return Number(n).toLocaleString("fa-IR");
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

/** ساخت مسیر اولیه با الگوریتم نزدیک‌ترین همسایه. */
export function nearestNeighborOrder<T extends GeoPoint>(origin: GeoPoint, points: readonly T[]): T[] {
  const remaining = [...points];
  const ordered: T[] = [];
  let cursor = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const distance = haversineKm(cursor, remaining[index]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    cursor = next;
  }

  return ordered;
}

/** طول مسیر باز از مبدأ تا آخرین توقف؛ بازگشت به مبدأ محاسبه نمی‌شود. */
export function openRouteDistance<T extends GeoPoint>(origin: GeoPoint, points: readonly T[]): number {
  let cursor = origin;
  let distance = 0;
  for (const point of points) {
    distance += haversineKm(cursor, point);
    cursor = point;
  }
  return distance;
}

/** بهبود مسیر با 2-opt؛ برای سبدهای محلی کوچک سریع و قطعی است. */
export function twoOptImprove<T extends GeoPoint>(
  origin: GeoPoint,
  initialRoute: readonly T[],
  maxPasses = 12,
): T[] {
  const route = [...initialRoute];
  if (route.length < 3) return route;

  let pass = 0;
  let improved = true;
  while (improved && pass < maxPasses) {
    improved = false;
    pass += 1;

    for (let start = 0; start < route.length - 1; start += 1) {
      for (let end = start + 1; end < route.length; end += 1) {
        const before = start === 0 ? origin : route[start - 1];
        const first = route[start];
        const last = route[end];
        const after = route[end + 1];

        const currentEdges =
          haversineKm(before, first) + (after ? haversineKm(last, after) : 0);
        const proposedEdges =
          haversineKm(before, last) + (after ? haversineKm(first, after) : 0);

        if (proposedEdges + 1e-6 < currentEdges) {
          const reversed = route.slice(start, end + 1).reverse();
          route.splice(start, reversed.length, ...reversed);
          improved = true;
        }
      }
    }
  }

  return route;
}

/** ترتیب نهایی توقف‌ها: نزدیک‌ترین همسایه + بهینه‌سازی 2-opt. */
export function orderByWalk<T extends GeoPoint>(origin: GeoPoint, points: T[]): T[] {
  return twoOptImprove(origin, nearestNeighborOrder(origin, points));
}
