from __future__ import annotations

from scripts.check_production import preflight, runtime_postgresql_check


def test_production_requires_strong_secret_and_secure_cookie():
    errors = preflight({
        "ENV": "production",
        "SECRET_KEY": "short",
        "SESSION_COOKIE_SECURE": "0",
        "DATABASE_URL": "postgresql://user:pass@db.example/kidareh",
    })
    assert any("SECRET_KEY" in error for error in errors)
    assert any("SESSION_COOKIE_SECURE" in error for error in errors)


def test_runtime_rejects_sqlite_backend():
    errors = preflight({"DATABASE_BACKEND": "sqlite", "DATABASE_URL": "sqlite:///local.db"})
    assert any("PostgreSQL only" in error for error in errors)


def test_postgresql_url_is_required_for_production():
    errors = preflight({"ENV": "production", "SECRET_KEY": "x" * 48, "DATABASE_BACKEND": "postgresql"})
    assert any("DATABASE_URL" in error for error in errors)


def test_vercel_requires_blob_storage():
    errors = preflight({
        "VERCEL": "1",
        "SECRET_KEY": "x" * 48,
        "SESSION_COOKIE_SECURE": "1",
        "DATABASE_BACKEND": "postgresql",
        "DATABASE_URL": "postgresql+psycopg://user:password@db.example/kidareh",
    })
    assert any("BLOB_READ_WRITE_TOKEN" in error for error in errors)


def test_vercel_accepts_postgresql_and_blob_configuration():
    errors = preflight({
        "VERCEL": "1",
        "SECRET_KEY": "x" * 48,
        "SESSION_COOKIE_SECURE": "1",
        "DATABASE_BACKEND": "postgresql",
        "DATABASE_URL": "postgresql+psycopg://user:password@db.example/kidareh",
        "BLOB_READ_WRITE_TOKEN": "test-token",
    })
    assert errors == []


def test_runtime_postgresql_check_verifies_connectivity_and_core_tables(monkeypatch):
    from types import SimpleNamespace
    import sqlalchemy
    import kidareh.infrastructure.database.session as database_session

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def exec_driver_sql(self, statement):
            assert statement == "SELECT 1"

    class Engine:
        disposed = False

        def connect(self):
            return Connection()

        def dispose(self):
            self.disposed = True

    engine = Engine()
    monkeypatch.setattr(sqlalchemy, "inspect", lambda _connection: SimpleNamespace(
        get_table_names=lambda: {"users", "stores", "listings"}
    ))
    monkeypatch.setattr(database_session, "create_database_engine", lambda **_kwargs: engine)

    assert runtime_postgresql_check("postgresql+psycopg://user:secret@db.example/kidareh") == []
    assert engine.disposed is True


def test_runtime_postgresql_check_reports_missing_core_tables(monkeypatch):
    from types import SimpleNamespace
    import sqlalchemy
    import kidareh.infrastructure.database.session as database_session

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def exec_driver_sql(self, _statement):
            return None

    class Engine:
        def connect(self):
            return Connection()

        def dispose(self):
            return None

    monkeypatch.setattr(sqlalchemy, "inspect", lambda _connection: SimpleNamespace(
        get_table_names=lambda: {"users"}
    ))
    monkeypatch.setattr(database_session, "create_database_engine", lambda **_kwargs: Engine())

    errors = runtime_postgresql_check("postgresql+psycopg://user:secret@db.example/kidareh")
    assert len(errors) == 1
    assert "stores" in errors[0]
    assert "listings" in errors[0]


def test_runtime_postgresql_check_never_echoes_connection_credentials(monkeypatch):
    import kidareh.infrastructure.database.session as database_session

    class Engine:
        def connect(self):
            raise RuntimeError("postgresql://user:very-secret@db.example/kidareh is unavailable")

        def dispose(self):
            return None

    monkeypatch.setattr(database_session, "create_database_engine", lambda **_kwargs: Engine())

    errors = runtime_postgresql_check("postgresql://user:very-secret@db.example/kidareh")
    assert errors
    assert "very-secret" not in errors[0]
    assert "db.example" not in errors[0]
