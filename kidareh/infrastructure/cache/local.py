"""Thread-safe in-process TTL cache used for development and Redis fallback."""
from __future__ import annotations

import threading
import time
from typing import Any


class LocalTTLCache:
    def __init__(self, max_items: int = 2048, default_ttl: int = 300):
        self.default_ttl = max(1, int(default_ttl))
        self.max_items = max(32, int(max_items))
        self._items: dict[str, tuple[float, Any]] = {}
        self._lock = threading.RLock()

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            item = self._items.get(str(key))
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= now:
                self._items.pop(str(key), None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> bool:
        ttl = max(1, int(ttl if ttl is not None else self.default_ttl))
        now = time.monotonic()
        with self._lock:
            if len(self._items) >= self.max_items and str(key) not in self._items:
                expired = [k for k, (expiry, _) in self._items.items() if expiry <= now]
                for old_key in expired:
                    self._items.pop(old_key, None)
                if len(self._items) >= self.max_items:
                    # Evict the entry that expires soonest; this is a bounded
                    # cache, not a source of truth.
                    oldest = min(self._items, key=lambda k: self._items[k][0])
                    self._items.pop(oldest, None)
            self._items[str(key)] = (now + ttl, value)
        return True

    def delete(self, key: str) -> bool:
        with self._lock:
            self._items.pop(str(key), None)
        return True

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {"backend": "local", "status": "ok", "items": len(self._items)}
