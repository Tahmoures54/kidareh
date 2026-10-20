import { describe, expect, it } from "vitest";
import { extractBearerToken } from "../../../server/utils/bearerToken.js";

describe("extractBearerToken", () => {
  it("extracts a standard Bearer token", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("accepts case-insensitive scheme and extra whitespace", () => {
    expect(extractBearerToken("bearer   abc123 ")).toBe("abc123");
  });

  it("rejects missing, empty, and non-Bearer authorization headers", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("Basic abc123")).toBeNull();
    expect(extractBearerToken("Bearer   ")).toBeNull();
    expect(extractBearerToken("Bearer \nabc123")).toBeNull();
  });
});
