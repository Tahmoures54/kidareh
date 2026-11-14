"""Integration coverage for advanced listing filters, notifications and seller stats.

This module replaces the earlier version that had several issues:

- ``app.config.update(TESTING=True)`` leaked across tests. We now use
  ``monkeypatch.setitem`` so the flag is restored automatically.
- ``DATABASE_PATH`` was only patched on ``main``; if ``core`` / ``schema_init``
  hold their own reference the tests silently hit the real DB. We now patch
  every module that may own the constant.
- Inserts relied on the surrounding ``with get_connection()`` to commit. We
  now commit explicitly to remove any ambiguity.
- ``phone_verified_at`` was set to the string ``"verified"`` instead of an ISO
  timestamp.
- Filter/scoping tests were passing vacuously (Tehran is both a province and a
  city; ``>= 0`` assertions are meaningless). Those are replaced by real
  assertions.
- Env vars are cleared in ``_make_client`` for consistency with the other
  test modules and to keep the suite robust on hosts that export them.
"""
import datetime as dt
import importlib

import main as app_module


VERIFIED_AT = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc).isoformat()
CSRF_TOKEN = "test-token"

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
# helpers (not collected by pytest)
# ---------------------------------------------------------------------------
def _patch_db_path(monkeypatch, db_path):
    """Point every module that may own a ``DATABASE_PATH`` reference at the test DB."""
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


def _make_client(monkeypatch, tmp_path, filename="advanced-features.sqlite3"):
    """Fresh test client backed by a throwaway SQLite database.

    ``TESTING`` is set via ``monkeypatch.setitem`` so it is restored after the
    test instead of leaking into the rest of the suite. Env vars are cleared so
    the factory cannot be pushed into production mode by a host that exports
    ``LIARA_APP_ID``.
    """
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)

    db_path = tmp_path / filename
    _patch_db_path(monkeypatch, db_path)
    monkeypatch.setitem(app_module.app.config, "TESTING", True)
    app_module.initialize_database()
    return app_module.app.test_client()


def _seed_user(db, phone, role="buyer", verified=True):
    return db.execute(
        "INSERT INTO users(name,phone,password_hash,role,phone_verified_at)"
        " VALUES(?,?,?,?,?)",
        (f"user-{phone}", phone, "x", role, VERIFIED_AT if verified else None),
    ).lastrowid


def _seed_store(db, owner_id, name="فروشگاه تست", city="تهران"):
    return db.execute(
        "INSERT INTO stores(owner_id,name,city,description) VALUES(?,?,?,?)",
        (owner_id, name, city, "توضیح"),
    ).lastrowid


def _seed_listing(db, *, owner_id, store_id, title, category, city, price):
    return db.execute(
        "INSERT INTO listings(title,category,city,price,owner_id,store_id)"
        " VALUES(?,?,?,?,?,?)",
        (title, category, city, price, owner_id, store_id),
    ).lastrowid


def _login(client, user_id):
    with client.session_transaction() as session:
        session["user_id"] = user_id
        session["csrf_token"] = CSRF_TOKEN
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN


def _logout(client):
    with client.session_transaction() as session:
        session.clear()
    client.environ_base.pop("HTTP_X_CSRF_TOKEN", None)


def _setup_seller(monkeypatch, tmp_path):
    """Seller with a store and two listings: one in Tehran, one in Tabriz."""
    client = _make_client(monkeypatch, tmp_path)
    with app_module.get_connection() as db:
        seller_id = _seed_user(db, "09120000000", role="seller")
        store_id = _seed_store(db, seller_id)
        _seed_listing(
            db, owner_id=seller_id, store_id=store_id,
            title="کالای تهران", category="home", city="تهران", price=1000,
        )
        _seed_listing(
            db, owner_id=seller_id, store_id=store_id,
            title="کالای تبریز", category="home", city="تبریز", price=2000,
        )
        db.commit()
    _login(client, seller_id)
    return client, seller_id, store_id


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_listing_filters_by_province_and_category(monkeypatch, tmp_path):
    client, _, _ = _setup_seller(monkeypatch, tmp_path)

    # Tehran province → only Tehran city.
    r = client.get("/api/listings?province=تهران&category=home&limit=20")
    assert r.status_code == 200
    items = r.get_json()["items"]
    assert items, "expected at least one Tehran listing"
    assert all(i["city"] == "تهران" for i in items)

    # A non-Tehran province must never return Tehran listings. We do not
    # require تبریز to appear (the endpoint may or may not map city →
    # province), but if it does return items they must not be from Tehran.
    r = client.get("/api/listings?province=آذربایجان شرقی&limit=20")
    assert r.status_code == 200
    items = r.get_json()["items"]
    assert all(i["city"] != "تهران" for i in items), (
        "province filter leaked Tehran listings"
    )

    # Unknown category → empty result, proving ``category`` is honoured.
    r = client.get("/api/listings?category=does-not-exist&limit=20")
    assert r.status_code == 200
    assert r.get_json()["items"] == []


def test_new_message_creates_private_notification(monkeypatch, tmp_path):
    client, seller_id, _ = _setup_seller(monkeypatch, tmp_path)

    with app_module.get_connection() as db:
        buyer_id = _seed_user(db, "09120000001", role="buyer")
        stranger_id = _seed_user(db, "09120000099", role="buyer")
        listing_id = db.execute(
            "SELECT id FROM listings WHERE title='کالای تهران'"
        ).fetchone()[0]
        db.commit()

    _login(client, buyer_id)
    started = client.post("/api/conversations", json={"listing_id": listing_id})
    assert started.status_code == 201
    conv_id = started.get_json()["id"]

    sent = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"body": "سلام، کالا موجود است؟"},
    )
    assert sent.status_code == 201

    # Seller sees the notification.
    _login(client, seller_id)
    r = client.get("/api/notifications")
    assert r.status_code == 200
    payload = r.get_json()
    assert payload["unread_count"] >= 1
    kinds = [item["kind"] for item in payload["items"]]
    assert "new_message" in kinds

    # A stranger must not see someone else's notifications.
    _login(client, stranger_id)
    r = client.get("/api/notifications")
    assert r.status_code == 200
    payload = r.get_json()
    assert payload["unread_count"] == 0
    assert payload["items"] == []


def test_seller_stats_are_scoped_to_current_user(monkeypatch, tmp_path):
    client, seller_id, _ = _setup_seller(monkeypatch, tmp_path)

    _login(client, seller_id)
    r = client.get("/api/seller/stats")
    assert r.status_code == 200
    payload = r.get_json()
    assert payload["listing_count"] == 2
    assert isinstance(payload["views"], int) and payload["views"] >= 0
    assert isinstance(payload["sales"], int) and payload["sales"] >= 0

    # Another seller with no listings sees zeros, not the first seller's data.
    with app_module.get_connection() as db:
        other_id = _seed_user(db, "09120000002", role="seller")
        db.commit()

    _login(client, other_id)
    r = client.get("/api/seller/stats")
    assert r.status_code == 200
    payload = r.get_json()
    assert payload["listing_count"] == 0
    assert payload["views"] == 0
    assert payload["sales"] == 0


def test_seller_stats_requires_authentication(monkeypatch, tmp_path):
    client = _make_client(monkeypatch, tmp_path)
    _logout(client)  # nothing to clear on a fresh client, but explicit
    r = client.get("/api/seller/stats")
    assert r.status_code in (401, 403), (
        f"/api/seller/stats returned {r.status_code} without a session — "
        "it must reject anonymous requests"
    )