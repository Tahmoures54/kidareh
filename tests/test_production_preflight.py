from __future__ import annotations

import sqlite3

from scripts.check_production import preflight, resolve_paths, runtime_database_check


def test_liara_requires_persistent_disk_and_secure_secret(tmp_path):
    errors = preflight({"LIARA_APP_ID": "app-1", "SECRET_KEY": "short"})
    assert any("KIDAREH_DATA_DIR" in error for error in errors)
    assert any("SECRET_KEY" in error for error in errors)


def test_liara_paths_resolve_inside_persistent_data_dir(tmp_path):
    env = {
        "LIARA_APP_ID": "app-1",
        "KIDAREH_DATA_DIR": str(tmp_path / "data"),
        "SECRET_KEY": "x" * 48,
    }
    database, uploads, data_dir = resolve_paths(env)
    assert database == data_dir / "kidareh.sqlite3"
    assert uploads == data_dir / "uploads"
    assert preflight(env) == []


def test_liara_rejects_database_outside_persistent_disk(tmp_path):
    env = {
        "LIARA_APP_ID": "app-1",
        "KIDAREH_DATA_DIR": str(tmp_path / "data"),
        "DATABASE_PATH": str(tmp_path / "ephemeral.sqlite3"),
        "SECRET_KEY": "x" * 48,
    }
    assert any("DATABASE_PATH" in error for error in preflight(env))


def test_runtime_database_check_detects_missing_tables(tmp_path):
    path = tmp_path / "partial.sqlite3"
    connection = sqlite3.connect(path)
    connection.execute("CREATE TABLE users (id INTEGER PRIMARY KEY)")
    connection.commit()
    connection.close()
    errors = runtime_database_check(path)
    assert any("Required tables" in error for error in errors)


def test_runtime_database_check_accepts_required_schema(tmp_path):
    path = tmp_path / "ready.sqlite3"
    connection = sqlite3.connect(path)
    for table in ("users", "stores", "listings"):
        connection.execute(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY)")
    connection.execute("PRAGMA journal_mode=WAL")
    connection.commit()
    connection.close()
    assert runtime_database_check(path) == []


def test_env_production_requires_strong_secret(tmp_path):
    errors = preflight({"ENV": "production", "SECRET_KEY": "short"})
    assert any("SECRET_KEY" in error for error in errors)


def test_env_production_rejects_insecure_session_cookie(tmp_path):
    env = {"ENV": "production", "SECRET_KEY": "x" * 48, "SESSION_COOKIE_SECURE": "0"}
    errors = preflight(env)
    assert any("SESSION_COOKIE_SECURE" in error for error in errors)


def test_vercel_is_treated_as_production_for_preflight():
    env = {
        "VERCEL": "1",
        "FLASK_ENV": "development",
        "SECRET_KEY": "x" * 48,
        "SESSION_COOKIE_SECURE": "0",
    }
    errors = preflight(env)
    assert any("SESSION_COOKIE_SECURE" in error for error in errors)


def test_vercel_requires_a_strong_secret_even_with_development_flask_env():
    env = {
        "VERCEL": "1",
        "FLASK_ENV": "development",
        "SECRET_KEY": "short",
    }
    errors = preflight(env)
    assert any("SECRET_KEY" in error for error in errors)



def test_vercel_requires_durable_database_and_image_storage():
    env = {
        "VERCEL": "1",
        "SECRET_KEY": "x" * 48,
        "SESSION_COOKIE_SECURE": "1",
        "DATABASE_BACKEND": "sqlite",
    }
    errors = preflight(env)
    assert any("DATABASE_BACKEND=postgresql" in error for error in errors)
    assert any("DATABASE_URL" in error for error in errors)
    assert any("BLOB_READ_WRITE_TOKEN" in error for error in errors)


def test_vercel_accepts_explicit_postgresql_and_blob_configuration():
    env = {
        "VERCEL": "1",
        "SECRET_KEY": "x" * 48,
        "SESSION_COOKIE_SECURE": "1",
        "DATABASE_BACKEND": "postgresql",
        "DATABASE_URL": "postgresql+psycopg://user:password@db.example/kidareh",
        "BLOB_READ_WRITE_TOKEN": "test-token",
    }
    assert preflight(env) == []



def test_runtime_postgresql_check_verifies_connectivity_and_core_tables(monkeypatch):
    from types import SimpleNamespace
    import sqlalchemy
    import kidareh.infrastructure.database.session as database_session
    from scripts.check_production import runtime_postgresql_check

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
    monkeypatch.setattr(
        database_session, "create_database_engine",
        lambda *_args, **_kwargs: engine,
    )

    assert runtime_postgresql_check(
        "postgresql+psycopg://user:secret@db.example/kidareh"
    ) == []
    assert engine.disposed is True


def test_runtime_postgresql_check_reports_missing_core_tables(monkeypatch):
    from types import SimpleNamespace
    import sqlalchemy
    import kidareh.infrastructure.database.session as database_session
    from scripts.check_production import runtime_postgresql_check

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
    monkeypatch.setattr(
        database_session, "create_database_engine",
        lambda *_args, **_kwargs: Engine(),
    )

    errors = runtime_postgresql_check("postgresql+psycopg://user:secret@db.example/kidareh")
    assert len(errors) == 1
    assert "stores" in errors[0]
    assert "listings" in errors[0]


def test_runtime_postgresql_check_never_echoes_connection_credentials(monkeypatch):
    import kidareh.infrastructure.database.session as database_session
    from scripts.check_production import runtime_postgresql_check

    class Engine:
        def connect(self):
            raise RuntimeError("postgresql://user:very-secret@db.example/kidareh is unavailable")

        def dispose(self):
            return None

    monkeypatch.setattr(
        database_session, "create_database_engine",
        lambda *_args, **_kwargs: Engine(),
    )

    errors = runtime_postgresql_check(
        "postgresql://user:very-secret@db.example/kidareh"
    )
    assert errors
    assert "very-secret" not in errors[0]
    assert "db.example" not in errors[0]
