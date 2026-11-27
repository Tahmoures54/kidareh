#!/usr/bin/env python3
"""Fail-fast deployment preflight for Kidareh.

Usage:
  python scripts/check_production.py             # environment and storage configuration
  python scripts/check_production.py --runtime   # also verify the configured database

This script never prints credentials and never creates or modifies business rows.
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_TABLES = {"users", "stores", "listings"}


def _is_production(env: dict[str, str]) -> bool:
    return any((
        env.get("FLASK_ENV", "").lower() == "production",
        env.get("ENV", "").lower() == "production",
        bool(env.get("LIARA_APP_ID")),
        # Vercel injects VERCEL=1 even when FLASK_ENV is left as "development".
        bool(env.get("VERCEL")),
    ))


def resolve_paths(env: dict[str, str]) -> tuple[Path, Path, Path | None]:
    data_dir = Path(env["KIDAREH_DATA_DIR"]).expanduser().resolve() if env.get("KIDAREH_DATA_DIR", "").strip() else None
    db_value = env.get("DATABASE_PATH", "").strip() or env.get("DB_PATH", "").strip()
    if db_value:
        database = Path(db_value).expanduser().resolve()
    elif data_dir:
        database = data_dir / "kidareh.sqlite3"
    else:
        database = ROOT / "instance" / "kidareh.sqlite3"
    upload_value = env.get("UPLOAD_FOLDER", "").strip()
    if upload_value:
        uploads = Path(upload_value).expanduser().resolve()
    elif data_dir:
        uploads = data_dir / "uploads"
    else:
        uploads = ROOT / "static" / "uploads"
    return database, uploads, data_dir


def _write_probe(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    fd, filename = tempfile.mkstemp(prefix=".kidareh-preflight-", dir=directory)
    os.close(fd)
    Path(filename).unlink()


def preflight(env: dict[str, str]) -> list[str]:
    errors: list[str] = []
    production = _is_production(env)
    secret = env.get("SECRET_KEY", "")
    if production and len(secret.encode("utf-8")) < 32:
        errors.append("SECRET_KEY must contain at least 32 random bytes in production.")

    database, uploads, data_dir = resolve_paths(env)
    backend = env.get("DATABASE_BACKEND", "postgresql").strip().lower()
    if backend != "postgresql":
        errors.append("Kidareh supports PostgreSQL only; SQLite is disabled.")
    if not env.get("DATABASE_URL", "").strip():
        errors.append("DATABASE_URL is required for PostgreSQL.")
    if env.get("VERCEL"):
        if backend != "postgresql":
            errors.append(
                "Vercel production must use DATABASE_BACKEND=postgresql; "
                "the deployment filesystem and /tmp SQLite database are ephemeral."
            )
        if not env.get("DATABASE_URL", "").strip():
            errors.append("Vercel production requires DATABASE_URL for persistent PostgreSQL storage.")
        if not env.get("BLOB_READ_WRITE_TOKEN", "").strip():
            errors.append("Vercel production requires BLOB_READ_WRITE_TOKEN for persistent listing images.")

    

    # Vercel's writable /tmp is temporary, not durable storage. Do not treat
    # a successful filesystem probe there as evidence of database or media
    # persistence; those services are validated through their configured URLs.
    if False:
        try:
            _write_probe(database.parent)
        except OSError as exc:
            errors.append(f"Database directory is not writable ({database.parent}): {exc}")
    if not env.get("VERCEL"):
        try:
            _write_probe(uploads)
        except OSError as exc:
            errors.append(f"Upload directory is not writable ({uploads}): {exc}")

    if production and env.get("SESSION_COOKIE_SECURE", "1") != "1":
        errors.append("SESSION_COOKIE_SECURE must be 1 in production.")
    if env.get("SMS_ENABLED", "0") == "1" and not (env.get("KAVENEGAR_API_KEY") or env.get("SMS_API_KEY")):
        errors.append("SMS_ENABLED=1 requires KAVENEGAR_API_KEY or SMS_API_KEY.")
    if env.get("PAYMENT_ENABLED", "0") == "1" and not (env.get("ZIBAL_MERCHANT") or env.get("ZIBAL_MERCHANT_ID") or env.get("PAYMENT_MERCHANT_ID")):
        errors.append("PAYMENT_ENABLED=1 requires a Zibal/payment merchant key.")
    return errors


def runtime_database_check(database: Path) -> list[str]:
    errors: list[str] = []
    if not database.is_file():
        return [f"SQLite database does not exist yet: {database}. Start the app once, then rerun --runtime."]
    try:
        connection = sqlite3.connect(f"file:{database.as_posix()}?mode=ro", uri=True, timeout=10)
        try:
            integrity = connection.execute("PRAGMA integrity_check").fetchone()
            if not integrity or integrity[0] != "ok":
                errors.append(f"SQLite integrity_check failed: {integrity!r}")
            tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            missing = REQUIRED_TABLES - tables
            if missing:
                errors.append("Required tables are missing: " + ", ".join(sorted(missing)))
            journal = connection.execute("PRAGMA journal_mode").fetchone()
            if journal and str(journal[0]).lower() != "wal":
                errors.append(f"SQLite journal_mode is {journal[0]!r}; expected WAL.")
        finally:
            connection.close()
    except sqlite3.Error as exc:
        errors.append(f"Cannot inspect SQLite database: {exc}")
    return errors


def runtime_postgresql_check(database_url: str) -> list[str]:
    """Verify PostgreSQL connectivity and the minimum application schema.

    Connection strings are never included in output because driver exceptions
    can contain credentials or host details.
    """
    if not database_url.strip():
        return ["DATABASE_URL is required for the PostgreSQL runtime check."]
    engine = None
    try:
        from sqlalchemy import inspect
        from kidareh.infrastructure.database.session import create_database_engine

        engine = create_database_engine(ROOT / "unused.sqlite3", url=database_url)
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
            tables = set(inspect(connection).get_table_names())
            missing = REQUIRED_TABLES - tables
            if missing:
                return ["PostgreSQL is reachable, but required tables are missing: " + ", ".join(sorted(missing))]
    except Exception as exc:
        return [f"PostgreSQL runtime check failed ({type(exc).__name__}); credentials and connection details were withheld."]
    finally:
        if engine is not None:
            engine.dispose()
    return []


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", action="store_true", help="also verify database connectivity and required tables")
    args = parser.parse_args(argv)
    env = dict(os.environ)
    errors = preflight(env)
    database, _uploads, _data_dir = resolve_paths(env)
    backend = env.get("DATABASE_BACKEND", "sqlite").strip().lower()
    if args.runtime:
        errors.extend(runtime_postgresql_check(env.get("DATABASE_URL", "")))
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Kidareh production preflight: OK")
    print("Database backend: PostgreSQL")
    if args.runtime:
        print("PostgreSQL connectivity and required tables: OK")
    if env.get("VERCEL"):
        print("Upload storage: Vercel Blob configured")
    else:
        print("Upload storage: writable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
