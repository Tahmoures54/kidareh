#!/usr/bin/env python3
"""Create and verify a consistent SQLite backup.

The backup uses SQLite's online backup API, which produces a transactionally
consistent copy even while the application is writing. Reading the source in
``mode=ro`` avoids taking any write lock and lets the source keep serving
requests for the entire duration of the backup.

Exit codes
----------
0   Backup created and passed ``PRAGMA integrity_check``.
1   Backup failed (I/O, integrity, permission, ...); no file is left behind.
2   Invalid arguments (missing source, destination equals source, ...).

Usage
-----
    python scripts/backup_sqlite.py
    python scripts/backup_sqlite.py --database /persistent/kidareh.sqlite3
    python scripts/backup_sqlite.py --output-dir /backups --retain-days 14
    python scripts/backup_sqlite.py --no-integrity-check   # 1M+ rows, off-hours only
"""
import argparse
import contextlib
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RETENTION_DAYS = 30


def _parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        default=os.environ.get("DATABASE_PATH", str(ROOT / "instance" / "kidareh.sqlite3")),
        help="Path to the live SQLite database (read-only).",
    )
    parser.add_argument(
        "--output-dir",
        default=str(ROOT / "backups"),
        help="Directory that receives the backup file.",
    )
    parser.add_argument(
        "--retain-days",
        type=int,
        default=DEFAULT_RETENTION_DAYS,
        help=f"Delete backups older than N days (default: {DEFAULT_RETENTION_DAYS}; 0 disables).",
    )
    parser.add_argument(
        "--no-integrity-check",
        action="store_true",
        help="Skip PRAGMA integrity_check (faster on million-row databases).",
    )
    return parser.parse_args(argv)


def _schema_version(database_path: Path) -> str:
    """Return the applied schema version, or ``"unknown"`` for an old database."""
    try:
        with contextlib.closing(
            sqlite3.connect(f"file:{database_path.as_posix()}?mode=ro", uri=True, timeout=30)
        ) as connection:
            row = connection.execute(
                "SELECT COALESCE(MAX(version), 0) FROM schema_migrations"
            ).fetchone()
            return str(row[0]) if row else "unknown"
    except sqlite3.Error:
        return "unknown"


def _prune_old_backups(output_dir: Path, retain_days: int) -> int:
    """Delete ``kidareh-*.sqlite3`` files older than ``retain_days``.

    Returns the number of files removed. A negative or zero ``retain_days``
    disables pruning entirely so an operator can keep backups indefinitely.
    """
    if retain_days <= 0:
        return 0
    cutoff = datetime.now(timezone.utc).timestamp() - retain_days * 86400
    removed = 0
    for candidate in output_dir.glob("kidareh-*.sqlite3"):
        try:
            if candidate.is_file() and candidate.stat().st_mtime < cutoff:
                candidate.unlink()
                removed += 1
        except OSError:
            # A single unreadable/deletable file must not abort the whole run.
            continue
    return removed


def main(argv=None) -> int:
    args = _parse_args(argv)
    source = Path(args.database).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()

    if not source.is_file():
        print(f"Database file not found: {source}", file=sys.stderr)
        return 2

    # Microseconds avoid overwriting a backup when two runs start in one second.
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    destination = output_dir / f"kidareh-{stamp}.sqlite3"
    if destination == source:
        print("Backup destination must differ from the live database.", file=sys.stderr)
        return 2

    schema_version = _schema_version(source)
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        # ``mode=ro`` opens the source without taking a write lock and lets the
        # backup API read WAL content consistently. ``contextlib.closing`` is
        # required: ``with sqlite3.connect(...)`` commits/rolls back but does
        # NOT close the connection, which on large files can keep the backup
        # descriptor open until the process exits.
        with contextlib.closing(
            sqlite3.connect(
                f"file:{source.as_posix()}?mode=ro", uri=True, timeout=30
            )
        ) as src, contextlib.closing(sqlite3.connect(destination, timeout=30)) as dst:
            src.backup(dst)
            if not args.no_integrity_check:
                integrity = dst.execute("PRAGMA integrity_check").fetchone()[0]
                if integrity != "ok":
                    raise sqlite3.DatabaseError(f"Integrity check failed: {integrity}")
        try:
            destination.chmod(0o600)
        except OSError:
            pass
    except (sqlite3.Error, OSError) as exc:
        destination.unlink(missing_ok=True)
        print(f"Backup failed: {exc}", file=sys.stderr)
        return 1

    size_bytes = destination.stat().st_size
    print(f"Backup verified: {destination}")
    print(f"Bytes: {size_bytes:,}")
    print(f"Schema version: {schema_version}")
    if args.no_integrity_check:
        print("Integrity check skipped (--no-integrity-check).")

    removed = _prune_old_backups(output_dir, args.retain_days)
    if removed:
        print(f"Pruned {removed} backup(s) older than {args.retain_days} day(s).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())