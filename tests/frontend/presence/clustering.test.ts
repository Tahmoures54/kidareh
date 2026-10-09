import { describe, expect, it } from "vitest";
import { clusterStores } from "../../../src/presence/clustering";
import type { EnrichedListing } from "../../../src/presence/types";

function listing(id: string, lat: number, lng: number): EnrichedListing {
  return {
    id,
    sku: id,
    skuLabel: id,
    name: id,
    brand: "test",
    category: "home",
    price: 100,
    stock: 1,
    condition: "new",
    storeId: id,
    image: "",
    images: [],
    description: "",
    updatedMinutesAgo: 1,
    views: 0,
    inspectable: true,
    holdable: true,
    warranty: "",
    specs: [],
    store: {
      id,
      name: id,
      neighborhood: "vanak",
      address: "",
      phone: "",
      category: "home",
      lat,
      lng,
      rating: 5,
      reviewCount: 0,
      verified: false,
      licensed: false,
      openHour: 9,
      closeHour: 21,
      lastSeenMinutesAgo: 1,
      sellerOnline: true,
      responseMins: 1,
      trustScore: 80,
      cover: "",
    },
    neighborhood: { id: "vanak", name: "ونک", district: "۳", center: { lat, lng } },
    distanceKm: 0.2,
    walkMinutes: 3,
    openNow: true,
    closesInMinutes: 120,
    savings: 0,
    savingsPct: 0,
    freshnessLabel: "تازه",
    stockLabel: "موجود",
  };
}

describe("clusterStores", () => {
  it("groups nearby stores and calculates the center", () => {
    const clusters = clusterStores([listing("a", 35.70, 51.40), listing("b", 35.701, 51.401)], 14);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.items).toHaveLength(2);
    expect(clusters[0]?.center.lat).toBeCloseTo(35.7005, 4);
  });

  it("separates distant stores at a zoomed-in level", () => {
    const clusters = clusterStores([listing("a", 35.70, 51.40), listing("b", 35.75, 51.45)], 17);
    expect(clusters).toHaveLength(2);
  });

  it("returns no clusters for an empty list", () => {
    expect(clusterStores([], 14)).toEqual([]);
  });
});
