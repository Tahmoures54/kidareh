/**
 * Redis client with graceful in-memory fallback
 * Works without Redis in local/dev — production should set REDIS_URL
 */

import Redis from "ioredis";
import logger from "../logger.js";

export type CacheBackend = "redis" | "memory" | "disabled";

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

class MemoryStore {
  private store = new Map<string, MemoryEntry>();
  private maxKeys = 5000;

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt != null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    if (this.store.size >= this.maxKeys) {
      // simple eviction: delete first expired or oldest inserted
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  keys(pattern: string): string[] {
    // pattern like "kidareh:products:*" → prefix match when * at end
    const prefix = pattern.replace(/\*$/, "");
    const out: string[] = [];
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix) || this.matchGlob(k, pattern)) out.push(k);
    }
    return out;
  }

  private matchGlob(key: string, pattern: string): boolean {
    const re = new RegExp(
      "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
    );
    return re.test(key);
  }

  flush(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

const memory = new MemoryStore();
let redis: Redis | null = null;
let backend: CacheBackend = "disabled";
let connecting = false;

export function getCacheBackend(): CacheBackend {
  return backend;
}

export function getRedis(): Redis | null {
  return redis;
}

/**
 * Initialize Redis if REDIS_URL is set. Falls back to memory automatically.
 */
export async function initRedis(): Promise<CacheBackend> {
  const url = process.env.REDIS_URL || process.env.REDIS_URI;
  const enabled = process.env.REDIS_ENABLED !== "false";

  if (!enabled) {
    backend = "memory";
    logger.info("📦 Cache: in-memory (REDIS_ENABLED=false)");
    return backend;
  }

  if (!url) {
    backend = "memory";
    logger.info("📦 Cache: in-memory (no REDIS_URL — OK for local dev)");
    return backend;
  }

  if (connecting || redis) return backend;
  connecting = true;

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 5) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
    });

    redis.on("error", (err) => {
      logger.warn("Redis error — falling back to memory:", err.message);
      backend = "memory";
    });

    redis.on("connect", () => {
      backend = "redis";
      logger.info("✅ Redis connected");
    });

    redis.on("close", () => {
      if (backend === "redis") {
        logger.warn("Redis connection closed — using memory fallback");
        backend = "memory";
      }
    });

    await redis.connect();
    await redis.ping();
    backend = "redis";
    logger.info("✅ Cache backend: Redis");
  } catch (err: any) {
    logger.warn(`Redis unavailable (${err?.message}) — using in-memory cache`);
    try {
      redis?.disconnect();
    } catch {}
    redis = null;
    backend = "memory";
  } finally {
    connecting = false;
  }

  return backend;
}

export async function redisGet(key: string): Promise<string | null> {
  if (backend === "redis" && redis) {
    try {
      return await redis.get(key);
    } catch {
      return memory.get(key);
    }
  }
  return memory.get(key);
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  if (backend === "redis" && redis) {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(key, value, "EX", ttlSeconds);
      } else {
        await redis.set(key, value);
      }
      return;
    } catch {
      // fall through to memory
    }
  }
  memory.set(key, value, ttlSeconds);
}

export async function redisDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  if (backend === "redis" && redis) {
    try {
      await redis.del(...keys);
      return;
    } catch {
      // fall through
    }
  }
  for (const k of keys) memory.del(k);
}

/** Delete keys matching pattern (e.g. kidareh:search:*) */
export async function redisDelByPattern(pattern: string): Promise<number> {
  if (backend === "redis" && redis) {
    try {
      let cursor = "0";
      let deleted = 0;
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = next;
        if (keys.length) {
          deleted += await redis.del(...keys);
        }
      } while (cursor !== "0");
      return deleted;
    } catch {
      // fall through to memory
    }
  }
  const keys = memory.keys(pattern);
  for (const k of keys) memory.del(k);
  return keys.length;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
    redis = null;
  }
  memory.flush();
  backend = "disabled";
}

export function getMemoryStats() {
  return { size: memory.size(), backend };
}
