import { describe, expect, it } from "vitest";
import { calculatePullDistance } from "../../../src/hooks/usePullToRefresh";

describe("calculatePullDistance", () => {
  it("ignores upward movement", () => {
    expect(calculatePullDistance(-30)).toBe(0);
  });

  it("converts downward movement to a softer indicator distance", () => {
    expect(calculatePullDistance(100)).toBeCloseTo(55);
  });

  it("caps the indicator distance", () => {
    expect(calculatePullDistance(1000, 88)).toBe(88);
  });

  it("supports a custom maximum pull distance", () => {
    expect(calculatePullDistance(100, 40)).toBe(40);
  });
});
