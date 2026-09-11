import { describe, expect, it } from "vitest";
import { DEFAULT_ORIGIN } from "@/presence/catalog";
import {
  buildRadar,
  createHold,
  haversineKm,
  makePickupCode,
  planTrip,
  searchListings,
  walkMinutes,
} from "@/presence/engine";
import { isOpenAt } from "@/presence/geo";

describe("presence geo", () => {
  it("walk minutes scale with distance", () => {
    expect(walkMinutes(0.08)).toBe(1);
    expect(walkMinutes(0.8)).toBeGreaterThanOrEqual(8);
    expect(walkMinutes(0.8)).toBeLessThanOrEqual(12);
  });

  it("haversine is symmetric and zero for same point", () => {
    const a = { lat: 35.757, lng: 51.4105 };
    const b = { lat: 35.76, lng: 51.42 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 8);
  });

  it("uses Tehran wall clock for store hours", () => {
    const noonTehran = new Date("2026-09-11T12:00:00+03:30");
    const nightTehran = new Date("2026-09-11T02:00:00+03:30");
    expect(isOpenAt(9, 22, noonTehran)).toBe(true);
    expect(isOpenAt(9, 22, nightTehran)).toBe(false);
  });
});

describe("presence engine", () => {
  it("search prefers nearer listings by default", () => {
    const items = searchListings(DEFAULT_ORIGIN, { inStock: true, sort: "nearest" });
    expect(items.length).toBeGreaterThan(5);
    for (let i = 1; i < items.length; i += 1) {
      expect(items[i].walkMinutes).toBeGreaterThanOrEqual(items[i - 1].walkMinutes);
    }
  });

  it("radar groups the same SKU across stores with a price spread", () => {
    const groups = buildRadar(DEFAULT_ORIGIN);
    expect(groups.length).toBeGreaterThan(0);
    const iphone = groups.find((g) => g.sku === "iphone-15-pro-256");
    expect(iphone).toBeTruthy();
    expect(iphone!.storeCount).toBeGreaterThanOrEqual(2);
    expect(iphone!.spreadToman).toBeGreaterThan(0);
    expect(iphone!.cheapest.price).toBeLessThanOrEqual(iphone!.listings[iphone!.listings.length - 1].price);
  });

  it("trip orders stops and accumulates walk time", () => {
    const plan = planTrip(DEFAULT_ORIGIN, [
      "lst_ps5_enghelab",
      "lst_airpods_vanak",
      "lst_ps5_enghelab",
    ]);
    expect(plan.stops).toHaveLength(2);
    expect(plan.stores).toBe(2);
    expect(plan.totalWalkMinutes).toBeGreaterThan(0);
    expect(plan.stops[1].cumulativeWalk).toBeGreaterThanOrEqual(plan.stops[0].walkFromPrev);
  });

  it("hold creates a 6-char pickup code", () => {
    const hold = createHold("lst_airpods_vanak", 45, 1_700_000_000_000);
    expect(hold.pickupCode).toHaveLength(6);
    expect(hold.holdMinutes).toBe(45);
    expect(hold.status).toBe("requested");
    expect(makePickupCode("seed-a")).not.toBe(makePickupCode("seed-b"));
  });
});
