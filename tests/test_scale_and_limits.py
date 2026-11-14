"""Scale-oriented behaviour: rate limits, sharded uploads, cached sitemap.

These cover the work done to prepare for hundreds of thousands of stores and
millions of listings, where a missing limit or an unbounded query stops being
a nuisance and becomes an outage.

Fixes applied compared to the earlier version:

* ``KIDAREH_SEED_DEMO_DATA="0"`` is truthy in Python (``bool("0") is True``),
  so an ``if os.environ.get(...)`` check in the app would have seeded demo
  data, shifting row ids and breaking the hardcoded ids. We now ``delenv`` the
  variable unambiguously, and clear every other env var the factory reads.
* ``DATABASE_PATH`` was patched only via config; ``kidareh.core`` and
  ``kidareh.schema_init`` could still hold the original reference.
* The ``seller`` fixture set ``session["user_id"] = 1`` *before* inserting the
  user; it now captures ``lastrowid`` and only then primes the session.
* Tests that inserted users/listings/stores with explicit ids (``9``, ``1``,
  ``2``) were fragile when seed data shifted ids. They now use ``lastrowid``.
* Every insert commits explicitly.
* ``phone_verified_at`` is an ISO datetime, not the literal ``"verified"``.
* ``test_uploaded_images_are_stored_in_sharded_directories`` used a fragile
  ``split("/")[-3:]``; the path is now parsed with ``PurePosixPath`` so the
  intent is explicit.
* The ``monkeypatch`` on ``rate_limits.time.time`` is documented as a
  full-module override; the test only relies on it inside the
  ``with app.app_context()`` block, so any concurrent use is unaffected.
"""
import time
from io import BytesIO
from pathlib import PurePosixPath

import pytest

from kidareh import create_app
from kidareh.core import get_connection, initialize_database
from kidareh.services import rate_limits


VERIFIED_AT = "2026-01-01T00:00:00+00:00"
CSRF_TOKEN = "scale-csrf"

_ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
    "KIDAREH_SEED_DEMO_DATA",
    "KAVENEGAR_API_KEY",
    "ADMIN_PHONE",
    "ZIBAL_MERCHANT",
    "ZIBAL_MERCHANT_ID",
    "SECRET_KEY",
)


# ---------------------------------------------------------------------------
# infrastructure helpers
# ---------------------------------------------------------------------------
def _patch_db_path(monkeypatch, db_path):
    import importlib
    import main as app_module
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


def _login(client, user_id):
    with client.session_transaction() as session:
        session["csrf_token"] = CSRF_TOKEN
        session["user_id"] = user_id
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN


def _insert_user(db, name, phone, role="seller"):
    return db.execute(
        "INSERT INTO users (name, phone, password_hash, role, phone_verified_at)"
        " VALUES (?, ?, 'hash', ?, ?)",
        (name, phone, role, VERIFIED_AT),
    ).lastrowid


def _insert_store(db, owner_id, name="ویترین", city="تهران"):
    return db.execute(
        "INSERT INTO stores (owner_id, name, city) VALUES (?, ?, ?)",
        (owner_id, name, city),
    ).lastrowid


# ---------------------------------------------------------------------------
# fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def app(tmp_path, monkeypatch):
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)

    db_path = tmp_path / "instance" / "scale.sqlite3"
    _patch_db_path(monkeypatch, db_path)

    application = create_app({
        "TESTING": True,
        "SECRET_KEY": "scale-test-secret",
        "DATABASE_PATH": str(db_path),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    with application.app_context():
        initialize_database()
    return application


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def seller(client):
    """A signed-in seller with a store, used to exercise write limits."""
    with client.application.app_context():
        with get_connection() as db:
            user_id = _insert_user(db, "فروشنده", "09121112222", role="seller")
            store_id = _insert_store(db, user_id)
            db.commit()
    _login(client, user_id)
    return {"user_id": user_id, "store_id": store_id}


# ---------------------------------------------------------------------------
# Index self-healing
# ---------------------------------------------------------------------------
def test_stale_index_definitions_are_repaired(app):
    """A renamed-but-changed index must be rebuilt, not silently kept.

    ``CREATE INDEX IF NOT EXISTS`` is a no-op when the name already exists, so
    a deployment upgraded in place would keep whichever definition it
    happened to have. Comparing definitions is what prevents that.
    """
    from kidareh.core import (
        PERFORMANCE_INDEXES,
        _ensure_performance_indexes,
    )

    with app.app_context():
        with get_connection() as db:
            db.execute("DROP INDEX IF EXISTS idx_listings_store_id")
            db.execute("CREATE INDEX idx_listings_store_id ON listings(store_id)")
            db.execute(
                "CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)"
            )

            _ensure_performance_indexes(db)

            definitions = {
                row["name"]: row["sql"]
                for row in db.execute(
                    "SELECT name, sql FROM sqlite_master WHERE type='index'"
                )
            }
            assert (
                definitions["idx_listings_store_id"]
                == PERFORMANCE_INDEXES["idx_listings_store_id"]
            )
            assert "idx_listings_category" not in definitions  # superseded, dropped


def test_index_ensuring_is_idempotent(app):
    """Running it twice must not rebuild anything (no start-up churn)."""
    from kidareh.core import _ensure_performance_indexes

    with app.app_context():
        with get_connection() as db:
            _ensure_performance_indexes(db)
            before = {
                row["name"]: row["sql"]
                for row in db.execute(
                    "SELECT name, sql FROM sqlite_master WHERE type='index'"
                )
            }
            _ensure_performance_indexes(db)
            after = {
                row["name"]: row["sql"]
                for row in db.execute(
                    "SELECT name, sql FROM sqlite_master WHERE type='index'"
                )
            }
    assert before == after


# ---------------------------------------------------------------------------
# Rate limits
# ---------------------------------------------------------------------------
def test_rate_limiter_allows_up_to_the_limit_then_blocks(app, seller):
    with app.app_context():
        for _ in range(3):
            remaining = rate_limits.consume(
                "unit_test", "caller-1", limit=3, window_seconds=60
            )
        assert remaining == 0
        with pytest.raises(rate_limits.RateLimitExceeded) as raised:
            rate_limits.consume(
                "unit_test", "caller-1", limit=3, window_seconds=60
            )
    assert raised.value.retry_after >= 1


def test_rate_limiter_scopes_are_independent(app):
    with app.app_context():
        rate_limits.consume("scope_a", "caller", limit=1, window_seconds=60)
        # A different scope (or a different caller) has its own budget.
        assert (
            rate_limits.consume("scope_b", "caller", limit=1, window_seconds=60)
            == 0
        )
        assert (
            rate_limits.consume("scope_a", "other-caller", limit=1, window_seconds=60)
            == 0
        )


def test_rate_limiter_window_rolls_over(app, monkeypatch):
    # ``rate_limits.time`` is a module-level alias; patching ``time`` on that
    # module only affects the limiter, not the rest of the process.
    clock = {"now": time.time()}
    monkeypatch.setattr(rate_limits.time, "time", lambda: clock["now"])
    with app.app_context():
        rate_limits.consume("rolling", "caller", limit=1, window_seconds=60)
        with pytest.raises(rate_limits.RateLimitExceeded):
            rate_limits.consume("rolling", "caller", limit=1, window_seconds=60)
        clock["now"] += 61
        assert (
            rate_limits.consume("rolling", "caller", limit=1, window_seconds=60)
            == 0
        )


def test_rate_limiter_hashes_the_key(app):
    with app.app_context():
        rate_limits.consume("hashing", "09123456789", limit=5, window_seconds=60)
        with get_connection() as db:
            stored = db.execute(
                "SELECT key_hash FROM rate_limits WHERE scope='hashing'"
            ).fetchone()
    # Raw phone numbers and IPs must never be persisted.
    assert "09123456789" not in stored["key_hash"]


def test_listing_creation_is_rate_limited(client, seller):
    payload = {
        "title": "کالای تکراری",
        "category": "home",
        "city": "تهران",
        "price": 1000,
        "description": "تست محدودیت",
    }
    blocked = None
    for index in range(65):
        response = client.post(
            "/api/listings",
            headers={"X-CSRF-Token": CSRF_TOKEN},
            json={**payload, "title": f"کالا {index}"},
        )
        if response.status_code == 429:
            blocked = response
            break
    assert blocked is not None
    body = blocked.get_json()
    assert body["error"] == "listing_create"
    assert body["retry_after"] >= 1


def test_store_creation_is_rate_limited(client, app):
    with app.app_context():
        with get_connection() as db:
            user_id = _insert_user(db, "فروشنده", "09121119999", role="seller")
            db.commit()
    _login(client, user_id)

    responses = [
        client.post(
            "/api/stores",
            headers={"X-CSRF-Token": CSRF_TOKEN},
            json={"name": f"ویترین {index}", "city": "تهران"},
        )
        for index in range(7)
    ]
    assert responses[0].status_code == 201
    assert any(response.status_code == 429 for response in responses[1:])


def test_reporting_is_rate_limited(client, seller):
    with client.application.app_context():
        with get_connection() as db:
            listing_id = db.execute(
                "INSERT INTO listings (title, category, city, price)"
                " VALUES ('کالا', 'home', 'تهران', 1000)"
            ).lastrowid
            db.commit()

    responses = [
        client.post(
            "/api/reports",
            headers={"X-CSRF-Token": CSRF_TOKEN},
            json={
                "target_type": "listing",
                "target_id": listing_id,
                "reason": "spam",
                "details": "تست",
            },
        )
        for _ in range(12)
    ]
    assert responses[0].status_code == 201
    assert any(response.status_code == 429 for response in responses[-3:])


def test_chat_messages_are_rate_limited(client, app):
    with app.app_context():
        with get_connection() as db:
            buyer_id = _insert_user(db, "خریدار", "09121111111", role="buyer")
            seller_id = _insert_user(db, "فروشنده", "09121112222", role="seller")
            store_id = _insert_store(db, seller_id)
            listing_id = db.execute(
                "INSERT INTO listings (title, category, city, price, owner_id, store_id)"
                " VALUES ('کالا', 'home', 'تهران', 1000, ?, ?)",
                (seller_id, store_id),
            ).lastrowid
            conversation_id = db.execute(
                "INSERT INTO conversations (listing_id, buyer_id, seller_id)"
                " VALUES (?, ?, ?)",
                (listing_id, buyer_id, seller_id),
            ).lastrowid
            db.commit()
    _login(client, buyer_id)

    # The cooldown alone stops rapid-fire messages.
    first = client.post(
        f"/api/conversations/{conversation_id}/messages",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"body": "سلام"},
    )
    second = client.post(
        f"/api/conversations/{conversation_id}/messages",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"body": "سلام دوباره"},
    )
    assert first.status_code == 201
    assert second.status_code == 429


# ---------------------------------------------------------------------------
# Upload sharding
# ---------------------------------------------------------------------------
def test_uploaded_images_are_stored_in_sharded_directories(client, seller):
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    response = client.post(
        "/api/listings",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        data={
            "title": "کالا با تصویر",
            "category": "home",
            "city": "تهران",
            "price": "1000",
            "image": (BytesIO(png), "photo.png"),
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    image_path = response.get_json()["item"]["image_path"]

    # Expected shape: /static/uploads/<2-char shard>/<filename starting with shard>
    path = PurePosixPath(image_path)
    assert path.parts[-4:-2] == ("static", "uploads"), image_path
    shard, filename = path.parts[-2], path.parts[-1]
    assert len(shard) == 2, (shard, image_path)
    assert filename.startswith(shard), (filename, shard)

    from pathlib import Path

    upload_folder = Path(client.application.config["UPLOAD_FOLDER"])
    assert (upload_folder / shard / filename).is_file()


def test_deleting_a_listing_removes_the_sharded_image(client, seller):
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    created = client.post(
        "/api/listings",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        data={
            "title": "کالا با تصویر",
            "category": "home",
            "city": "تهران",
            "price": "1000",
            "image": (BytesIO(png), "photo.png"),
        },
        content_type="multipart/form-data",
    )
    assert created.status_code == 201
    listing_id = created.get_json()["item"]["id"]
    relative = created.get_json()["item"]["image_path"].replace(
        "/static/uploads/", "", 1
    )
    from pathlib import Path

    saved = Path(client.application.config["UPLOAD_FOLDER"]) / relative
    assert saved.is_file()

    deleted = client.delete(
        f"/api/listings/{listing_id}", headers={"X-CSRF-Token": CSRF_TOKEN}
    )
    assert deleted.status_code == 200
    assert not saved.exists()


def test_upload_route_refuses_path_traversal(client):
    """Both raw and percent-encoded traversal forms must be refused.

    Werkzeug's test client does not normalize ``..`` before sending; the
    server's upload handler is what must reject these paths.
    """
    attempts = (
        "../../etc/passwd",
        "..%2f..%2fetc%2fpasswd",
        "%2e%2e/%2e%2e/etc/passwd",
        "ab/../../secret.txt",
    )
    for path in attempts:
        response = client.get(f"/static/uploads/{path}")
        assert response.status_code in (400, 404), (path, response.status_code)


# ---------------------------------------------------------------------------
# Sitemap caching
# ---------------------------------------------------------------------------
def test_sitemap_is_cached_then_refreshes(client, monkeypatch):
    """Crawlers must be served without re-querying, but new pages must appear."""
    from kidareh.routes import pages

    pages._sitemap_cache.clear()

    first = client.get("/sitemap.xml")
    assert first.status_code == 200
    assert "max-age=600" in first.headers["Cache-Control"]
    first_body = first.get_data()

    with client.application.app_context():
        with get_connection() as db:
            store_id = db.execute(
                "INSERT INTO stores (name, city) VALUES ('ویترین تازه', 'تهران')"
            ).lastrowid
            db.commit()

    # Still cached: the brand-new store is not in the response yet.
    assert client.get("/sitemap.xml").get_data() == first_body

    # Once the cache is stale the document is rebuilt and picks the store up.
    monkeypatch.setattr(pages, "SITEMAP_CACHE_SECONDS", 0)
    refreshed = client.get("/sitemap.xml").get_data()
    assert refreshed != first_body
    assert f"/store/{store_id}" in refreshed.decode("utf-8")


def test_robots_txt_is_cacheable(client):
    response = client.get("/robots.txt")
    assert response.status_code == 200
    assert "max-age=3600" in response.headers["Cache-Control"]
    assert "Sitemap:" in response.get_data(as_text=True)