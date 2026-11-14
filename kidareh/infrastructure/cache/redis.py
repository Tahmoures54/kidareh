"""Redis cache with a bounded local fallback when Redis is unavailable."""
from __future__ import annotations

import logging
from typing import Any

from .local import LocalTTLCache

logger = logging.getLogger(__name__)


class RedisCache:
    def __init__(self, url: str, prefix: str = "kidareh:", socket_timeout: float = 1.5, default_ttl: int = 300, max_items: int = 2048):
        try:
            from redis import Redis
        except ImportError as exc:  # pragma: no cover - dependency installation path
            raise RuntimeError("Redis cache requires the 'redis' package.") from exc
        self._client = Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=socket_timeout,
            socket_timeout=socket_timeout,
            health_check_interval=30,
        )
        self.prefix = prefix
        self.default_ttl = max(1, int(default_ttl))
        self.fallback = LocalTTLCache(max_items=max_items, default_ttl=self.default_ttl)
        self._warned = False

    def _key(self, key: str) -> str:
        return self.prefix + str(key)

    def _failed(self, operation: str, error: Exception) -> None:
        if not self._warned:
            logger.warning("Redis cache unavailable; using per-process local fallback (%s: %s)", operation, error)
            self._warned = True

    def get(self, key: str) -> Any | None:
        try:
            value = self._client.get(self._key(key))
            if value is None:
                return self.fallback.get(key)
            return value
        except Exception as exc:  # Redis must never take the marketplace down.
            self._failed("get", exc)
            return self.fallback.get(key)

    def set(self, key: str, value: Any, ttl: int | None = None) -> bool:
        ttl = max(1, int(ttl if ttl is not None else self.default_ttl))
        try:
            self._client.set(self._key(key), str(value), ex=ttl)
            self.fallback.delete(key)
            return True
        except Exception as exc:
            self._failed("set", exc)
            return self.fallback.set(key, value, ttl)

    def delete(self, key: str) -> bool:
        try:
            self._client.delete(self._key(key))
            self.fallback.delete(key)
            return True
        except Exception as exc:
            self._failed("delete", exc)
            return self.fallback.delete(key)

    def health(self) -> dict[str, Any]:
        try:
            self._client.ping()
            self._warned = False
            return {"backend": "redis", "status": "ok"}
        except Exception as exc:
            self._failed("health", exc)
            return {"backend": "redis", "status": "degraded", "fallback": "local", "error": type(exc).__name__}


def create_cache(url: str | None = None, prefix: str = "kidareh:", max_items: int = 2048, default_ttl: int = 300):
    """Create Redis when configured; otherwise use bounded local TTL cache."""
    if url and url.strip():
        try:
            return RedisCache(
                url.strip(),
                prefix=prefix,
                default_ttl=default_ttl,
                max_items=max_items,
            )
        except RuntimeError as exc:
            # Redis is an optional infrastructure service for local development.
            # A missing client library must never prevent the web app from booting.
            logger.warning(
                "Redis is configured but its Python client is unavailable; "
                "using bounded local cache instead. Install with: "
                "py -m pip install redis (%s)",
                exc,
            )
    return LocalTTLCache(max_items=max_items, default_ttl=default_ttl)
