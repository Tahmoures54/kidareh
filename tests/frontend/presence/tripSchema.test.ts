import { describe, expect, it } from "vitest";
import { tripArrivalSchema, tripRequestSchema, tripStatusSchema } from "../../../src/presence/tripSchema";

describe("trip request validation", () => {
  it("accepts a valid guest route request", () => {
    expect(tripRequestSchema.safeParse({ listingIds: ["p-1", "p-2"] }).success).toBe(true);
  });

  it("requires latitude and longitude together", () => {
    expect(tripRequestSchema.safeParse({ lat: 35.7, listingIds: ["p-1"] }).success).toBe(false);
  });

  it("rejects invalid coordinates and more than eight items", () => {
    expect(tripRequestSchema.safeParse({ lat: 95, lng: 51, listingIds: ["p-1"] }).success).toBe(false);
    expect(tripRequestSchema.safeParse({ listingIds: Array.from({ length: 9 }, (_, i) => `p-${i}`) }).success).toBe(false);
  });

  it("allows only supported trip status transitions", () => {
    expect(tripStatusSchema.safeParse({ status: "started" }).success).toBe(true);
    expect(tripStatusSchema.safeParse({ status: "planned" }).success).toBe(false);
  });

  it("requires a sufficiently long one-time QR token", () => {
    expect(tripArrivalSchema.safeParse({ token: "a".repeat(32) }).success).toBe(true);
    expect(tripArrivalSchema.safeParse({ token: "short" }).success).toBe(false);
  });
});
