/**
 * Products Search Controller
 * @location /server/controllers/products.search.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { searchProductsService } from "../services/products.search.service.js";

// ─── Schema ──────────────────────────────────────────────
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  scope: z.enum(["all", "city", "province"]).default("all"),
  sort: z.enum(["newest", "cheapest", "nearest"]).default("newest"),
  onlyAvailable: z.coerce.number().int().min(0).max(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  radiusKm: z.coerce.number().min(0.1).max(300).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

// ─── Cursor helpers (base64url safe for URL usage) ───────
function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

function decodeCursor(cursor?: string): { id: number } | null {
  if (!cursor) return null;
  try {
    const json = base64UrlDecode(cursor);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.id !== "number") return null;
    return parsed as { id: number };
  } catch {
    return null;
  }
}

function encodeCursor(payload: { id: number }): string {
  return base64UrlEncode(JSON.stringify(payload));
}

// ─── Main handler ────────────────────────────────────────
export async function searchProducts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = querySchema.parse(req.query);

    // Validation
    if (
      parsed.minPrice != null &&
      parsed.maxPrice != null &&
      parsed.minPrice > parsed.maxPrice
    ) {
      return res
        .status(400)
        .json({ error: "minPrice نباید بزرگ‌تر از maxPrice باشد." });
    }

    if (
      (parsed.sort === "nearest" || parsed.radiusKm != null) &&
      (parsed.lat == null || parsed.lng == null)
    ) {
      return res
        .status(400)
        .json({ error: "برای nearest/radiusKm باید lat و lng ارسال شود." });
    }

    // Decode cursor
    const cursor = decodeCursor(parsed.cursor);

    // Call service
    const result = await searchProductsService({
      ...parsed,
      cursor,
      onlyAvailable: parsed.onlyAvailable === 1,
    });

    // Build next cursor
    const hasMore = result.rows.length > parsed.limit;
    const sliced = hasMore ? result.rows.slice(0, parsed.limit) : result.rows;
    const last = sliced[sliced.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ id: last.id }) : null;

    return res.json({
      products: sliced,
      nextCursor,
      hasMore,
      total: result.total ?? undefined,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        error: "پارامترهای ورودی نامعتبر است.",
        details: err.issues,
      });
    }
    next(err);
  }
}