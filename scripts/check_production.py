#!/usr/bin/env python3
"""Fail-fast deployment preflight for the PostgreSQL-only Kidareh runtime.

The check never prints connection credentials and never creates business rows.
"""
from __future__ import annotations

import argparse
import os
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
        bool(env.get("VERCEL")),
    ))


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

    backend = env.get("DATABASE_BACKEND", "postgresql").strip().lower()
    if backend != "postgresql":
        errors.append("Kidareh supports PostgreSQL only; SQLite is disabled.")
    if production and not env.get("DATABASE_URL", "").strip():
        errors.append("DATABASE_URL is required for PostgreSQL deployments.")

    if env.get("VERCEL") and not env.get("BLOB_READ_WRITE_TOKEN", "").strip():
        errors.append("Vercel production requires BLOB_READ_WRITE_TOKEN for persistent listing images.")

    if not env.get("VERCEL"):
        upload_dir = Path(env.get("UPLOAD_FOLDER", str(ROOT / "static" / "uploads"))).expanduser()
        try:
            _write_probe(upload_dir)
        except OSError as exc:
            errors.append(f"Upload directory is not writable ({upload_dir}): {exc}")

    if production and env.get("SESSION_COOKIE_SECURE", "1") != "1":
        errors.append("SESSION_COOKIE_SECURE must be 1 in production.")
    if env.get("SMS_ENABLED", "0") == "1" and not (env.get("KAVENEGAR_API_KEY") or env.get("SMS_API_KEY")):
        errors.append("SMS_ENABLED=1 requires KAVENEGAR_API_KEY or SMS_API_KEY.")
    if env.get("PAYMENT_ENABLED", "0") == "1" and not (
        env.get("ZIBAL_MERCHANT") or env.get("ZIBAL_MERCHANT_ID") or env.get("PAYMENT_MERCHANT_ID")
    ):
        errors.append("PAYMENT_ENABLED=1 requires a Zibal/payment merchant key.")
    return errors


def runtime_postgresql_check(database_url: str) -> list[str]:
    """Verify PostgreSQL connectivity and required core tables without exposing secrets."""
    if not database_url.strip():
        return ["DATABASE_URL is required for the PostgreSQL runtime check."]
    engine = None
    try:
        from sqlalchemy import inspect
        from kidareh.infrastructure.database.session import create_database_engine

        engine = create_database_engine(url=database_url)
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
            missing = REQUIRED_TABLES - set(inspect(connection).get_table_names())
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
    parser.add_argument("--runtime", action="store_true", help="also verify PostgreSQL connectivity and required tables")
    args = parser.parse_args(argv)
    env = dict(os.environ)
    errors = preflight(env)
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
    print("Upload storage: " + ("Vercel Blob configured" if env.get("VERCEL") else "writable"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
