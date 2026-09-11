import { describe, expect, it } from "vitest";
import { normalizeSellerProductsResponse } from "@/services/products.service";

describe("normalizeSellerProductsResponse", () => {
  it("wraps a raw array from older APIs", () => {
    const result = normalizeSellerProductsResponse([{ id: 1, name: "کفش" }]);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("کفش");
    expect(result.hasMore).toBe(false);
  });

  it("reads the products field from the current API", () => {
    const result = normalizeSellerProductsResponse({ products: [{ id: 2, name: "کیف" }] });
    expect(result.products[0].id).toBe(2);
    expect(result.total).toBe(1);
  });

  it("returns an empty list when the payload is empty", () => {
    expect(normalizeSellerProductsResponse(null).products).toEqual([]);
    expect(normalizeSellerProductsResponse({}).products).toEqual([]);
  });
});
