import { describe, expect, it } from "vitest";
import { getStockFreshness, stockFreshnessLabel } from "../../../src/utils/stockFreshness";

const NOW = Date.parse("2026-10-09T12:00:00.000Z");

describe("stock freshness", () => {
  it("marks a recent seller confirmation as fresh", () => {
    const result = getStockFreshness("2026-10-09 11:48:00", 1, NOW);
    expect(result).toEqual({ kind: "confirmed", minutesAgo: 12 });
    expect(stockFreshnessLabel(result)).toBe("۱۲ دقیقه پیش تأیید شد");
  });

  it("marks stock older than two hours as stale", () => {
    const result = getStockFreshness("2026-10-09 09:59:00", 1, NOW);
    expect(result.kind).toBe("stale");
  });

  it("does not call unconfirmed stock fresh", () => {
    expect(getStockFreshness(null, 0.5, NOW).kind).toBe("unknown");
    expect(getStockFreshness("2026-10-09 11:00:00", 0.4, NOW).kind).toBe("unknown");
  });

  it("handles ISO timestamps and invalid values safely", () => {
    expect(getStockFreshness("2026-10-09T11:59:00.000Z", 1, NOW).kind).toBe("confirmed");
    expect(getStockFreshness("not-a-date", 1, NOW).kind).toBe("unknown");
  });
});
