"""Seller purchase journey: catalogue, order creation and gateway hand-off.

The monetization module carries the money path, so its ordering rules (who may
buy what, and when the gateway is contacted) are covered explicitly here.

Fixes applied compared to the earlier version:

* ``KIDAREH_SEED_DEMO_DATA="0"`` is truthy in Python (``bool("0") is True``),
  so an ``if os.environ.get(...)`` check in the app would have seeded demo
  data, shifting row ids and breaking the hardcoded ids. We now ``delenv`` the
  variable unambiguously.
* All env vars the app reads (``LIARA_APP_ID``, ``KAVENEGAR_API_KEY``,
  ``ADMIN_PHONE``, ``ZIBAL_MERCHANT``, ``ZIBAL_MERCHANT_ID``) are cleared
  before each test, so the package catalogue test is not affected by another
  test that set ``ZIBAL_MERCHANT``.
* The ``seller`` fixture set ``user_id=1`` in the session *before* inserting
  the user. It now inserts, captures ``lastrowid`` and only then primes the
  session.
* Ids in the fixture return value are real ``lastrowid`` values, not ``1``.
* Inserts are committed explicitly.
* ``phone_verified_at`` is an ISO datetime, not the literal ``"verified"``.
* The listing-tag test looks the listing up by id, not by ``items[0]``.
* The seller-without-store test no longer picks a magic id (``7``); it uses
  ``lastrowid``.
"""
import datetime as dt
import importlib

import pytest

from kidareh import create_app
from kidareh.core import get_connection, initialize_database


VERIFIED_AT = dt.datetime(2020, 1, 1, tzinfo=dt.timezone.utc).isoformat()
CSRF_TOKEN = "money-csrf"

_ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
    "KIDAREH_SEED_DEMO_DATA",
    "KAVENEGAR_API_KEY",
    "ADMIN_PHONE",
    "ZIBAL_MERCHANT",
    "ZIBAL_MERCHANT_ID",
    "SECRET_KEY",
)


def _patch_db_path(monkeypatch, db_path):
    """Patch ``DATABASE_PATH`` at every import site that may own it."""
    import main as app_module  # local import: not used by the app fixture
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


@pytest.fixture()
def app(tmp_path, monkeypatch):
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)

    db_path = tmp_path / "instance" / "monetization.sqlite3"
    _patch_db_path(monkeypatch, db_path)

    application = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "monetization-test-secret",
            "DATABASE_PATH": str(db_path),
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        }
    )
    with application.app_context():
        initialize_database()
    return application


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def seller(client):
    """A signed-in seller that owns a store with one listing."""
    with client.application.app_context():
        with get_connection() as db:
            user_id = db.execute(
                "INSERT INTO users (name, phone, password_hash, role, phone_verified_at)"
                " VALUES ('فروشنده', '09121112222', 'hash', 'seller', ?)",
                (VERIFIED_AT,),
            ).lastrowid
            store_id = db.execute(
                "INSERT INTO stores (owner_id, name, city) VALUES (?, 'ویترین', 'تهران')",
                (user_id,),
            ).lastrowid
            listing_id = db.execute(
                "INSERT INTO listings (title, category, city, price, owner_id, store_id)"
                " VALUES ('کالای فروشنده', 'home', 'تهران', 1000, ?, ?)",
                (user_id, store_id),
            ).lastrowid
            db.commit()

    with client.session_transaction() as session:
        session["csrf_token"] = CSRF_TOKEN
        session["user_id"] = user_id

    return {
        "user_id": user_id,
        "store_id": store_id,
        "listing_id": listing_id,
    }


def _order(client, **payload):
    return client.post(
        "/api/monetization/orders",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json=payload,
    )


# ---------------------------------------------------------------------------
# catalogue
# ---------------------------------------------------------------------------
def test_packages_endpoint_exposes_store_and_listing_catalogues(client):
    from kidareh.routes.monetization import PACKAGES, TAG_PACKAGES

    payload = client.get("/api/monetization/packages").get_json()

    assert payload["currency"] == "تومان"
    assert {item["id"] for item in payload["items"]} == {
        item["id"] for item in PACKAGES + TAG_PACKAGES
    }
    assert {item["id"] for item in payload["tag_items"]} == {
        item["id"] for item in TAG_PACKAGES
    }
    # No merchant configured in the test environment, so payment must be closed.
    assert payload["payment_enabled"] is False


# ---------------------------------------------------------------------------
# authentication and CSRF
# ---------------------------------------------------------------------------
def test_order_creation_requires_authentication(app):
    anonymous = app.test_client()
    response = anonymous.post(
        "/api/monetization/orders", json={"package_id": "blue_tick_30d"}
    )
    assert response.status_code == 401


def test_order_creation_requires_csrf(client, seller, monkeypatch):
    """A signed-in user with the wrong CSRF token must be rejected before
    the gateway is contacted."""
    import kidareh.routes.monetization as monetization

    monkeypatch.setenv("ZIBAL_MERCHANT", "test-merchant")
    calls = []
    monkeypatch.setattr(
        monetization,
        "zibal_request",
        lambda url, payload: calls.append((url, payload)) or {"result": 100, "trackId": "1"},
    )

    response = client.post(
        "/api/monetization/orders",
        headers={"X-CSRF-Token": "wrong-token"},
        json={"package_id": "blue_tick_30d"},
    )
    assert response.status_code in (400, 403)
    assert calls == [], "gateway was contacted despite CSRF failure"


# ---------------------------------------------------------------------------
# gateway availability and validation
# ---------------------------------------------------------------------------
def test_payment_is_unavailable_without_gateway_configuration(client, seller):
    response = _order(client, package_id="blue_tick_30d")

    assert response.status_code == 503
    assert response.get_json()["error"] == "payment_unavailable"


def test_unknown_package_is_rejected(client, seller):
    response = _order(client, package_id="package-that-does-not-exist")

    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_package"


def test_listing_tag_order_requires_an_owned_listing(client, seller, monkeypatch):
    import kidareh.routes.monetization as monetization

    monkeypatch.setenv("ZIBAL_MERCHANT", "test-merchant")
    monkeypatch.setattr(
        monetization,
        "zibal_request",
        lambda _url, _payload: {"result": 100, "trackId": "4242"},
    )

    missing = _order(client, package_id="listing_tag_sale")
    assert missing.status_code == 400
    assert missing.get_json()["error"] == "listing_required"

    foreign = _order(client, package_id="listing_tag_sale", listing_id=999)
    assert foreign.status_code == 403
    assert foreign.get_json()["error"] == "listing_forbidden"


# ---------------------------------------------------------------------------
# happy path
# ---------------------------------------------------------------------------
def test_successful_order_stores_track_id_and_returns_gateway_url(
    client, seller, monkeypatch
):
    import kidareh.routes.monetization as monetization

    monkeypatch.setenv("ZIBAL_MERCHANT", "test-merchant")
    monkeypatch.setattr(
        monetization,
        "zibal_request",
        lambda _url, _payload: {"result": 100, "trackId": "4242"},
    )

    response = _order(
        client, package_id="listing_tag_sale", listing_id=seller["listing_id"]
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["redirect_url"].endswith("/4242")

    order_id = payload["order_id"]
    with client.application.app_context():
        with get_connection() as db:
            order = db.execute(
                "SELECT * FROM monetization_orders WHERE id=?", (order_id,)
            ).fetchone()

    assert order["status"] == "pending"
    assert order["gateway_code"] == "4242"
    assert order["listing_id"] == seller["listing_id"]
    assert order["amount_toman"] == 19000


def test_failed_gateway_request_marks_the_order_failed(client, seller, monkeypatch):
    import kidareh.routes.monetization as monetization

    monkeypatch.setenv("ZIBAL_MERCHANT", "test-merchant")

    def refuse(_url, _payload):
        raise RuntimeError("gateway refused")

    monkeypatch.setattr(monetization, "zibal_request", refuse)

    response = _order(client, package_id="blue_tick_30d")
    assert response.status_code == 503
    body = response.get_json()
    assert body["error"] in (
        "gateway_error",
        "payment_failed",
        "gateway_unavailable",
    ), body

    with client.application.app_context():
        with get_connection() as db:
            failed = db.execute(
                "SELECT COUNT(*) FROM monetization_orders WHERE status='failed'"
            ).fetchone()[0]
    assert failed == 1


# ---------------------------------------------------------------------------
# listing tags
# ---------------------------------------------------------------------------
def test_my_listings_reports_the_active_tag(client, seller):
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    with client.application.app_context():
        with get_connection() as db:
            db.execute(
                "INSERT INTO listing_tags"
                " (listing_id, user_id, tag_type, starts_at, ends_at, status, order_id)"
                " VALUES (?, ?, 'listing_tag_sale', ?, ?, 'active', 1)",
                (
                    seller["listing_id"],
                    seller["user_id"],
                    now.isoformat(),
                    (now + timedelta(days=7)).isoformat(),
                ),
            )
            db.commit()

    payload = client.get("/api/my/listings").get_json()
    target = next(
        item for item in payload["items"] if item["id"] == seller["listing_id"]
    )
    assert target["active_tag"] == "listing_tag_sale"
    assert payload["tag_labels"]["listing_tag_sale"] == "حراج"


# ---------------------------------------------------------------------------
# store requirement
# ---------------------------------------------------------------------------
def test_seller_without_a_store_cannot_buy_a_store_package(client, monkeypatch):
    import kidareh.routes.monetization as monetization

    monkeypatch.setenv("ZIBAL_MERCHANT", "test-merchant")
    monkeypatch.setattr(
        monetization,
        "zibal_request",
        lambda _url, _payload: {"result": 100, "trackId": "1"},
    )

    with client.application.app_context():
        with get_connection() as db:
            user_id = db.execute(
                "INSERT INTO users (name, phone, password_hash, role, phone_verified_at)"
                " VALUES ('بدون ویترین', '09121119999', 'hash', 'seller', ?)",
                (VERIFIED_AT,),
            ).lastrowid
            db.commit()

    with client.session_transaction() as session:
        session["csrf_token"] = CSRF_TOKEN
        session["user_id"] = user_id

    response = _order(client, package_id="blue_tick_30d")

    assert response.status_code == 409
    assert response.get_json()["error"] == "store_required"