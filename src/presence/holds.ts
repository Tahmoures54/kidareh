import { createHold, holdStatus } from "./engine";
import type { HoldRecord } from "./types";

const KEY = "kidareh_presence_holds_v1";

function read(): HoldRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HoldRecord[];
    return Array.isArray(parsed) ? parsed.map((h) => ({ ...h, status: holdStatus(h) })) : [];
  } catch {
    return [];
  }
}

function write(items: HoldRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kidareh-holds-change"));
  }
}

export function onHoldsChange(cb: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("kidareh-holds-change", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("kidareh-holds-change", cb);
    window.removeEventListener("storage", cb);
  };
}

export function listLocalHolds(): HoldRecord[] {
  return read().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function addLocalHold(listingId: string, holdMinutes: number): HoldRecord {
  const hold = createHold(listingId, holdMinutes);
  const items = read().filter((h) => h.listingId !== listingId || ["completed", "cancelled", "expired"].includes(h.status));
  items.unshift(hold);
  write(items);
  return hold;
}

export function cancelLocalHold(id: string): HoldRecord | null {
  const items = read();
  const idx = items.findIndex((h) => h.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], status: "cancelled" };
  write(items);
  return items[idx];
}

export function markLocalReady(id: string): HoldRecord | null {
  const items = read();
  const idx = items.findIndex((h) => h.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], status: "ready_for_pickup" };
  write(items);
  return items[idx];
}

export const HOLD_OPTIONS = [
  { minutes: 30, label: "۳۰ دقیقه", hint: "نزدیکم، پیاده می‌آیم" },
  { minutes: 45, label: "۴۵ دقیقه", hint: "استاندارد سیلیکون‌ولی" },
  { minutes: 90, label: "۹۰ دقیقه", hint: "ترافیک یا چند توقف" },
] as const;
