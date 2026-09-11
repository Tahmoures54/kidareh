import { describe, expect, it } from "vitest";
import { normalizeProductStatus } from "../../../server/utils/productStatus";

describe("normalizeProductStatus", () => {
  it("keeps database statuses", () => {
    expect(normalizeProductStatus("موجود")).toBe("موجود");
    expect(normalizeProductStatus("فقط ۱ عدد")).toBe("فقط ۱ عدد");
    expect(normalizeProductStatus("ناموجود")).toBe("ناموجود");
    expect(normalizeProductStatus("به‌زودی")).toBe("به‌زودی");
  });

  it("maps seller UI leftovers onto the database set", () => {
    expect(normalizeProductStatus("موجودی کم")).toBe("فقط ۱ عدد");
    expect(normalizeProductStatus("فقط ۳ عدد")).toBe("فقط ۱ عدد");
    expect(normalizeProductStatus("به زودی")).toBe("به‌زودی");
  });

  it("rejects unknown values", () => {
    expect(normalizeProductStatus("")).toBeNull();
    expect(normalizeProductStatus("unknown")).toBeNull();
    expect(normalizeProductStatus(12)).toBeNull();
  });
});
