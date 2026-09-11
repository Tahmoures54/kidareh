import type { StoryItem } from "../components/feed/FeedStories";

export const SEEN_STORIES_KEY = "kidareh_seen_stories_v1";
const SEEN_TTL_MS = 24 * 60 * 60 * 1000;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSeenMap(): Record<string, number> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(SEEN_STORIES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const fresh: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed || {})) {
      if (typeof ts === "number" && now - ts < SEEN_TTL_MS) fresh[id] = ts;
    }
    return fresh;
  } catch {
    return {};
  }
}

export function isStorySeen(id: string): boolean {
  return Boolean(readSeenMap()[id]);
}

export function markStorySeen(id: string): void {
  if (!canUseStorage() || !id) return;
  try {
    const map = readSeenMap();
    map[id] = Date.now();
    window.localStorage.setItem(SEEN_STORIES_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("kidareh-story-seen"));
  } catch {
    /* ignore quota */
  }
}

export function storyStoreKey(item: Pick<StoryItem, "id" | "storeId">): string {
  return String(item.storeId ?? item.id);
}

/** Paid shops stay first. Later rows fill the tray without duplicating a store. */
export function mergeMarketStories(
  paid: StoryItem[],
  extra: StoryItem[] = [],
  limit = 24
): StoryItem[] {
  const seen = new Set<string>();
  const out: StoryItem[] = [];
  for (const item of [...paid, ...extra]) {
    if (!item?.id) continue;
    const hasMedia = (item.frames && item.frames.length > 0) || Boolean(item.image);
    if (!hasMedia) continue;
    const key = storyStoreKey(item);
    if (seen.has(key) || seen.has(item.id)) continue;
    seen.add(key);
    seen.add(item.id);
    out.push({
      ...item,
      isAd: item.isAd !== false,
      frames:
        item.frames && item.frames.length
          ? item.frames
          : item.image
            ? [{ id: `${item.id}-cover`, image: item.image, title: item.name, href: item.href }]
            : [],
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function mapApiStory(raw: Record<string, unknown>): StoryItem | null {
  const id = String(raw.id ?? "");
  const name = String(raw.name || raw.title || "").trim();
  if (!id || !name) return null;
  const storeId = raw.storeId ?? raw.store_id ?? id;
  const href = String(raw.href || `/store/${storeId}`);
  const image = (raw.image as string | null | undefined) || null;
  const frames = Array.isArray(raw.frames)
    ? raw.frames
        .map((frame, index) => {
          const row = frame as Record<string, unknown>;
          const src = String(row.image || "");
          if (!src) return null;
          return {
            id: String(row.id || `${id}-${index}`),
            image: src,
            title: row.title ? String(row.title) : undefined,
            caption: row.caption ? String(row.caption) : undefined,
            href: row.href ? String(row.href) : href,
            productId: typeof row.productId === "number" ? row.productId : undefined,
          };
        })
        .filter((frame): frame is NonNullable<typeof frame> => Boolean(frame))
    : [];
  return {
    id,
    storeId,
    name,
    href,
    image,
    isAd: true,
    live: Boolean(raw.live),
    verified: Boolean(raw.verified || raw.blueTick),
    frames,
  };
}
