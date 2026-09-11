import { describe, expect, it } from "vitest";
import { nextStatus, normalizeStatus } from "@/pages/SellerPanel/hooks/useSellerPanel";

describe("seller status cycle", () => {
  it("taps through a simple Persian stock cycle", () => {
    expect(nextStatus("موجود")).toBe("موجودی کم");
    expect(nextStatus("موجودی کم")).toBe("فقط ۱ عدد");
    expect(nextStatus("فقط ۱ عدد")).toBe("ناموجود");
    expect(nextStatus("ناموجود")).toBe("موجود");
  });

  it("maps leftover stock labels to the simple set", () => {
    expect(normalizeStatus("فقط ۳ عدد")).toBe("فقط ۱ عدد");
    expect(normalizeStatus("unknown")).toBe("موجود");
    expect(nextStatus("فقط ۳ عدد")).toBe("ناموجود");
  });
});
