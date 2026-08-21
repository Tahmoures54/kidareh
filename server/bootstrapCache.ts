/**
 * Cache bootstrap — init Redis (or memory fallback) at server start
 */
import { initRedis, closeRedis } from "./services/redis.js";
import { cacheStatus } from "./services/cache.js";
import logger from "./logger.js";

export async function bootstrapCache() {
  const backend = await initRedis();
  logger.info(`📦 Cache ready (${backend})`);
  return backend;
}

export { closeRedis, cacheStatus };
