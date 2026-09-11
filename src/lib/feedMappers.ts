import { formatCompactToman, formatWalk } from "../presence/engine";
import type { EnrichedListing } from "../presence/types";
import { formatPrice } from "../utils/formatPrice";
import { feedKey, type FeedKind } from "./feedStorage";

export interface FeedPostData {
  key: string;
  kind: FeedKind;
  href: string;
  storeHref?: string;
  storeName: string;
  storeVerified?: boolean;
  storeAvatar?: string | null;
  storeId?: string | number;
  image: string;
  images?: string[];
  title: string;
  caption?: string;
  priceLabel: string;
  oldPriceLabel?: string;
  meta?: string;
  badge?: string;
  status?: string;
  productId?: number;
  listingId?: string;
  sku?: string;
}

function usableImage(src?: string | null): src is string {
  if (!src) return false;
  const value = String(src).trim();
  if (!value) return false;
  if (/placehold\.co/i.test(value)) return false;
  if (/text=No\+Image|text=Kidareh/i.test(value)) return false;
  return true;
}

function firstImage(...candidates: Array<string | null | undefined>): string {
  for (const value of candidates) {
    if (usableImage(value)) return value;
  }
  return "";
}

export function listingToFeedPost(listing: EnrichedListing): FeedPostData {
  const images = [listing.image, ...(listing.images || []), listing.store.cover].filter(
    (src, index, arr): src is string => usableImage(src) && arr.indexOf(src) === index
  );
  return {
    key: feedKey("listing", listing.id),
    kind: "listing",
    href: `/p/${listing.id}`,
    storeHref: `/explore?q=${encodeURIComponent(listing.store.name)}`,
    storeName: listing.store.name,
    storeVerified: listing.store.verified,
    storeAvatar: listing.store.cover,
    storeId: listing.store.id,
    image: firstImage(listing.image, images[0]),
    images,
    title: listing.name,
    caption: listing.description,
    priceLabel: `${formatCompactToman(listing.price)} تومان`,
    oldPriceLabel: listing.oldPrice ? `${formatCompactToman(listing.oldPrice)} تومان` : undefined,
    meta: [formatWalk(listing.walkMinutes), listing.neighborhood.name, listing.stockLabel]
      .filter(Boolean)
      .join(" · "),
    badge: listing.openNow ? "باز است" : "بسته",
    status: listing.stockLabel,
    listingId: listing.id,
    sku: listing.sku,
  };
}

export function productToFeedPost(raw: Record<string, any>, storeFallback?: {
  name?: string;
  image?: string | null;
  verified?: boolean;
  id?: string | number;
}): FeedPostData {
  const id = Number(raw.id);
  const images = Array.isArray(raw.images)
    ? raw.images
    : typeof raw.images === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw.images);
            return Array.isArray(parsed) ? parsed : [raw.images];
          } catch {
            return [raw.images];
          }
        })()
      : [];
  const storeName = raw.store || raw.store_name || storeFallback?.name || "فروشگاه";
  const storeId = raw.store_id ?? storeFallback?.id;
  const price = Number(raw.price) || 0;
  const oldPrice = Number(raw.oldPrice ?? raw.old_price ?? 0) || 0;
  const priceLabel = price > 0 ? `${formatPrice(price)} تومان` : "توافقی";

  return {
    key: feedKey("product", Number.isFinite(id) ? id : String(raw.id)),
    kind: "product",
    href: `/products/${raw.id}`,
    storeHref: storeId ? `/store/${storeId}` : undefined,
    storeName,
    storeVerified: Boolean(raw.is_verified || raw.verified || storeFallback?.verified),
    storeAvatar: raw.store_image_url || raw.store_image || storeFallback?.image || null,
    storeId,
    image: firstImage(raw.image, raw.image_url, images[0], raw.store_image_url, raw.store_image, storeFallback?.image),
    images: images.filter(usableImage),
    title: raw.name || raw.title || "کالا",
    caption: raw.description,
    priceLabel,
    oldPriceLabel: oldPrice > price ? `${formatPrice(oldPrice)} تومان` : undefined,
    meta: [raw.distance, raw.neighborhood, raw.city, raw.store_city, raw.status]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(" · "),
    badge: raw.badge || undefined,
    status: raw.status || "موجود",
    productId: Number.isFinite(id) ? id : undefined,
  };
}
