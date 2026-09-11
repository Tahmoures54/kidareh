import { describe, expect, it } from "vitest";
import { STORES } from "../../../src/presence/catalog";
import { presenceMarketStories } from "../../../src/presence/stories";

describe("presenceMarketStories", () => {
  it("builds a horizontal Instagram-style tray from neighborhood shops", () => {
    const stories = presenceMarketStories();
    expect(stories.length).toBe(STORES.length);
    expect(stories.length).toBeGreaterThan(8);
    for (const story of stories) {
      expect(story.isAd).toBe(true);
      expect(story.frames?.length).toBeGreaterThan(0);
      expect(story.image).toBeTruthy();
    }
  });

  it("gives each shop its own product frames so the viewer can advance", () => {
    const digital = presenceMarketStories().find((story) => story.id === "st_vanak_digital");
    expect(digital).toBeTruthy();
    expect((digital?.frames?.length || 0) >= 2).toBe(true);
    expect(digital?.frames?.[0].href).toMatch(/^\/p\//);
  });
});
