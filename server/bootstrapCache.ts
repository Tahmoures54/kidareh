/**
 * Cache + FTS bootstrap at server start
 */
import { initRedis, closeRedis } from "./services/redis.js";
import { cacheStatus } from "./services/cache.js";
import { ensureFts } from "./services/fts.js";
import logger from "./logger.js";

export async function bootstrapCache() {
  const backend = await initRedis();
  logger.info(`Cache ready (${backend})`);
  try {
    ensureFts();
  } catch (err: any) {
    logger.warn("FTS init skipped:", err?.message);
  }
  return backend;
}

export { closeRedis, cacheStatus, ensureFts };
