"""Release smoke tests for the marketplace's public entry points and media storage.

Fixes applied compared to the earlier version:

* ``app.config["TESTING_OTP_CODE"] = True`` used direct assignment and leaked
  across tests; replaced with ``monkeypatch.setitem``.
* Env vars (``LIARA_APP_ID``, ``KIDAREH_SEED_DEMO_DATA``, ``KAVENEGAR_API_KEY``,
  ``ADMIN_PHONE``, ``ZIBAL_MERCHANT*``, ``SECRET_KEY``) are now cleared per
  test, so a CI host that exports them cannot flip the factory into
  production mode.
* ``DATABASE_PATH`` is patched at every import site that may own it.
* ``test_seller_and_paid_features_require_authentication`` sent ``GET`` to
  routes that are ``POST``-only; routing returned 405 before the auth check.
  Those calls are now ``POST``.
* The SW smoke test pinned ``CACHE_VERSION = "v6"``; it now checks the
  variable is set and that the shell/offline/private assets are still
  referenced, without breaking on every cache bump.
* ``test_uploaded_image_route_rejects_non_image_extensions`` only 404'd
  because no file existed. A real ``.txt`` file is written and the route must
  refuse to serve it.
* ``test_home_and_inner_pages_use_shared_navigation_and_install_script`` had a
  dead ``else`` branch (the condition was always true). It now splits the
  shell pages from the auth login page explicitly.
* ``test_profile_update_changes_name_for_authenticated_user`` used an ugly
  ``__import__("kidareh.core", fromlist=[...])`` call; it is a normal import now.
* Session CSRF is seeded consistently via ``_prime_session``, and every
  insert commits explicitly.
"""
import importlib
import json
import re
from pathlib import Path

import pytest

from kidareh import create_app
from kidareh.core import get_connection, initialize_database


_ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
    "VERCEL",
    "KIDAREH_SEED_DEMO_DATA",
    "KAVENEGAR_API_KEY",
    "ADMIN_PHONE",
    "ZIBAL_MERCHANT",
    "ZIBAL_MERCHANT_ID",
    "SECRET_KEY",
)

CSRF = "test-csrf"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _patch_db_path(monkeypatch, db_path):
    import main as app_module
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

    database_path = tmp_path / "instance" / "test.sqlite3"
    upload_folder = tmp_path / "persistent-uploads"
    _patch_db_path(monkeypatch, database_path)

    application = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-secret",
        "DATABASE_PATH": str(database_path),
        "UPLOAD_FOLDER": str(upload_folder),
    })
    with application.app_context():
        initialize_database()
    yield application


@pytest.fixture()
def client(app):
    return app.test_client()


def _prime_session(client, **extra):
    with client.session_transaction() as session:
        session["csrf_token"] = CSRF
        session.update(extra)
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF


def _insert_user(app, name="کاربر آزمایشی", phone="09120000004", role="buyer"):
    with app.app_context():
        with get_connection() as connection:
            user_id = connection.execute(
                "INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, ?)",
                (name, phone, "test-hash", role),
            ).lastrowid
            connection.commit()
    return user_id


# ---------------------------------------------------------------------------
# core pages and health
# ---------------------------------------------------------------------------
def test_core_pages_render(client):
    for path in ("/", "/login", "/register", "/stores"):
        response = client.get(path)
        assert response.status_code == 200, path

    seller_response = client.get("/seller")
    assert seller_response.status_code == 302
    assert "/register" in seller_response.headers["Location"]


def test_health_reports_database_and_upload_readiness(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["database"] == "ok"
    assert payload["uploads"] == "writable"


# ---------------------------------------------------------------------------
# media / uploads
# ---------------------------------------------------------------------------
def test_uploaded_image_route_serves_configured_upload_folder(app, client):
    upload_folder = Path(app.config["UPLOAD_FOLDER"])
    upload_folder.mkdir(parents=True, exist_ok=True)
    image_bytes = b"\x89PNG\r\n\x1a\nsmoke-test"
    (upload_folder / "smoke-test.png").write_bytes(image_bytes)

    response = client.get("/static/uploads/smoke-test.png")
    assert response.status_code == 200
    assert response.data == image_bytes


def test_uploaded_image_route_rejects_non_image_extensions(app, client):
    """A real .txt file in the upload folder must not be served.

    The original version of this test passed even when the route served any
    extension, because the file it referenced simply did not exist. We now
    write an actual .txt and require the route to refuse it.
    """
    upload_folder = Path(app.config["UPLOAD_FOLDER"])
    upload_folder.mkdir(parents=True, exist_ok=True)
    (upload_folder / "not-an-image.txt").write_bytes(b"plain text")

    response = client.get("/static/uploads/not-an-image.txt")
    assert response.status_code in (403, 404), (
        "the upload route served a non-image file"
    )


# ---------------------------------------------------------------------------
# authentication gates
# ---------------------------------------------------------------------------
def test_seller_and_paid_features_require_authentication(client):
    # These routes are POST-only; use POST so routing does not short-circuit
    # with a 405 before the auth check.
    assert client.get("/api/my/store").status_code == 401
    assert client.post("/api/monetization/orders", json={}).status_code == 401
    assert client.post("/api/support/tickets", json={}).status_code == 401


def test_listing_creation_requires_authentication(client):
    response = client.post("/api/listings", json={
        "title": "آگهی آزمایشی",
        "category": "home",
        "city": "تهران",
        "price": 0,
    })
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# PWA
# ---------------------------------------------------------------------------
def test_pwa_manifest_is_valid_and_installable(client):
    response = client.get("/static/manifest.webmanifest")
    assert response.status_code == 200
    manifest = json.loads(response.get_data(as_text=True))
    assert manifest["display"] == "standalone"
    assert manifest["start_url"] == "/?utm_source=pwa"
    assert manifest["scope"] == "/"
    assert manifest["icons"]


def test_pwa_shell_assets_and_offline_fallback_are_available(client):
    for path in ("/static/js/pwa.js", "/static/sw.js", "/static/offline.html"):
        response = client.get(path)
        assert response.status_code == 200, path

    worker = client.get("/static/sw.js").get_data(as_text=True)
    # Version-agnostic checks: the version string is bumped on each release.
    assert 'CACHE_VERSION = "' in worker
    assert "kidareh-shell-" in worker
    assert "/static/offline.html" in worker
    assert "PRIVATE_PATH" in worker


def test_service_worker_is_available_at_root_scope(client):
    response = client.get("/sw.js")
    assert response.status_code == 200
    assert response.headers.get("Service-Worker-Allowed") == "/"
    assert "kidareh-shell-" in response.get_data(as_text=True)


# ---------------------------------------------------------------------------
# navigation
# ---------------------------------------------------------------------------
def test_home_and_inner_pages_use_shared_navigation_and_install_script(client):
    for path in ("/", "/stores", "/login"):
        response = client.get(path)
        assert response.status_code == 200, path
        html = response.get_data(as_text=True)
        assert 'class="mobile-bottom-nav' in html, path
        assert 'static/js/pwa.js' in html, path

    # The site header and install button are only on the shell pages, not on
    # the dedicated auth login page.
    for path in ("/", "/stores"):
        html = client.get(path).get_data(as_text=True)
        assert 'class="site-header"' in html, path
        assert 'id="installAppButton"' in html, path


# ---------------------------------------------------------------------------
# profile
# ---------------------------------------------------------------------------
def test_profile_page_requires_account_and_has_editable_controls(client, app):
    guest_response = client.get("/account")
    assert guest_response.status_code == 302
    assert "/register" in guest_response.headers["Location"]

    user_id = _insert_user(app, name="کاربر آزمایشی", phone="09120000004", role="buyer")
    _prime_session(client, user_id=user_id)

    response = client.get("/account")
    assert response.status_code == 200
    assert b"profileEditForm" in response.data
    assert b"profileName" in response.data
    assert b"messages" in response.data


def test_profile_update_requires_authentication(client):
    response = client.post("/api/auth/profile", json={"name": "New Name"})
    assert response.status_code == 401


def test_profile_update_changes_name_for_authenticated_user(client, app):
    user_id = _insert_user(app, name="Original Name", phone="09123456789", role="buyer")
    _prime_session(client, user_id=user_id)

    response = client.post(
        "/api/auth/profile",
        json={"name": "Updated Name"},
        headers={"X-CSRF-Token": CSRF},
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["user"]["name"] == "Updated Name"


# ---------------------------------------------------------------------------
# signup flow
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(("role", "expected_name"), [
    ("seller", "فروشنده تازه"),
    ("buyer", "خریدار تازه"),
])
def test_new_signup_collects_profile_before_creating_account(
    app, client, monkeypatch, role, expected_name
):
    import kidareh.routes.auth as auth_routes

    monkeypatch.setattr(auth_routes, "_send_kavenegar_otp", lambda phone, code: True)
    monkeypatch.setitem(app.config, "TESTING_OTP_CODE", True)

    _prime_session(client)

    challenge = client.get("/api/auth/challenge").get_json()["question"]
    numbers = re.search(r"(\d+)\s*\+\s*(\d+)", challenge)
    assert numbers
    answer = str(int(numbers.group(1)) + int(numbers.group(2)))

    requested = client.post(
        "/api/auth/request-otp",
        json={
            "phone": "09123456789",
            "captcha_answer": answer,
            "terms_accepted": True,
            "registering": True,
            "role": role,
        },
        headers={"X-CSRF-Token": CSRF},
    )
    assert requested.status_code == 200
    code = requested.get_json()["test_code"]

    verified = client.post(
        "/api/auth/verify-otp",
        json={"code": code},
        headers={"X-CSRF-Token": CSRF},
    )
    assert verified.status_code == 200
    payload = verified.get_json()
    # An unknown phone is never auto-registered: the shopper must still finish
    # the profile step, otherwise their own name and store details are lost.
    assert payload["existing_user"] is False
    assert payload["phone"] == "09123456789"
    assert "user" not in payload

    with client.session_transaction() as session:
        assert "user_id" not in session
        assert session["verified_phone"] == "09123456789"

    profile = {"name": expected_name, "role": role}
    if role == "seller":
        profile.update({
            "store_name": "ویترین تازه",
            "store_category": "لوازم خانه",
            "store_city": "تهران",
            "store_address": "تهران، خیابان نمونه",
            "store_hours": "۹ تا ۱۸",
            "in_person": True,
        })
    else:
        profile["city"] = "تهران"

    created = client.post(
        "/api/auth/complete-profile",
        json=profile,
        headers={"X-CSRF-Token": CSRF},
    )
    assert created.status_code == 200, created.get_json()
    created_payload = created.get_json()
    assert created_payload["user"]["name"] == expected_name
    assert created_payload["user"]["role"] == role

    with client.session_transaction() as session:
        assert session["user_id"] == created_payload["user"]["id"]

    with app.app_context():
        with get_connection() as connection:
            store_row = connection.execute(
                "SELECT 1 FROM stores WHERE owner_id = ?",
                (created_payload["user"]["id"],),
            ).fetchone()

    if role == "seller":
        assert client.get("/seller").status_code == 200
        assert created_payload["store"]["name"] == "ویترین تازه"
        assert store_row is not None
    else:
        assert store_row is None