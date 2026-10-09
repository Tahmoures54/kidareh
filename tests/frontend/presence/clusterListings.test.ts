import { describe, expect, it } from "vitest";
import { clusterListings } from "../../src/presence/clusterListings";
import type { EnrichedListing } from "../../src/presence/types";

function listing(id: string, lat: number, lng: number): EnrichedListing {
  return {
    id,
    sku: id,
    skuLabel: id,
    name: id,
    brand: "",
    category: "digital",
    price: 1000,
    stock: 1,
    condition: "new",
    storeId: `store-${id}`,
    image: "",
    images: [],
    description: "",
    updatedMinutesAgo: 1,
    views: 0,
    inspectable: false,
    holdable: false,
    warranty: "",
    specs: [],
    store: {
      id: `store-${id}`,
      name: id,
      neighborhood: "vanak",
      address: "",
      phone: "",
      category: "",
      lat,
      lng,
      rating: 5,
      reviewCount: 0,
      verified: false,
      licensed: false,
      openHour: 9,
      closeHour: 22,
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

describe("clusterListings", () => {
  it("groups nearby stores at a distant zoom", () => {
    const clusters = clusterListings([listing("a", 35.7001, 51.4001), listing("b", 35.7002, 51.4002)], 12);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].listings).toHaveLength(2);
  });

  it("shows individual stores at close zoom", () => {
    const clusters = clusterListings([listing("a", 35.7001, 51.4001), listing("b", 35.7002, 51.4002)], 17);
    expect(clusters).toHaveLength(2);
    expect(clusters.every((cluster) => cluster.listings.length === 1)).toBe(true);
  });

  it("calculates a cluster center from its members", () => {
    const clusters = clusterListings([listing("a", 35.7, 51.4), listing("b", 35.7, 51.4)], 12);
    expect(clusters[0].lat).toBeCloseTo(35.7);
    expect(clusters[0].lng).toBeCloseTo(51.4);
  });

  it("ignores listings with invalid coordinates", () => {
    const clusters = clusterListings([listing("bad", Number.NaN, 51.4)], 12);
    expect(clusters).toHaveLength(0);
  });
});
