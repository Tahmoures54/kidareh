"""Regression tests for production security defaults on Vercel."""
from werkzeug.middleware.proxy_fix import ProxyFix

from kidareh import create_app


def test_vercel_runtime_enforces_production_security_even_with_development_flask_env(
    monkeypatch, tmp_path
):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("SESSION_COOKIE_SECURE", "false")
    monkeypatch.setenv("HSTS_ENABLED", "false")
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.delenv("LIARA_APP_ID", raising=False)
    monkeypatch.delenv("PROXY_FIX_HOPS", raising=False)

    app = create_app(
        {
            "SECRET_KEY": "test-vercel-production-secret-" + ("x" * 40),
            "DATABASE_PATH": str(tmp_path / "kidareh.sqlite3"),
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
            "TESTING": True,
        }
    )
    try:
        assert app.config["SESSION_COOKIE_SECURE"] is True
        assert app.config["SESSION_COOKIE_HTTPONLY"] is True
        assert app.config["HSTS_ENABLED"] is True
        assert app.config["PREFERRED_URL_SCHEME"] == "https"
        assert isinstance(app.wsgi_app, ProxyFix)
    finally:
        app.extensions["kidareh_db"].dispose()



def test_vercel_health_does_not_report_ephemeral_sqlite_as_healthy(
    monkeypatch, tmp_path
):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-blob-token")
    monkeypatch.delenv("LIARA_APP_ID", raising=False)
    monkeypatch.delenv("ENV", raising=False)

    app = create_app({
        "SECRET_KEY": "test-vercel-production-secret-" + ("x" * 40),
        "DATABASE_BACKEND": "sqlite",
        "DATABASE_PATH": str(tmp_path / "ephemeral.sqlite3"),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        "TESTING": True,
    })
    try:
        response = app.test_client().get("/api/health")
        assert response.status_code == 503
        payload = response.get_json()
        assert payload["ok"] is False
        assert payload["database"] == "ephemeral_backend"
        assert payload["uploads"] == "blob_configured"
    finally:
        app.extensions["kidareh_db"].dispose()
