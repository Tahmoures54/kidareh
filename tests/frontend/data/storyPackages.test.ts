import { describe, expect, it } from "vitest";
import { BADGES_LIST } from "../../../src/components/badges";

describe("market story packages", () => {
  const stories = BADGES_LIST.filter((item) => item.category === "story");
  const bannerWeek = BADGES_LIST.find((item) => item.id === "homepage_banner_7d");

  it("sells 1, 3, and 7 day story slots", () => {
    expect(stories.map((item) => item.id)).toEqual([
      "market_story_1d",
      "market_story_3d",
      "market_story_7d",
    ]);
  });

  it("prices a story day cheaper than a homepage banner day so more shops buy the tray", () => {
    expect(bannerWeek).toBeTruthy();
    const storyDay = stories.find((item) => item.id === "market_story_7d")!.price / 7;
    const bannerDay = bannerWeek!.price / 7;
    expect(storyDay).toBeLessThan(bannerDay);
  });

  it("keeps the 3-day story as the recommended volume package", () => {
    expect(stories.find((item) => item.id === "market_story_3d")?.recommended).toBe(true);
  });
});
