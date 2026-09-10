import { describe, expect, it } from "vitest";
import { runShoppingAgent } from "./ai-shopping.service.js";

describe("AI shopping agent", () => {
  it("returns a deterministic grounded result when Gemini is unavailable", async () => {
    const result = await runShoppingAgent({ message: "کابل HDMI" });
    expect(result.intent.query).toBeTruthy();
    expect(Array.isArray(result.products)).toBe(true);
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});
