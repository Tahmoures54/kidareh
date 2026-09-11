import { beforeEach, describe, expect, it, vi } from "vitest";
import { LISTINGS, STORES } from "../../../src/presence/catalog";
import { enrichListing } from "../../../src/presence/engine";
import { listingToFeedPost, productToFeedPost } from "../../../src/lib/feedMappers";
import { buildShareUrl, shareTextForPost } from "../../../src/lib/feedShare";
import {
  feedKey,
  isLiked,
  isListingSaved,
  isProductSaved,
  listSavedListingIds,
  setProductSaved,
  toggleLike,
  toggleListingSaved,
} from "../../../src/lib/feedStorage";

describe("feedKey", () => {
  it("builds stable listing and product keys", () => {
    expect(feedKey("listing", "abc")).toBe("listing:abc");
    expect(feedKey("product", 12)).toBe("product:12");
  });
});

describe("feedStorage likes and saves", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggles likes for a feed key", () => {
    const key = feedKey("product", 7);
    expect(isLiked(key)).toBe(false);
    expect(toggleLike(key)).toBe(true);
    expect(isLiked(key)).toBe(true);
    expect(toggleLike(key)).toBe(false);
    expect(isLiked(key)).toBe(false);
  });

  it("saves and unsaves neighborhood listings locally", () => {
    expect(toggleListingSaved("lst_1")).toBe(true);
    expect(isListingSaved("lst_1")).toBe(true);
    expect(listSavedListingIds()).toEqual(["lst_1"]);
    expect(toggleListingSaved("lst_1")).toBe(false);
    expect(isListingSaved("lst_1")).toBe(false);
  });

  it("mirrors marketplace product save ids", () => {
    setProductSaved(9, true);
    expect(isProductSaved(9)).toBe(true);
    setProductSaved(9, false);
    expect(isProductSaved(9)).toBe(false);
  });
});

describe("share helpers", () => {
  it("builds an in-app product URL", () => {
    expect(buildShareUrl("/products/4", "https://kidareh.com")).toBe("https://kidareh.com/products/4");
  });

  it("keeps absolute URLs untouched", () => {
    expect(buildShareUrl("https://kidareh.com/p/1", "https://other.test")).toBe("https://kidareh.com/p/1");
  });

  it("writes share copy that stays inside Kidareh", () => {
    expect(shareTextForPost("گلدان", "ویترین گل یاس")).toContain("ویترین گل یاس");
    expect(shareTextForPost("گلدان", "ویترین گل یاس")).toContain("حضوری");
  });
});

describe("feed mappers", () => {
  it("maps a presence listing to a stacked post", () => {
    const listing = enrichListing(LISTINGS[0], { lat: 35.757, lng: 51.4105, label: "ونک" });
    expect(listing).toBeTruthy();
    const post = listingToFeedPost(listing!);
    expect(post.kind).toBe("listing");
    expect(post.href).toBe(`/p/${listing!.id}`);
    expect(post.storeName).toBe(STORES.find((s) => s.id === listing!.storeId)?.name);
    expect(post.priceLabel).toMatch(/تومان/);
  });

  it("maps a shop product to a shareable post", () => {
    const post = productToFeedPost({
      id: 3,
      name: "گلدان سرامیک",
      price: 250000,
      store_name: "ویترین گل یاس",
      store_id: 2,
      image_url: "https://example.com/vase.jpg",
      status: "موجود",
    });
    expect(post.kind).toBe("product");
    expect(post.href).toBe("/products/3");
    expect(post.storeHref).toBe("/store/2");
    expect(post.productId).toBe(3);
    expect(post.title).toBe("گلدان سرامیک");
  });
});

describe("native share fallback", () => {
  it("copies the URL when Web Share is missing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { shareFeedItem } = await import("../../../src/lib/feedShare");
    const result = await shareFeedItem({
      title: "گلدان",
      url: "https://kidareh.com/products/3",
    });
    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://kidareh.com/products/3");
    vi.unstubAllGlobals();
  });
});
