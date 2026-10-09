import { describe, expect, it } from "vitest";
import { nearestNeighborOrder, openRouteDistance, orderByWalk } from "../../../src/presence/geo";
import type { GeoPoint } from "../../../src/presence/types";

describe("walking route optimization", () => {
  const origin: GeoPoint = { lat: 35.004, lng: 51.004 };
  const points: Array<GeoPoint & { id: string }> = [
    { id: "a", lat: 35.003, lng: 51.003 },
    { id: "b", lat: 35.0, lng: 51.004 },
    { id: "c", lat: 35.009, lng: 51.011 },
    { id: "d", lat: 35.008, lng: 51.0 },
  ];

  it("keeps every stop exactly once", () => {
    const route = orderByWalk(origin, points);
    expect(route.map((point) => point.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("never makes the nearest-neighbor route longer", () => {
    const nearest = nearestNeighborOrder(origin, points);
    const optimized = orderByWalk(origin, points);
    expect(openRouteDistance(origin, optimized)).toBeLessThanOrEqual(
      openRouteDistance(origin, nearest) + 1e-6,
    );
  });

  it("reduces route length for a known crossing route", () => {
    const nearest = nearestNeighborOrder(origin, points);
    const optimized = orderByWalk(origin, points);
    expect(openRouteDistance(origin, optimized)).toBeLessThan(openRouteDistance(origin, nearest));
  });

  it("handles zero, one, and two stops", () => {
    expect(orderByWalk(origin, [])).toEqual([]);
    expect(orderByWalk(origin, [points[0]])).toEqual([points[0]]);
    expect(orderByWalk(origin, points.slice(0, 2))).toHaveLength(2);
  });
});
