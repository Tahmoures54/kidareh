"""Disposable PostgreSQL integration checks for the SQLAlchemy adapter.

These tests are enabled only in CI (or when KIDAREH_TEST_POSTGRES_URL is set).
They use temporary tables and never touch application or production schemas.
"""
import os

import pytest

from kidareh.infrastructure.database.legacy_adapter import SQLAlchemyConnectionAdapter
from kidareh.infrastructure.database.session import create_database_engine


@pytest.fixture
def postgres_adapter():
    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")
    engine = create_database_engine("unused.sqlite3", url=url)
    connection = engine.connect()
    try:
        yield SQLAlchemyConnectionAdapter(connection)
    finally:
        connection.close()
        engine.dispose()


def test_postgres_adapter_supports_qmark_binds_and_mapping_rows(postgres_adapter):
    postgres_adapter.execute(
        "CREATE TEMP TABLE adapter_smoke (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL)"
    )
    result = postgres_adapter.execute(
        "INSERT INTO adapter_smoke(label) VALUES (?) RETURNING id, label",
        ("کی‌داره",),
    )
    row = result.fetchone()
    assert row["id"] > 0
    assert row[1] == "کی‌داره"
    assert dict(row) == {"id": row["id"], "label": "کی‌داره"}
    postgres_adapter.commit()


def test_postgres_adapter_supports_executemany(postgres_adapter):
    postgres_adapter.execute(
        "CREATE TEMP TABLE adapter_batch (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL)"
    )
    result = postgres_adapter.executemany(
        "INSERT INTO adapter_batch(label) VALUES (?)",
        [("one",), ("two",), ("three",)],
    )
    assert result.rowcount == 3
    postgres_adapter.commit()
    rows = postgres_adapter.execute(
        "SELECT label FROM adapter_batch ORDER BY id"
    ).fetchall()
    assert [row["label"] for row in rows] == ["one", "two", "three"]


def test_initialized_sqlite_schema_can_be_rehearsed_on_postgres(tmp_path):
    """Create the current app schema in disposable PostgreSQL without data.

    This is a schema-conversion rehearsal only, not the production migration
    mechanism. It deliberately uses a fresh SQLite fixture as the schema
    source, then verifies SQLAlchemy can create all reflected domain tables on
    PostgreSQL.
    """
    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")

    from sqlalchemy import inspect
    from kidareh import create_app
    from kidareh.core import initialize_database
    from kidareh.infrastructure.database.base import Base
    from kidareh.infrastructure.database.session import get_database

    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "postgres-schema-rehearsal-only",
        "DATABASE_PATH": str(tmp_path / "schema-source.sqlite3"),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    with app.app_context():
        initialize_database()
        source_tables = set(Base.metadata.tables)
        assert {"users", "stores", "listings"}.issubset(source_tables)

        target_engine = create_database_engine("unused.sqlite3", url=url)
        try:
            Base.metadata.create_all(target_engine)
            target_tables = set(inspect(target_engine).get_table_names())
            assert source_tables.issubset(target_tables)

            # The PostgreSQL FTS path is a GIN expression index, maintained
            # automatically by PostgreSQL on insert/update/delete.
            from kidareh.core import _ensure_listings_fts
            from kidareh.infrastructure.database.legacy_adapter import SQLAlchemyConnectionAdapter

            with target_engine.connect() as raw_connection:
                adapter = SQLAlchemyConnectionAdapter(raw_connection)
                assert adapter.dialect_name == "postgresql"
                assert "listings" in adapter.table_names()
                assert {"title", "category", "city"}.issubset(adapter.column_names("listings"))
                _ensure_listings_fts(adapter)
                adapter.execute(
                    "INSERT INTO listings (title, category, city) VALUES (?, ?, ?)",
                    ("کالای نمونه برای جست‌وجو", "home", "تهران"),
                )
                matches = adapter.execute(
                    """SELECT id FROM listings
                       WHERE to_tsvector(
                           'simple',
                           coalesce(title, '') || ' ' ||
                           coalesce(description, '') || ' ' ||
                           coalesce(city, '')
                       ) @@ plainto_tsquery('simple', ?)""",
                    ("کالای نمونه",),
                ).fetchall()
                assert len(matches) == 1
        finally:
            target_engine.dispose()
            get_database().dispose()



def _reset_local_postgres_test_schema(url):
    """Reset only the explicitly named local CI database, never a remote DB."""
    from sqlalchemy.engine import make_url

    parsed = make_url(url)
    if parsed.host not in {"localhost", "127.0.0.1"} or parsed.database != "kidareh_test":
        raise RuntimeError(
            "Refusing destructive reset: PostgreSQL tests require localhost/kidareh_test."
        )
    engine = create_database_engine("unused.sqlite3", url=url)
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            connection.exec_driver_sql("CREATE SCHEMA public")
    finally:
        engine.dispose()


def test_alembic_can_connect_to_postgres_with_explicit_migration_url():
    """Verify Alembic honors the explicit PostgreSQL migration URL.

    The current baseline is intentionally empty: this checks connection and
    version-table handling only, not creation of the application's domain
    schema.
    """
    import subprocess
    import sys
    from pathlib import Path

    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")

    _reset_local_postgres_test_schema(url)
    root = Path(__file__).resolve().parents[1]
    environment = dict(os.environ)
    environment["MIGRATION_DATABASE_URL"] = url
    environment.pop("DATABASE_PATH", None)
    environment.pop("DB_PATH", None)
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        cwd=root,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )

    from sqlalchemy import inspect
    engine = create_database_engine("unused.sqlite3", url=url)
    try:
        inspector = inspect(engine)
        assert inspector.has_table("alembic_version")
        assert {"users", "stores", "listings", "otp_challenges", "otp_rate_limits", "rate_limits"}.issubset(
            set(inspector.get_table_names())
        )
        otp_columns = {
            column["name"]: str(column["type"]).upper()
            for column in inspector.get_columns("otp_rate_limits")
        }
        assert otp_columns["last_sent_at"] == "DOUBLE PRECISION"
        assert otp_columns["window_started_at"] == "DOUBLE PRECISION"
        rate_columns = {
            column["name"]: str(column["type"]).upper()
            for column in inspector.get_columns("rate_limits")
        }
        assert rate_columns["last_request_at"] == "DOUBLE PRECISION"
        assert rate_columns["window_started_at"] == "DOUBLE PRECISION"
    finally:
        engine.dispose()


def test_postgres_schema_lock_is_shared_across_connections(tmp_path):
    """A second connection cannot acquire the app's advisory lock while held."""
    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")

    from kidareh import create_app
    from kidareh.core import _schema_migration_lock
    from kidareh.core import get_connection

    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "postgres-lock-rehearsal-only",
        "DATABASE_PATH": str(tmp_path / "unused.sqlite3"),
        "DATABASE_URL": url,
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    lock_key = 0x4B494441524548
    with app.app_context():
        with _schema_migration_lock(tmp_path / "unused.sqlite3"):
            with get_connection() as second_connection:
                acquired = second_connection.execute(
                    "SELECT pg_try_advisory_xact_lock(?)", (lock_key,)
                ).fetchone()[0]
                assert acquired is False
        with get_connection() as connection:
            acquired = connection.execute(
                "SELECT pg_try_advisory_xact_lock(?)", (lock_key,)
            ).fetchone()[0]
            assert acquired is True
        app.extensions["kidareh_db"].dispose()


def test_postgres_rate_limit_is_atomic_across_connections(tmp_path):
    """Concurrent first-use requests must never exceed the shared budget."""
    import concurrent.futures

    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")

    from kidareh import create_app
    from kidareh.services import rate_limits

    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "postgres-rate-limit-rehearsal-only",
        "DATABASE_PATH": str(tmp_path / "unused.sqlite3"),
        "DATABASE_URL": url,
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    with app.app_context():
        rate_limits.ensure_tables()

    def attempt():
        with app.app_context():
            try:
                rate_limits.consume(
                    "postgres_concurrency_test",
                    "one-shared-identity",
                    limit=3,
                    window_seconds=3600,
                )
                return True
            except rate_limits.RateLimitExceeded:
                return False

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            outcomes = list(pool.map(lambda _: attempt(), range(12)))
        assert sum(outcomes) == 3
        assert sum(not outcome for outcome in outcomes) == 9
    finally:
        app.extensions["kidareh_db"].dispose()


def test_postgres_otp_rate_limit_serializes_concurrent_requests(tmp_path):
    """Concurrent OTP requests for one phone/IP cannot bypass the cooldown."""
    import concurrent.futures

    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")

    from kidareh import create_app
    from kidareh.routes.auth import _check_otp_rate_limit, ensure_tables

    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "postgres-otp-rehearsal-only",
        "DATABASE_PATH": str(tmp_path / "unused.sqlite3"),
        "DATABASE_BACKEND": "postgresql",
        "DATABASE_URL": url,
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    assert app.extensions["kidareh_db"].engine.dialect.name == "postgresql"
    with app.app_context():
        ensure_tables()

    def attempt():
        with app.test_request_context("/", environ_base={"REMOTE_ADDR": "192.0.2.10"}):
            return _check_otp_rate_limit("09123456789")[0]

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            outcomes = list(pool.map(lambda _: attempt(), range(10)))
        assert sum(outcomes) == 1
        assert sum(not outcome for outcome in outcomes) == 9
    finally:
        app.extensions["kidareh_db"].dispose()


def test_full_flask_app_boots_and_health_checks_on_postgres(tmp_path, monkeypatch):
    """Run the real PostgreSQL startup path, schema migration, and health route."""
    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")

    monkeypatch.setenv("DATABASE_BACKEND", "postgresql")
    monkeypatch.setenv("DATABASE_URL", url)

    from kidareh import create_app
    from kidareh.core import initialize_database
    from kidareh.infrastructure.database.session import get_database

    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "postgres-full-app-rehearsal-only",
        "DATABASE_BACKEND": "postgresql",
        "DATABASE_URL": url,
        "DATABASE_PATH": str(tmp_path / "unused.sqlite3"),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        "REDIS_URL": "",
        "TESTING_OTP_CODE": True,
    })
    with app.app_context():
        initialize_database()
        database = get_database()
        assert {"users", "stores", "listings", "otp_challenges", "rate_limits"}.issubset(
            database.models
        )

    with app.app_context():
        with get_database().engine.begin() as connection:
            inserted = connection.exec_driver_sql(
                """INSERT INTO listings (title, category, city, description)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                ("کالای آزمایشی PostgreSQL", "home", "تهران", "آزمون جست‌وجوی فارسی"),
            ).fetchone()
            listing_id = inserted[0]

    client = app.test_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["database"] == "ok"

    search_response = client.get("/api/listings?q=کالای آزمایشی")
    assert search_response.status_code == 200
    assert any(item["id"] == listing_id for item in search_response.get_json()["items"])

    # Exercise the actual multi-step SMS registration and persistent session
    # against PostgreSQL, with the external SMS provider safely stubbed.
    from kidareh.routes import auth as auth_routes
    import re

    monkeypatch.setattr(auth_routes, "send_otp", lambda phone, code: True)
    with client.session_transaction() as browser_session:
        browser_session["csrf_token"] = "postgres-integration-csrf"
    challenge = client.get("/api/auth/challenge").get_json()
    match = re.search(r"(\d+)\s*\+\s*(\d+)", challenge["question"])
    assert match is not None
    captcha_answer = str(int(match.group(1)) + int(match.group(2)))

    otp_response = client.post(
        "/api/auth/request-otp",
        json={
            "phone": "09120000000",
            "role": "seller",
            "terms_accepted": True,
            "captcha_answer": captcha_answer,
        },
        headers={"X-CSRF-Token": "postgres-integration-csrf"},
    )
    assert otp_response.status_code == 200
    otp_payload = otp_response.get_json()
    assert otp_payload["ok"] is True
    assert "test_code" in otp_payload

    verify_response = client.post(
        "/api/auth/verify-otp",
        json={"code": otp_payload["test_code"]},
        headers={"X-CSRF-Token": "postgres-integration-csrf"},
    )
    assert verify_response.status_code == 200
    assert verify_response.get_json()["existing_user"] is False

    profile_response = client.post(
        "/api/auth/complete-profile",
        json={"name": "فروشنده آزمایشی", "role": "seller"},
        headers={"X-CSRF-Token": "postgres-integration-csrf"},
    )
    assert profile_response.status_code == 200
    assert profile_response.get_json()["user"]["role"] == "seller"

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.get_json()["user"]["phone"] == "09120000000"
    assert me_response.get_json()["user"]["role"] == "seller"
    dashboard_response = client.get("/seller")
    assert dashboard_response.status_code == 200
    app.extensions["kidareh_db"].dispose()


def test_database_url_alone_does_not_switch_runtime_from_sqlite(tmp_path, monkeypatch):
    """A provisioned platform URL must not silently change the live backend."""
    from kidareh import create_app

    monkeypatch.delenv("DATABASE_BACKEND", raising=False)
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://not-used:never-connect@localhost/unused",
    )
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "database-backend-gate-test-only",
        "DATABASE_PATH": str(tmp_path / "default.sqlite3"),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    try:
        assert app.config["DATABASE_BACKEND"] == "sqlite"
        assert app.extensions["kidareh_db"].engine.dialect.name == "sqlite"
        assert app.config["DATABASE_URL"] == ""
    finally:
        app.extensions["kidareh_db"].dispose()


def test_postgresql_backend_requires_an_explicit_database_url(monkeypatch):
    import pytest
    from kidareh import create_app

    monkeypatch.setenv("DATABASE_BACKEND", "postgresql")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        create_app({"TESTING": True, "SECRET_KEY": "database-backend-gate-test-only"})



def test_postgres_adapter_translates_legacy_autoincrement_ddl(postgres_adapter):
    """Legacy feature schema helpers still emit SQLite identity syntax."""
    postgres_adapter.execute(
        "CREATE TEMP TABLE adapter_identity ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, sampled_at REAL NOT NULL)"
    )
    row = postgres_adapter.execute(
        "INSERT INTO adapter_identity(label, sampled_at) VALUES (?, ?) RETURNING id",
        ("identity-ok", 1795796000.123456),
    ).fetchone()
    assert row["id"] > 0
    postgres_adapter.commit()
    precision = postgres_adapter.execute(
        """SELECT data_type FROM information_schema.columns
           WHERE table_name = ? AND column_name = ?""",
        ("adapter_identity", "sampled_at"),
    ).fetchone()
    assert precision["data_type"] == "double precision"
