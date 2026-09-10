import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "../db.js";
import logger from "../logger.js";
import { searchProductsService, type ProductRow } from "./products.search.service.js";

export interface ShoppingAgentInput {
  message: string;
  city?: string;
  lat?: number;
  lng?: number;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}

export interface ShoppingIntent {
  query: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyAvailable: boolean;
  sort: "relevance" | "nearest" | "cheapest";
}

export interface ShoppingAgentResult {
  reply: string;
  suggestedQuery: string;
  intent: ShoppingIntent;
  products: ProductRow[];
  matched: boolean;
  simulated: boolean;
}

function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    return new GoogleGenerativeAI(key);
  } catch (error: any) {
    logger.error("Failed to initialize Gemini shopping agent:", error?.message || error);
    return null;
  }
}

function normalizeNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function cleanQuery(value: unknown, fallback: string): string {
  const q = typeof value === "string" ? value.replace(/[\n\r]/g, " ").trim() : "";
  return (q || fallback).slice(0, 120);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

async function extractIntent(input: ShoppingAgentInput): Promise<ShoppingIntent> {
  const fallback: ShoppingIntent = {
    query: cleanQuery(input.message, ""),
    city: input.city,
    onlyAvailable: true,
    sort: input.lat != null && input.lng != null ? "nearest" : "relevance",
  };

  const client = getClient();
  if (!client) return fallback;

  try {
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0, maxOutputTokens: 350 },
    });

    const prompt = `You are a shopping search intent parser for an Iranian local-commerce app. Return ONLY valid JSON.
Do not answer the user. Extract a concise product search query from the user's Persian message.
Schema: {"query":string,"category":string|null,"city":string|null,"minPrice":number|null,"maxPrice":number|null,"onlyAvailable":boolean,"sort":"relevance"|"nearest"|"cheapest"}
Rules:
- query must contain the actual product the user wants, not a sentence.
- Preserve important model/brand/specification terms.
- Only set prices when the user clearly gives a budget/range.
- Default onlyAvailable=true.
- Use nearest only when location coordinates are available; otherwise relevance.
- Never invent a city, product, brand, price, or category.
User city: ${input.city || "unknown"}
Coordinates available: ${input.lat != null && input.lng != null ? "yes" : "no"}
User message: ${input.message}`;

    const result = await model.generateContent(prompt);
    const parsed = parseJsonObject(result.response.text());
    if (!parsed) return fallback;

    const sort = parsed.sort === "cheapest" || parsed.sort === "nearest" || parsed.sort === "relevance"
      ? parsed.sort
      : fallback.sort;

    return {
      query: cleanQuery(parsed.query, fallback.query),
      category: typeof parsed.category === "string" && parsed.category.trim() ? parsed.category.trim().slice(0, 80) : undefined,
      city: typeof parsed.city === "string" && parsed.city.trim() ? parsed.city.trim().slice(0, 80) : input.city,
      minPrice: normalizeNumber(parsed.minPrice),
      maxPrice: normalizeNumber(parsed.maxPrice),
      onlyAvailable: parsed.onlyAvailable !== false,
      sort,
    };
  } catch (error: any) {
    logger.warn("Shopping intent extraction failed; using deterministic fallback", error?.message || error);
    return fallback;
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(price));
}

function deterministicReply(intent: ShoppingIntent, products: ProductRow[]): string {
  if (!products.length) {
    const location = intent.city ? ` در ${intent.city}` : "";
    return `برای «${intent.query}»${location} فعلاً کالای تأییدشده‌ای در فهرست کی‌داره پیدا نکردم. می‌توانید عبارت جستجو را کمی دقیق‌تر یا ساده‌تر کنید.`;
  }

  const lines = products.slice(0, 5).map((p, index) => {
    const distance = p.distance != null ? ` • ${Math.max(0, p.distance / 1000).toFixed(1)} km` : "";
    const availability = p.status ? ` • ${p.status}` : "";
    return `${index + 1}. ${p.name} — ${formatPrice(p.price)} تومان\n   ${p.store_name}${distance}${availability}`;
  });

  return `برای «${intent.query}» ${products.length === 1 ? "این گزینه" : "این گزینه‌ها"} را در داده‌های واقعی فروشگاه‌ها پیدا کردم:\n\n${lines.join("\n\n")}\n\nقبل از مراجعه، موجودی را با فروشگاه تأیید کنید.`;
}

async function generateGroundedReply(
  input: ShoppingAgentInput,
  intent: ShoppingIntent,
  products: ProductRow[]
): Promise<string> {
  const fallback = deterministicReply(intent, products);
  const client = getClient();
  if (!client) return fallback;

  try {
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are the final shopping assistant for an Iranian local-commerce app. Reply in polite conversational Persian. You MUST use only the supplied product records. Never invent availability, prices, stores, distances, specifications, or guarantees. If there are no records, say so clearly. Keep the response concise. Do not claim you searched the whole market. Encourage the user to confirm stock before visiting.`,
      generationConfig: { temperature: 0.2, maxOutputTokens: 650 },
    });

    const records = products.slice(0, 8).map((p) => ({
      id: p.id,
      product: p.name,
      price: p.price,
      status: p.status,
      category: p.category,
      store: p.store_name,
      city: p.store_city || p.city,
      province: p.store_province || p.province,
      distance_m: p.distance,
      licensed: !!p.has_business_license,
      rating: p.rating,
      updated_at: p.updated_at,
    }));

    const result = await model.generateContent(`User request: ${input.message}\n\nParsed intent:\n${JSON.stringify(intent)}\n\nREAL PRODUCT RECORDS (the only facts you may use):\n${JSON.stringify(records)}`);
    const text = result.response.text()?.trim();
    return text || fallback;
  } catch (error: any) {
    logger.warn("Grounded shopping reply failed; using deterministic response", error?.message || error);
    return fallback;
  }
}

export async function runShoppingAgent(input: ShoppingAgentInput): Promise<ShoppingAgentResult> {
  const message = cleanQuery(input.message, "");
  const intent = await extractIntent({ ...input, message });

  const result = await searchProductsService({
    limit: 8,
    q: intent.query,
    category: intent.category,
    city: intent.city,
    scope: intent.city ? "city" : "all",
    sort: intent.sort,
    onlyAvailable: intent.onlyAvailable,
    minPrice: intent.minPrice,
    maxPrice: intent.maxPrice,
    lat: input.lat,
    lng: input.lng,
  });

  // If the AI over-constrained a category/city and got no match, retry with the actual
  // extracted product query. This keeps AI helpful without allowing it to fabricate data.
  let products = result.rows;
  if (!products.length && (intent.category || intent.city)) {
    const retry = await searchProductsService({
      limit: 8,
      q: intent.query,
      sort: input.lat != null && input.lng != null ? "nearest" : "relevance",
      onlyAvailable: intent.onlyAvailable,
      minPrice: intent.minPrice,
      maxPrice: intent.maxPrice,
      lat: input.lat,
      lng: input.lng,
    });
    products = retry.rows;
  }

  const reply = await generateGroundedReply(input, intent, products);
  return {
    reply,
    suggestedQuery: intent.query,
    intent,
    products,
    matched: products.length > 0,
    simulated: getClient() == null,
  };
}

// Small helper for future admin/analytics integrations. It records no message text.
export function countActiveProductsForCity(city?: string): number {
  try {
    if (!city) {
      const row = db.prepare("SELECT COUNT(*) AS count FROM products WHERE moderation_status = 'approved'").get() as { count: number };
      return row?.count || 0;
    }
    const row = db.prepare("SELECT COUNT(*) AS count FROM products WHERE moderation_status = 'approved' AND city = ?").get(city) as { count: number };
    return row?.count || 0;
  } catch {
    return 0;
  }
}
