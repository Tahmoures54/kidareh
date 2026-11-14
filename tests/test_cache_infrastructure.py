"""Unit tests for the bounded cache infrastructure (no Flask app required)."""
import time

from kidareh.infrastructure.cache.local import LocalTTLCache
from kidareh.infrastructure.cache.redis import create_cache


def test_local_cache_round_trip_and_delete():
    cache = LocalTTLCache(max_items=32)
    assert cache.set("key", "value", ttl=10)
    assert cache.get("key") == "value"
    assert cache.delete("key")
    assert cache.get("key") is None


def test_local_cache_expires_values():
    cache = LocalTTLCache(max_items=32)
    cache.set("short", "value", ttl=1)
    time.sleep(1.05)
    assert cache.get("short") is None


def test_factory_uses_local_cache_without_redis_url():
    cache = create_cache("")
    assert cache.health()["backend"] == "local"


def test_local_cache_is_bounded():
    cache = LocalTTLCache(max_items=32)
    for index in range(40):
        cache.set(str(index), index, ttl=60)
    assert cache.health()["items"] <= 32


def test_configured_redis_without_python_package_falls_back_to_local(monkeypatch):
    import sys

    # Simulate a clean Windows installation where requirements have not yet
    # been installed; Redis must not prevent the Flask application from booting.
    monkeypatch.setitem(sys.modules, "redis", None)
    cache = create_cache("redis://localhost:6379/0", max_items=64)
    assert cache.health()["backend"] == "local"
    assert cache.set("startup", "ok")
    assert cache.get("startup") == "ok"
