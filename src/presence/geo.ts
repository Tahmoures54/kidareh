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

/** Nearest-neighbor walk tour. Good enough for 2–8 neighborhood stops. */
export function orderByWalk<T extends GeoPoint>(origin: GeoPoint, points: T[]): T[] {
  const remaining = [...points];
  const ordered: T[] = [];
  let cursor = origin;
  while (remaining.length) {
    let best = 0;
    let bestKm = Infinity;
    remaining.forEach((p, i) => {
      const km = haversineKm(cursor, p);
      if (km < bestKm) {
        bestKm = km;
        best = i;
      }
    });
    const next = remaining.splice(best, 1)[0];
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}
