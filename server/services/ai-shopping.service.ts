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

export interface DecisionScore {
  score: number;
  reasons: string[];
  breakdown: {
    relevance: number;
    availability: number;
    distance: number;
    price: number;
    trust: number;
    freshness: number;
  };
}

export interface RankedShoppingProduct extends ProductRow {
  decision: DecisionScore;
}

export interface ShoppingAgentResult {
  reply: string;
  suggestedQuery: string;
  intent: ShoppingIntent;
  products: RankedShoppingProduct[];
  matched: boolean;
  simulated: boolean;
}

function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return null;
  try { return new GoogleGenerativeAI(key); }
  catch (error: any) { logger.error("Failed to initialize Gemini shopping agent:", error?.message || error); return null; }
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
  try { const parsed = JSON.parse(cleaned.slice(start, end + 1)); return parsed && typeof parsed === "object" ? parsed : null; }
  catch { return null; }
}

async function extractIntent(input: ShoppingAgentInput): Promise<ShoppingIntent> {
  const fallback: ShoppingIntent = { query: cleanQuery(input.message, ""), city: input.city, onlyAvailable: true, sort: input.lat != null && input.lng != null ? "nearest" : "relevance" };
  const client = getClient();
  if (!client) return fallback;
  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { temperature: 0, maxOutputTokens: 350 } });
    const prompt = `You are a shopping search intent parser for an Iranian local-commerce app. Return ONLY valid JSON. Do not answer the user. Extract a concise product search query from the user's Persian message.
Schema: {"query":string,"category":string|null,"city":string|null,"minPrice":number|null,"maxPrice":number|null,"onlyAvailable":boolean,"sort":"relevance"|"nearest"|"cheapest"}
Rules: preserve product/model/brand/specification terms; only set prices when explicitly stated; default onlyAvailable=true; use nearest only with coordinates; never invent city/product/brand/price/category.
User city: ${input.city || "unknown"}\nCoordinates available: ${input.lat != null && input.lng != null ? "yes" : "no"}\nUser message: ${input.message}`;
    const parsed = parseJsonObject((await model.generateContent(prompt)).response.text());
    if (!parsed) return fallback;
    const sort = parsed.sort === "cheapest" || parsed.sort === "nearest" || parsed.sort === "relevance" ? parsed.sort : fallback.sort;
    return {
      query: cleanQuery(parsed.query, fallback.query),
      category: typeof parsed.category === "string" && parsed.category.trim() ? parsed.category.trim().slice(0, 80) : undefined,
      city: typeof parsed.city === "string" && parsed.city.trim() ? parsed.city.trim().slice(0, 80) : input.city,
      minPrice: normalizeNumber(parsed.minPrice), maxPrice: normalizeNumber(parsed.maxPrice),
      onlyAvailable: parsed.onlyAvailable !== false, sort,
    };
  } catch (error: any) { logger.warn("Shopping intent extraction failed; using deterministic fallback", error?.message || error); return fallback; }
}

function priceScore(p: ProductRow, intent: ShoppingIntent, prices: number[]): number {
  const price = Number(p.price);
  if (!Number.isFinite(price)) return 0;
  if (intent.maxPrice != null) {
    if (price <= intent.maxPrice) return 20;
    const over = (price - intent.maxPrice) / Math.max(intent.maxPrice, 1);
    return Math.max(0, 20 - over * 100);
  }
  if (!prices.length) return 10;
  const min = Math.min(...prices), max = Math.max(...prices);
  if (max === min) return 15;
  return 5 + ((max - price) / (max - min)) * 15;
}

function distanceScore(p: ProductRow, products: ProductRow[]): number {
  if (p.distance == null || !Number.isFinite(Number(p.distance))) return 4;
  const distances = products.map(x => Number(x.distance)).filter(Number.isFinite);
  const max = Math.max(...distances, 1);
  return Math.max(0, 20 - (Number(p.distance) / max) * 20);
}

function freshnessScore(p: ProductRow): number {
  if (!p.updated_at) return 3;
  const ageDays = Math.max(0, (Date.now() - new Date(p.updated_at).getTime()) / 86400000);
  if (!Number.isFinite(ageDays)) return 3;
  if (ageDays <= 1) return 10;
  if (ageDays <= 7) return 8;
  if (ageDays <= 30) return 5;
  return 2;
}

function rankProducts(products: ProductRow[], intent: ShoppingIntent): RankedShoppingProduct[] {
  const prices = products.map(p => Number(p.price)).filter(Number.isFinite);
  return products.map(p => {
    const availability = /available|موجود|in.?stock/i.test(String(p.status || "")) ? 15 : 5;
    const relevance = 25;
    const distance = distanceScore(p, products);
    const price = priceScore(p, intent, prices);
    const trust = (p.has_business_license ? 5 : 0) + (Number(p.rating) >= 4 ? 5 : Number(p.rating) >= 3 ? 3 : 1);
    const freshness = freshnessScore(p);
    const score = Math.round(relevance + availability + distance + price + trust + freshness);
    const reasons: string[] = [];
    if (availability >= 15) reasons.push("موجودی ثبت‌شده دارد");
    if (intent.maxPrice != null && Number(p.price) <= intent.maxPrice) reasons.push("در بودجه شماست");
    if (distance >= 15) reasons.push("نسبتاً نزدیک‌تر است");
    if (p.has_business_license) reasons.push("فروشگاه دارای مجوز ثبت‌شده است");
    if (Number(p.rating) >= 4) reasons.push("امتیاز فروشگاه مناسب است");
    if (freshness >= 8) reasons.push("اطلاعات نسبتاً تازه است");
    if (!reasons.length) reasons.push("تطابق مناسب با عبارت جستجو");
    return { ...p, decision: { score, reasons: reasons.slice(0, 4), breakdown: { relevance, availability, distance, price, trust, freshness } } };
  }).sort((a, b) => b.decision.score - a.decision.score);
}

function formatPrice(price: number): string { return new Intl.NumberFormat("fa-IR").format(Math.round(price)); }

function deterministicReply(intent: ShoppingIntent, products: RankedShoppingProduct[]): string {
  if (!products.length) {
    const location = intent.city ? ` در ${intent.city}` : "";
    return `برای «${intent.query}»${location} فعلاً کالای ثبت‌شده‌ای در فهرست کی‌داره پیدا نکردم. می‌توانید عبارت جستجو را کمی دقیق‌تر یا ساده‌تر کنید.`;
  }
  const best = products[0];
  const lines = products.slice(0, 5).map((p, index) => `${index + 1}. ${p.name} — ${formatPrice(Number(p.price))} تومان\n   ${p.store_name}${p.distance != null ? ` • ${(Number(p.distance) / 1000).toFixed(1)} km` : ""}${p.status ? ` • ${p.status}` : ""}`);
  return `برای «${intent.query}» ${products.length === 1 ? "این گزینه" : "این گزینه‌ها"} در داده‌های واقعی فروشگاه‌ها پیدا شد.\n\nبهترین تطابق فعلی: «${best.name}» با امتیاز تصمیم ${best.decision.score}/100؛ ${best.decision.reasons.join("، ")} .\n\n${lines.join("\n\n")}\n\nاین امتیاز فقط برای کمک به مقایسه است و جای تأیید موجودی از فروشگاه را نمی‌گیرد.`;
}

async function generateGroundedReply(input: ShoppingAgentInput, intent: ShoppingIntent, products: RankedShoppingProduct[]): Promise<string> {
  const fallback = deterministicReply(intent, products);
  const client = getClient();
  if (!client) return fallback;
  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: `You are the final shopping assistant for an Iranian local-commerce app. Reply in polite conversational Persian. Use only supplied product records and their decision scores/reasons. Never invent availability, prices, stores, distances, specifications, guarantees, or rankings. Do not claim you searched the whole market. Explain that the decision score is a comparison aid, not a guarantee. Encourage stock confirmation before visiting.`, generationConfig: { temperature: 0.2, maxOutputTokens: 650 } });
    const records = products.slice(0, 8).map(p => ({ id: p.id, product: p.name, price: p.price, status: p.status, category: p.category, store: p.store_name, city: p.store_city || p.city, province: p.store_province || p.province, distance_m: p.distance, licensed: !!p.has_business_license, rating: p.rating, updated_at: p.updated_at, decision: p.decision }));
    const result = await model.generateContent(`User request: ${input.message}\n\nParsed intent:\n${JSON.stringify(intent)}\n\nREAL PRODUCT RECORDS (the only facts you may use):\n${JSON.stringify(records)}`);
    return result.response.text()?.trim() || fallback;
  } catch (error: any) { logger.warn("Grounded shopping reply failed; using deterministic response", error?.message || error); return fallback; }
}

export async function runShoppingAgent(input: ShoppingAgentInput): Promise<ShoppingAgentResult> {
  const message = cleanQuery(input.message, "");
  const intent = await extractIntent({ ...input, message });
  const result = await searchProductsService({ limit: 8, q: intent.query, category: intent.category, city: intent.city, scope: intent.city ? "city" : "all", sort: intent.sort, onlyAvailable: intent.onlyAvailable, minPrice: intent.minPrice, maxPrice: intent.maxPrice, lat: input.lat, lng: input.lng });
  let products = result.rows;
  if (!products.length && (intent.category || intent.city)) {
    const retry = await searchProductsService({ limit: 8, q: intent.query, sort: input.lat != null && input.lng != null ? "nearest" : "relevance", onlyAvailable: intent.onlyAvailable, minPrice: intent.minPrice, maxPrice: intent.maxPrice, lat: input.lat, lng: input.lng });
    products = retry.rows;
  }
  const ranked = rankProducts(products, intent);
  const reply = await generateGroundedReply(input, intent, ranked);
  return { reply, suggestedQuery: intent.query, intent, products: ranked, matched: ranked.length > 0, simulated: getClient() == null };
}

export function countActiveProductsForCity(city?: string): number {
  try {
    if (!city) return (db.prepare("SELECT COUNT(*) AS count FROM products WHERE moderation_status = 'approved'").get() as { count: number })?.count || 0;
    return (db.prepare("SELECT COUNT(*) AS count FROM products WHERE moderation_status = 'approved' AND city = ?").get(city) as { count: number })?.count || 0;
  } catch { return 0; }
}
