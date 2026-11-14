"""Tests for FTS-backed search and keyset pagination on /api/listings.

Fixes applied compared to the earlier version:

* Two tests inserted listings and never committed. If ``get_connection`` rolled
  back on ``__exit__`` (a valid context-manager behaviour), the listings would
  be invisible and the tests would fail with empty pages. Explicit
  ``commit()`` removes the ambiguity.
* ``app.config.update(TESTING=True, TESTING_OTP_CODE=False)`` leaked the flags
  across tests; replaced with ``monkeypatch.setitem`` so previous values are
  restored on teardown.
* ``DATABASE_PATH`` was patched only on ``main``. ``kidareh.core`` and
  ``kidareh.schema_init`` might hold their own reference, so the test could
  silently read the real DB.
* Env vars (``LIARA_APP_ID``, ``KIDAREH_SEED_DEMO_DATA``, ``KAVENEGAR_API_KEY``,
  ``ADMIN_PHONE``, ``ZIBAL_MERCHANT*``, ``SECRET_KEY``) are now cleared. The
  seed test depends on demo data being present, so we rely on the factory's
  default (seed enabled in non-production) rather than on a host-specific
  value.
* User and store IDs were assumed to be ``1``. They are captured via
  ``lastrowid`` and threaded through the session.
* ``phone_verified_at`` is a constant ISO datetime in the past, not a
  future-dated string.
* ``_test_fts_vocab`` is dropped in ``finally`` so a failed assertion does not
  leave a stray virtual table behind.
"""
import datetime as dt
import importlib

import main as app_module


VERIFIED_AT = dt.datetime(2020, 1, 1, tzinfo=dt.timezone.utc).isoformat()
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
# infrastructure helpers (not collected by pytest)
# ---------------------------------------------------------------------------
def _patch_db_path(monkeypatch, db_path):
    """Point every module that may own ``DATABASE_PATH`` at the test DB."""
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


def _login(client, user_id):
    with client.session_transaction() as session:
        session["user_id"] = user_id
        session["csrf_token"] = CSRF_TOKEN
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN


def _seed_user(connection, name="آزمایش", phone="09120000000", role="seller"):
    return connection.execute(
        "INSERT INTO users (name, phone, password_hash, role, phone_verified_at)"
        " VALUES (?, ?, ?, ?, ?)",
        (name, phone, "test-hash", role, VERIFIED_AT),
    ).lastrowid


def _seed_store(connection, owner_id, name="ویترین آزمایش", city="تبریز"):
    return connection.execute(
        "INSERT INTO stores (owner_id, name, city, description) VALUES (?, ?, ?, ?)",
        (owner_id, name, city, "فروشگاه تست"),
    ).lastrowid


def setup_test_database(monkeypatch, tmp_path, filename="test-kidareh.sqlite3"):
    """Fresh DB with one seller + one store; logged in as the seller.

    Demo seed data is left enabled (non-production default) because
    ``test_listings_fts_search_finds_seed_title`` searches for a seed-provided
    title. Env vars that would flip the app into production mode are cleared.
    """
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)

    db_path = tmp_path / filename
    _patch_db_path(monkeypatch, db_path)
    monkeypatch.setitem(app_module.app.config, "TESTING", True)
    monkeypatch.setitem(app_module.app.config, "TESTING_OTP_CODE", False)

    app_module.initialize_database()
    client = app_module.app.test_client()

    with app_module.get_connection() as connection:
        user_id = _seed_user(connection)
        _seed_store(connection, user_id)
        connection.commit()

    _login(client, user_id)
    return client, user_id


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_listings_response_includes_pagination_fields(monkeypatch, tmp_path):
    client, _ = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/api/listings?limit=2")
    assert response.status_code == 200
    data = response.get_json()
    assert "items" in data
    assert "has_more" in data
    assert "next_before_id" in data
    assert "next_before_featured" in data
    assert data["count"] == len(data["items"])
    assert data["count"] <= 2


def test_listings_fts_search_finds_seed_title(monkeypatch, tmp_path):
    client, _ = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/api/listings?q=گوشی")
    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] >= 1, (
        "seed data is expected to provide at least one 'گوشی' listing"
    )
    assert any("گوشی" in item["title"] for item in data["items"])


def test_listings_cursor_before_id_skips_newer_rows(monkeypatch, tmp_path):
    client, _ = setup_test_database(monkeypatch, tmp_path)
    first = client.get("/api/listings?limit=3").get_json()
    assert first["items"]
    pivot = first["items"][0]["id"]
    second = client.get(
        f"/api/listings?limit=50&before_id={pivot}"
    ).get_json()
    assert all(item["id"] < pivot for item in second["items"])


def test_featured_keyset_cursor_returns_every_result_once(monkeypatch, tmp_path):
    client, _ = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.executemany(
            "INSERT INTO listings"
            " (title, category, city, price, featured, description)"
            " VALUES (?, 'home', 'شهر صفحه‌بندی', 1000, ?, '')",
            [
                (f"کالای صفحه‌بندی {index}", 1 if index in (1, 4) else 0)
                for index in range(6)
            ],
        )
        connection.commit()

    collected = []
    cursor_id = None
    cursor_featured = None
    while True:
        query = "?city=شهر صفحه‌بندی&limit=2"
        if cursor_id is not None:
            query += f"&before_id={cursor_id}&before_featured={cursor_featured}"
        data = client.get("/api/listings" + query).get_json()
        collected.extend(item["id"] for item in data["items"])
        if not data["has_more"]:
            break
        cursor_id = data["next_before_id"]
        cursor_featured = data["next_before_featured"]
        assert cursor_id is not None
        assert cursor_featured in (0, 1)

    assert len(collected) == 6
    assert len(collected) == len(set(collected))

    with app_module.get_connection() as connection:
        expected = [
            row["id"]
            for row in connection.execute(
                "SELECT id FROM listings WHERE city=?"
                " ORDER BY featured DESC, id DESC",
                ("شهر صفحه‌بندی",),
            ).fetchall()
        ]
    assert collected == expected


def test_nearby_search_does_not_advertise_unpageable_results(monkeypatch, tmp_path):
    client, _ = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.execute(
            "INSERT INTO listings"
            " (title, category, city, price, latitude, longitude, availability_status)"
            " VALUES ('کالای نزدیک', 'home', 'تهران', 1000, 35.7, 51.4, 'in_stock')"
        )
        connection.commit()

    data = client.get(
        "/api/listings?lat=35.7&lon=51.4&radius_km=5&limit=1"
    ).get_json()
    assert data["nearby"] is True
    assert data["has_more"] is False
    assert data["next_before_id"] is None
    assert data["next_before_featured"] is None
    assert data["count"] == 1


def test_fts_table_is_populated_on_initialize(monkeypatch, tmp_path):
    setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        listing_count = connection.execute(
            "SELECT COUNT(*) FROM listings"
        ).fetchone()[0]

        # External-content FTS COUNT(*) mirrors content rows even if the index
        # is empty. Verify the inverted index via fts5vocab, and also run a
        # real Persian MATCH to confirm tokenization.
        connection.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS _test_fts_vocab"
            " USING fts5vocab(listings_fts, 'row')"
        )
        try:
            term_count = connection.execute(
                "SELECT COUNT(*) FROM _test_fts_vocab"
            ).fetchone()[0]
        finally:
            connection.execute("DROP TABLE IF EXISTS _test_fts_vocab")

        matched = connection.execute(
            "SELECT COUNT(*) FROM listings_fts WHERE listings_fts MATCH ?",
            ('"گوشی"',),
        ).fetchone()[0]

    assert listing_count > 0
    assert term_count > 0
    assert matched >= 1

def test_nearby_search_prioritizes_distance_over_featured_placement(monkeypatch, tmp_path):
    client, _ = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.executemany(
            "INSERT INTO listings"
            " (title, category, city, price, featured, latitude, longitude)"
            " VALUES (?, 'home', 'تهران', 1000, ?, ?, ?)",
            [
                ("ویژه اما دورتر", 1, 35.71, 51.4),
                ("نزدیک‌ترین کالا", 0, 35.7005, 51.4),
                ("کالای کمی دورتر", 0, 35.702, 51.4),
            ],
        )
        connection.commit()

    data = client.get(
        "/api/listings?lat=35.7&lon=51.4&radius_km=5&limit=1"
    ).get_json()

    assert data["nearby"] is True
    assert data["items"][0]["title"] == "نزدیک‌ترین کالا"
    assert data["items"][0]["distance_km"] < 0.1


def test_nearby_fts_search_filters_by_location_before_candidate_limit(
    monkeypatch, tmp_path
):
    client, _ = setup_test_database(monkeypatch, tmp_path)
    from kidareh.routes import listings as listings_routes

    monkeypatch.setattr(listings_routes, "FTS_SEARCH_WINDOW", 2)
    with app_module.get_connection() as connection:
        # These newer global matches are outside the requested radius. They
        # must not consume the small FTS candidate window ahead of the local
        # match inserted first.
        connection.executemany(
            "INSERT INTO listings"
            " (title, category, city, price, latitude, longitude)"
            " VALUES (?, 'home', ?, 1000, ?, ?)",
            [
                ("دریل صنعتی نزدیک", "تهران", 35.7005, 51.4),
                ("دریل صنعتی دور یک", "اصفهان", 36.5, 51.4),
                ("دریل صنعتی دور دو", "شیراز", 35.7, 52.5),
            ],
        )
        connection.commit()

    data = client.get(
        "/api/listings?q=دریل&lat=35.7&lon=51.4&radius_km=5&limit=10"
    ).get_json()

    assert data["nearby"] is True
    assert any(item["title"] == "دریل صنعتی نزدیک" for item in data["items"])
    assert all(item["distance_km"] <= 5 for item in data["items"])
