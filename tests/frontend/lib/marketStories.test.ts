import { beforeEach, describe, expect, it } from "vitest";
import {
  isStorySeen,
  mapApiStory,
  markStorySeen,
  mergeMarketStories,
  SEEN_STORIES_KEY,
} from "../../../src/lib/marketStories";
import type { StoryItem } from "../../../src/components/feed/FeedStories";

function story(partial: Partial<StoryItem> & Pick<StoryItem, "id" | "name">): StoryItem {
  return {
    href: `/store/${partial.id}`,
    image: `https://example.com/${partial.id}.jpg`,
    isAd: true,
    frames: [
      {
        id: `${partial.id}-f`,
        image: `https://example.com/${partial.id}.jpg`,
        title: partial.name,
      },
    ],
    ...partial,
  };
}

describe("mergeMarketStories", () => {
  it("keeps paid shops first and drops duplicate stores", () => {
    const paid = [story({ id: "1", storeId: 1, name: "پولی" })];
    const extra = [
      story({ id: "demo-1", storeId: 1, name: "تکراری" }),
      story({ id: "2", storeId: 2, name: "دمو" }),
    ];
    const merged = mergeMarketStories(paid, extra, 24);
    expect(merged.map((item) => item.name)).toEqual(["پولی", "دمو"]);
  });

  it("builds a cover frame when frames are missing", () => {
    const merged = mergeMarketStories([
      { id: "9", name: "گل", href: "/store/9", image: "https://example.com/g.jpg", isAd: true },
    ]);
    expect(merged[0].frames).toHaveLength(1);
    expect(merged[0].frames?.[0].image).toContain("g.jpg");
  });

  it("caps the tray so many shops can still sit in one horizontal row", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      story({ id: String(i + 1), storeId: i + 1, name: `مغازه ${i + 1}` })
    );
    expect(mergeMarketStories(many, [], 24)).toHaveLength(24);
  });
});

describe("mapApiStory", () => {
  it("maps paid API payload onto tray items", () => {
    const item = mapApiStory({
      id: 44,
      storeId: 7,
      name: "نانوایی",
      href: "/store/7",
      image: "https://example.com/n.jpg",
      verified: true,
      frames: [{ id: "p-1", image: "https://example.com/bread.jpg", title: "نان", caption: "۲۰ هزار" }],
    });
    expect(item?.id).toBe("44");
    expect(item?.storeId).toBe(7);
    expect(item?.isAd).toBe(true);
    expect(item?.frames).toHaveLength(1);
  });
});

describe("seen stories", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remembers a story for a day", () => {
    expect(isStorySeen("st_1")).toBe(false);
    markStorySeen("st_1");
    expect(isStorySeen("st_1")).toBe(true);
    const stored = JSON.parse(localStorage.getItem(SEEN_STORIES_KEY) || "{}");
    expect(stored.st_1).toBeGreaterThan(0);
  });
});
