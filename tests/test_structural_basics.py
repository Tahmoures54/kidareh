"""Regression tests for application configuration and infrastructure endpoints.

Fixes applied compared to the earlier version:

* An autouse fixture clears every env var the factory reads, so host-exported
  ``LIARA_APP_ID`` / ``KAVENEGAR_API_KEY`` / ``ADMIN_PHONE`` / ``ZIBAL_*`` /
  ``SECRET_KEY`` / ``FLASK_ENV`` / ``ENV`` cannot flip the app into
  production mode inside non-production tests.
* ``KIDAREH_SEED_DEMO_DATA="0"`` is truthy in Python (``bool("0") is True``),
  so an ``if os.environ.get(...)`` check in the app would seed demo data.
  Tests now ``delenv`` the variable unambiguously.
* ``DATABASE_PATH`` is patched at every import site that may own it.
* ``make_app`` accepts a ``testing`` flag (default True) and creates the
  upload folder, so tests that assert on it are self-contained. Production
  tests use ``testing=False`` so ``TESTING=True`` cannot accidentally mask
  the production-mode cookie settings.
* ``test_upload_endpoint_rejects_unapproved_extension`` now writes a real
  ``payload.exe`` into the upload folder, so a 404 proves the extension was
  rejected rather than merely that the file was absent.
"""
import sqlite3
from pathlib import Path

import pytest

from kidareh import create_app


_ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
    "KIDAREH_SEED_DEMO_DATA",
    "KAVENEGAR_API_KEY",
    "KAVENEGAR_TEMPLATE",
    "KAVENEGAR_VERIFY_TEMPLATE",
    "ADMIN_PHONE",
    "ZIBAL_MERCHANT",
    "ZIBAL_MERCHANT_ID",
    "SECRET_KEY",
    "FLASK_ENV",
    "ENV",
)


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    """Isolate every test from host-exported configuration."""
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)
    yield


def _patch_db_path(monkeypatch, db_path):
    """Point every module that may own ``DATABASE_PATH`` at the test DB."""
    import importlib
    import main as app_module
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


def make_app(tmp_path: Path, *, testing: bool = True):
    database_path = tmp_path / "data" / "kidareh.sqlite3"
    upload_folder = tmp_path / "uploads"
    upload_folder.mkdir(parents=True, exist_ok=True)
    config = {
        "SECRET_KEY": "test-secret-key-that-is-not-used-in-production",
        "DATABASE_PATH": str(database_path),
        "UPLOAD_FOLDER": str(upload_folder),
    }
    if testing:
        config["TESTING"] = True
    app = create_app(config)
    return app, database_path, upload_folder


# ---------------------------------------------------------------------------
# health endpoint
# ---------------------------------------------------------------------------
def test_health_endpoint_checks_database_and_upload_storage(monkeypatch, tmp_path):
    from kidareh.core import initialize_database

    app, database_path, upload_folder = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)
    with app.app_context():
        initialize_database()

    response = app.test_client().get("/api/health")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["database"] == "ok"
    assert payload["uploads"] == "writable"
    assert database_path.exists()
    assert upload_folder.is_dir()


def test_health_endpoint_rejects_an_uninitialized_database(monkeypatch, tmp_path):
    app, database_path, _ = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)

    response = app.test_client().get("/api/health")

    assert response.status_code == 503
    payload = response.get_json()
    assert payload["ok"] is False
    assert payload["database"] == "schema_incomplete"


# ---------------------------------------------------------------------------
# API surface
# ---------------------------------------------------------------------------
def test_api_unknown_route_returns_json_not_html(monkeypatch, tmp_path):
    app, database_path, _ = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)

    response = app.test_client().get("/api/route-that-does-not-exist")

    assert response.status_code == 404
    assert response.is_json
    assert response.get_json()["error"] == "not_found"


def test_upload_endpoint_rejects_unapproved_extension(monkeypatch, tmp_path):
    app, database_path, upload_folder = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)

    # A real payload.exe in the upload folder: 404 must come from the
    # extension check, not from the file being absent.
    (upload_folder / "payload.exe").write_bytes(b"MZ not really an exe")

    response = app.test_client().get("/static/uploads/payload.exe")

    assert response.status_code == 404


def test_auth_mutation_requires_csrf_token(monkeypatch, tmp_path):
    app, database_path, _ = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)
    client = app.test_client()

    response = client.post(
        "/api/auth/request-otp",
        json={
            "phone": "09123456789",
            "registering": True,
            "role": "buyer",
            "captcha_answer": "1",
            "terms_accepted": True,
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "csrf_failed"


# ---------------------------------------------------------------------------
# production configuration
# ---------------------------------------------------------------------------
def test_production_rejects_default_secret_key(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "production")
    # _clean_env already removed SECRET_KEY, LIARA_APP_ID, ENV.

    with pytest.raises(RuntimeError, match="SECRET_KEY must be set"):
        create_app()


def test_production_enables_secure_session_cookie(monkeypatch, tmp_path):
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "production-test-secret-key")

    # Use testing=False: TESTING=True would mask the production cookie
    # detection if the factory chooses between "test" and "production" modes
    # based on that flag.
    app, _, _ = make_app(tmp_path, testing=False)

    assert app.config["SESSION_COOKIE_SECURE"] is True


# ---------------------------------------------------------------------------
# database initialization and migrations
# ---------------------------------------------------------------------------
def test_database_initialization_is_repeatable_and_uses_app_config(monkeypatch, tmp_path):
    from kidareh.core import get_connection, initialize_database

    app, database_path, _ = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)

    with app.app_context():
        initialize_database()
        initialize_database()
        with get_connection() as connection:
            tables = {
                row["name"]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            assert {
                "users",
                "stores",
                "listings",
                "saved_products",
                "conversations",
                "conversation_messages",
                "support_tickets",
                "support_messages",
                "monetization_orders",
                "store_promotions",
                "listing_tags",
            } <= tables
            assert connection.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
            assert connection.execute(
                "SELECT MAX(version) FROM schema_migrations"
            ).fetchone()[0] == 1

    assert database_path.exists()


def test_database_migration_is_recorded_only_after_success(monkeypatch, tmp_path):
    from kidareh import core

    app, database_path, _ = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)

    def fail_migration():
        raise RuntimeError("simulated schema migration failure")

    monkeypatch.setattr(core, "_initialize_schema_v1", fail_migration)
    monkeypatch.setattr(core, "SCHEMA_MIGRATIONS", ((1, fail_migration),))

    with app.app_context():
        with pytest.raises(RuntimeError, match="simulated schema migration failure"):
            core.initialize_database()
        with core.get_connection() as connection:
            assert connection.execute(
                "SELECT COUNT(*) FROM schema_migrations"
            ).fetchone()[0] == 0

    assert database_path.exists()


def test_database_migration_does_not_repeat_after_success(monkeypatch, tmp_path):
    from kidareh import core

    app, database_path, _ = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)

    with app.app_context():
        core.initialize_database()

        def unexpected_rerun():
            pytest.fail("completed schema migration was executed again")

        monkeypatch.setattr(core, "_initialize_schema_v1", unexpected_rerun)
        monkeypatch.setattr(core, "SCHEMA_MIGRATIONS", ((1, unexpected_rerun),))
        core.initialize_database()


def test_database_rejects_schema_version_newer_than_supported(monkeypatch, tmp_path):
    from kidareh.core import initialize_database

    app, database_path, _ = make_app(tmp_path)
    _patch_db_path(monkeypatch, database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "CREATE TABLE schema_migrations ("
            "version INTEGER PRIMARY KEY, "
            "applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
        )
        connection.execute(
            "INSERT INTO schema_migrations (version) VALUES (999)"
        )
        connection.commit()

    with app.app_context():
        with pytest.raises(RuntimeError, match="newer than this application supports"):
            initialize_database()

    with sqlite3.connect(database_path) as connection:
        assert connection.execute(
            "SELECT version FROM schema_migrations"
        ).fetchone()[0] == 999