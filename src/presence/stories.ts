import { LISTINGS, STORES } from "./catalog";
import { formatCompactToman } from "./engine";
import type { StoryFrame, StoryItem } from "../components/feed/FeedStories";

/** Demo inventory: neighborhood shops occupying the paid story tray in Tehran. */
export function presenceMarketStories(): StoryItem[] {
  return STORES.map((store) => {
    const listings = LISTINGS.filter((listing) => listing.storeId === store.id);
    const frames: StoryFrame[] = listings.slice(0, 6).map((listing) => ({
      id: listing.id,
      image: listing.image,
      title: listing.name,
      caption: `${formatCompactToman(listing.price)} تومان`,
      href: `/p/${listing.id}`,
    }));
    if (!frames.length && store.cover) {
      frames.push({
        id: store.id,
        image: store.cover,
        title: store.name,
        href: `/explore?q=${encodeURIComponent(store.name)}`,
      });
    }
    return {
      id: store.id,
      storeId: store.id,
      name: store.name,
      href: frames[0]?.href || `/explore?q=${encodeURIComponent(store.name)}`,
      image: store.cover,
      live: store.sellerOnline,
      isAd: true,
      verified: store.verified,
      frames,
    };
  }).filter((story) => story.frames && story.frames.length > 0);
}
