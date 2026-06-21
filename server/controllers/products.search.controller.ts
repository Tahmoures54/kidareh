/**
 * Products Search Controller
 * @location /server/controllers/products.search.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { searchProductsService } from "../services/products.search.service.js";

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

function decodeCursor(cursor?: string): { id: number } | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.id !== "number") return null;
    return parsed as { id: number };
  } catch {
    return null;
  }
}

function encodeCursor(payload: { id: number }): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export async function searchProducts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = querySchema.parse(req.query);

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

    const cursor = decodeCursor(parsed.cursor);

    const result = await searchProductsService({
      ...parsed,
      cursor,
      onlyAvailable: parsed.onlyAvailable === 1,
    });

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