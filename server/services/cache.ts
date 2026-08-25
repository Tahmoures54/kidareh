/**
 * High-level cache helpers for Kidareh
 * Prefix: kidareh:
 */

import {
  redisGet,
  redisSet,
  redisDel,
  redisDelByPattern,
  getCacheBackend,
} from "./redis.js";
import logger from "../logger.js";

const PREFIX = process.env.CACHE_PREFIX || "kidareh";

/** TTL defaults (seconds) */
export const CacheTTL = {
  SEARCH: Number(process.env.CACHE_TTL_SEARCH) || 60, // search results
  PRODUCT: Number(process.env.CACHE_TTL_PRODUCT) || 120, // product detail
  STORES: Number(process.env.CACHE_TTL_STORES) || 90,
  SETTINGS: Number(process.env.CACHE_TTL_SETTINGS) || 300,
  OTP: Number(process.env.CACHE_TTL_OTP) || 300, // 5 min
  STATS: Number(process.env.CACHE_TTL_STATS) || 30,
} as const;

function key(...parts: (string | number)[]): string {
  return [PREFIX, ...parts.map(String)].join(":");
}

export const CacheKeys = {
  search: (hash: string) => key("search", hash),
  product: (id: string | number) => key("product", id),
  store: (id: string | number) => key("store", id),
  storesList: (hash: string) => key("stores", hash),
  settings: (name: string) => key("settings", name),
  otp: (phone: string) => key("otp", phone),
  otpRate: (phone: string) => key("otp-rate", phone),
  stats: () => key("stats"),
};

/** Stable hash for cache keys from objects */
export function hashParams(obj: Record<string, unknown>): string {
  const normalized = Object.keys(obj)
    .sort()
    .map((k) => `${k}=${obj[k] ?? ""}`)
    .join("&");
  // simple non-crypto hash (FNV-1a style)
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export async function cacheGet<T>(cacheKey: string): Promise<T | null> {
  try {
    const raw = await redisGet(cacheKey);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn("cacheGet parse error:", err);
    return null;
  }
}

export async function cacheSet(
  cacheKey: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    await redisSet(cacheKey, JSON.stringify(value), ttlSeconds);
  } catch (err) {
    logger.warn("cacheSet error:", err);
  }
}

export async function cacheDel(...cacheKeys: string[]): Promise<void> {
  await redisDel(...cacheKeys);
}

/**
 * Get from cache or compute and store
 */
export async function cacheGetOrSet<T>(
  cacheKey: string,
  ttlSeconds: number,
  factory: () => Promise<T> | T
): Promise<T> {
  const hit = await cacheGet<T>(cacheKey);
  if (hit !== null) return hit;

  const value = await factory();
  await cacheSet(cacheKey, value, ttlSeconds);
  return value;
}

/** Invalidate all product search caches */
export async function invalidateSearchCache(): Promise<void> {
  const n = await redisDelByPattern(`${PREFIX}:search:*`);
  if (n > 0) logger.info(`🗑️ Invalidated ${n} search cache keys`);
}

/** Invalidate a single product + all searches */
export async function invalidateProductCache(productId: string | number): Promise<void> {
  await redisDel(CacheKeys.product(productId));
  await invalidateSearchCache();
}

/** Invalidate store-related caches */
export async function invalidateStoreCache(storeId?: string | number): Promise<void> {
  if (storeId != null) await redisDel(CacheKeys.store(storeId));
  await redisDelByPattern(`${PREFIX}:stores:*`);
  await invalidateSearchCache();
}

export function cacheStatus() {
  return {
    backend: getCacheBackend(),
    prefix: PREFIX,
    ttl: CacheTTL,
  };
}
