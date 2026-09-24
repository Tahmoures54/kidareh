import { describe, expect, it } from "vitest";
import { isProductAvailable } from "../../../src/utils/productAvailability";

describe("isProductAvailable", () => {
  it("treats sellable stock states as available", () => {
    expect(isProductAvailable("موجود")).toBe(true);
    expect(isProductAvailable("فقط ۱ عدد")).toBe(true);
    expect(isProductAvailable("available")).toBe(true);
  });

  it("does not treat unavailable or future stock as available", () => {
    expect(isProductAvailable("ناموجود")).toBe(false);
    expect(isProductAvailable("به‌زودی")).toBe(false);
    expect(isProductAvailable(undefined)).toBe(false);
  });
});
