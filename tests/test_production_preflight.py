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
