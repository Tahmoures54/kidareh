"""Blueprint registration and factory smoke tests.

Issues addressed compared to the earlier version:

1. ``test_health_endpoint_is_available_through_factory`` did not override
   ``DATABASE_PATH`` or ``UPLOAD_FOLDER``. ``create_app`` fell back to the
   default path (``instance/kidareh.sqlite3``), so the test could silently
   read and write the real database on a developer machine, and the
   ``"database": "ok"`` / ``"uploads": "writable"`` assertions depended on
   whatever happened to be in the checkout.
2. Neither test cleared env vars that ``create_app`` looks at
   (``LIARA_APP_ID``, ``KIDAREH_SEED_DEMO_DATA``, ``KAVENEGAR_API_KEY``,
   ``ZIBAL_MERCHANT``, ``ZIBAL_MERCHANT_ID``, ``ADMIN_PHONE``). On a host
   where those are set (e.g. Liara CI), the tests would exercise production
   code paths instead of the test path.
3. The health-payload assertion used ``==`` on the full dict, which breaks
   whenever a new field is added. It is now field-by-field.
4. ``test_health_endpoint_reports_unwritable_uploads`` was skipped on Windows
   because chmod semantics differ. It is now also skipped when the tests run
   as root (Docker default), because root bypasses DAC permissions and
   ``chmod 0500`` cannot block writes.
5. ``_build_app`` now calls ``initialize_database()`` inside the app context
   so ``/api/health`` reports ``database: ok`` instead of
   ``schema_incomplete``. Without this call the health endpoint correctly
   returns 503 for a fresh DB, which previously made the assertion fail.
"""
import os
import sys

import pytest

from kidareh import create_app
from kidareh.core import initialize_database


ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
    "KIDAREH_SEED_DEMO_DATA",
    "KAVENEGAR_API_KEY",
    "ZIBAL_MERCHANT",
    "ZIBAL_MERCHANT_ID",
    "ADMIN_PHONE",
)


@pytest.fixture
def isolated_env(monkeypatch):
    """Ensure the factory does not pick up production env vars."""
    for name in ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


def _build_app(tmp_path, subdir="kidareh", **overrides):
    """Create an app backed by a throwaway DB and uploads dir under tmp_path.

    ``initialize_database()`` runs inside the app context so ``/api/health``
    reports ``database: ok``. A fresh DB would otherwise be reported as
    ``schema_incomplete`` (HTTP 503), which is exactly what the health
    regression test needs to protect against for *uninitialized* state — but
    for the happy-path test we need the schema to exist.
    """
    root = tmp_path / subdir
    root.mkdir(exist_ok=True)
    uploads = root / "uploads"
    uploads.mkdir(exist_ok=True)
    config = {
        "TESTING": True,
        "SECRET_KEY": "blueprint-test-key",
        "DATABASE_PATH": str(root / "kidareh.sqlite3"),
        "UPLOAD_FOLDER": str(uploads),
    }
    config.update(overrides)
    app = create_app(config)
    with app.app_context():
        initialize_database()
    return app


# ---------------------------------------------------------------------------
# blueprint registration
# ---------------------------------------------------------------------------
def test_domain_blueprints_are_registered_with_expected_routes(tmp_path, isolated_env):
    app = _build_app(tmp_path)

    assert {"pages", "auth", "stores", "listings", "system"} <= set(app.blueprints)

    rules = {rule.rule for rule in app.url_map.iter_rules()}
    assert "/" in rules
    assert "/api/auth/signup" in rules
    assert "/api/stores" in rules
    assert "/api/listings" in rules
    assert "/api/health" in rules


def test_blueprint_url_prefixes_are_correct(tmp_path, isolated_env):
    """Domain routes must live under their expected ``/api/...`` prefix."""
    app = _build_app(tmp_path)
    rules = {rule.rule for rule in app.url_map.iter_rules()}

    # stores blueprint
    assert any(r.startswith("/api/stores") for r in rules), rules
    # listings blueprint
    assert any(r.startswith("/api/listings") for r in rules), rules
    # auth blueprint
    assert any(r.startswith("/api/auth") for r in rules), rules


def test_blueprint_registration_does_not_accumulate_between_factory_calls(
    tmp_path, isolated_env
):
    """Building a second app must not double-register routes or raise."""
    first = _build_app(tmp_path, subdir="first")
    second = _build_app(tmp_path, subdir="second")

    first_rules = {rule.rule for rule in first.url_map.iter_rules()}
    second_rules = {rule.rule for rule in second.url_map.iter_rules()}
    assert first_rules == second_rules


# ---------------------------------------------------------------------------
# health endpoint
# ---------------------------------------------------------------------------
def test_health_endpoint_is_available_through_factory(tmp_path, isolated_env):
    app = _build_app(tmp_path)
    response = app.test_client().get("/api/health")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["service"] == "kidareh-pf"
    assert payload["database"] == "ok"
    assert payload["uploads"] == "writable"


@pytest.mark.skipif(
    sys.platform == "win32",
    reason="chmod semantics differ on Windows; os.access does not reflect ACLs",
)
@pytest.mark.skipif(
    hasattr(os, "geteuid") and os.geteuid() == 0,
    reason="root bypasses DAC permissions; chmod 0500 cannot block writes",
)
def test_health_endpoint_reports_unwritable_uploads(tmp_path, isolated_env):
    """Health check must not claim uploads are writable when they are not."""
    app = _build_app(tmp_path)
    broken = tmp_path / "broken-uploads"
    broken.mkdir()
    original_mode = broken.stat().st_mode
    broken.chmod(0o500)  # read+execute, no write
    try:
        response = app.test_client().get("/api/health")
        assert response.status_code == 200
        payload = response.get_json()
        assert payload["uploads"] != "writable", (
            "health check claimed uploads are writable when they are not"
        )
    finally:
        broken.chmod(original_mode)