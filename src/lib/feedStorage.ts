const LIKES_KEY = "kidareh_feed_likes_v1";
const SAVED_LISTINGS_KEY = "kidareh_saved_listings_v1";
const SAVED_PRODUCTS_KEY = "kidareh_saved_products_v1";
export const FEED_CHANGE_EVENT = "kidareh-feed-change";

export type FeedKind = "listing" | "product";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readIds(key: string): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new Event(FEED_CHANGE_EVENT));
}

function toggleId(key: string, id: string): boolean {
  const ids = readIds(key);
  const has = ids.includes(id);
  writeIds(key, has ? ids.filter((x) => x !== id) : [...ids, id]);
  return !has;
}

export function feedKey(kind: FeedKind, id: string | number): string {
  return `${kind}:${id}`;
}

export function isLiked(key: string): boolean {
  return readIds(LIKES_KEY).includes(key);
}

export function toggleLike(key: string): boolean {
  return toggleId(LIKES_KEY, key);
}

export function listSavedListingIds(): string[] {
  return readIds(SAVED_LISTINGS_KEY);
}

export function isListingSaved(id: string): boolean {
  return listSavedListingIds().includes(String(id));
}

export function toggleListingSaved(id: string): boolean {
  return toggleId(SAVED_LISTINGS_KEY, String(id));
}

export function listSavedProductIds(): string[] {
  return readIds(SAVED_PRODUCTS_KEY);
}

export function isProductSaved(id: string | number): boolean {
  return listSavedProductIds().includes(String(id));
}

export function setProductSaved(id: string | number, saved: boolean) {
  const sid = String(id);
  const ids = listSavedProductIds();
  const has = ids.includes(sid);
  if (saved && !has) writeIds(SAVED_PRODUCTS_KEY, [...ids, sid]);
  if (!saved && has) writeIds(SAVED_PRODUCTS_KEY, ids.filter((x) => x !== sid));
}

export function toggleProductSavedLocal(id: string | number): boolean {
  const next = !isProductSaved(id);
  setProductSaved(id, next);
  return next;
}

export function syncSavedProductIds(ids: Array<string | number>) {
  writeIds(SAVED_PRODUCTS_KEY, ids.map(String));
}

export function onFeedChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(FEED_CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(FEED_CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
