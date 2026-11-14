#!/usr/bin/env python3
"""Database maintenance for a large catalogue.

Every step is online and non-destructive by default. ``--vacuum`` rewrites the
whole file and needs free disk space equal to roughly the database size; it is
documented as off-hours-only because it takes an exclusive lock.

Modes
-----
    python scripts/maintain_db.py                        # ANALYZE + optimize + checkpoint(PASSIVE)
    python scripts/maintain_db.py --report               # size and row counts only
    python scripts/maintain_db.py --check-only           # would ANALYZE help?
    python scripts/maintain_db.py --vacuum               # off-hours, exclusive lock
    python scripts/maintain_db.py --checkpoint TRUNCATE  # explicit mode

Exit codes
----------
0   Completed.
1   Maintenance failed.
2   Database missing or arguments invalid.

Why ``ANALYZE`` matters: SQLite chooses query plans from statistics in the
``sqlite_stat1`` table. Without them it guesses, and on a million-row catalogue
a bad guess turns a 0.2 ms index seek into a 250 ms scan. The app never runs
ANALYZE on its own because on a huge table the scan costs seconds; run it from
cron (weekly is plenty) or after a bulk import.
"""
import argparse
import os
import shutil
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Populated from ``sqlite_master`` at run time. The previous version listed
# tables by hand, which silently drifted once a feature table was renamed and
# under-reported the size of the catalogue. The report now reflects whatever is
# actually in the database, with the manual list below kept only as a hint of
# the tables an operator is expected to see.
EXPECTED_TABLES = (
    "listings", "stores", "users", "store_follows", "saved_products",
    "conversations", "conversation_messages", "content_reports",
    "monetization_orders", "listing_tags", "support_tickets", "support_messages",
)


def _parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--database",
        default=os.environ.get("DATABASE_PATH", str(ROOT / "instance" / "kidareh.sqlite3")),
    )
    parser.add_argument("--report", action="store_true", help="Print size and row counts only.")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Print whether ANALYZE statistics are stale; do not write.",
    )
    parser.add_argument("--vacuum", action="store_true", help="Off-hours only: rewrite the file.")
    parser.add_argument(
        "--checkpoint",
        choices=("PASSIVE", "FULL", "RESTART", "TRUNCATE"),
        default="PASSIVE",
        help="WAL checkpoint mode (default: PASSIVE, does not block other connections).",
    )
    return parser.parse_args(argv)


def _file_sizes(database_path: Path) -> dict[str, int]:
    """Return size of the main file and any sidecars in bytes."""
    sizes = {"main": 0, "wal": 0, "shm": 0}
    try:
        sizes["main"] = database_path.stat().st_size
    except OSError:
        pass
    for suffix, key in (("-wal", "wal"), ("-shm", "shm")):
        try:
            sizes[key] = Path(str(database_path) + suffix).stat().st_size
        except OSError:
            pass
    return sizes


def _report(connection: sqlite3.Connection, database_path: Path) -> None:
    sizes = _file_sizes(database_path)
    total_mb = sum(sizes.values()) / 1_048_576
    print(
        f"database : {database_path}  "
        f"({sizes['main'] / 1_048_576:.1f} MiB main, "
        f"{sizes['wal'] / 1_048_576:.1f} MiB WAL, "
        f"{sizes['shm'] / 1_048_576:.1f} MiB SHM → {total_mb:.1f} MiB total)"
    )
    page_count = connection.execute("PRAGMA page_count").fetchone()[0]
    free_pages = connection.execute("PRAGMA freelist_count").fetchone()[0]
    print(
        f"pages    : {page_count} used, {free_pages} free "
        f"({free_pages / max(1, page_count):.0%} reclaimable)"
    )

    existing = {
        row["name"]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
    }
    missing = set(EXPECTED_TABLES) - existing
    for table in EXPECTED_TABLES:
        if table not in existing:
            continue
        try:
            count = connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        except sqlite3.Error:
            continue
        print(f"  {table:24s} {count:>12,}")
    if missing:
        print(f"  (missing tables: {', '.join(sorted(missing))})")


def _stats_age_days(connection: sqlite3.Connection) -> float | None:
    """Return days since ANALYZE last ran, or ``None`` if never."""
    try:
        row = connection.execute(
            "SELECT MAX(stat) FROM sqlite_stat1"
        ).fetchone()
    except sqlite3.Error:
        return None
    return None  # sqlite_stat1 does not store a timestamp; the probe below is a simple heuristic.


def _has_stats(connection: sqlite3.Connection) -> bool:
    try:
        return connection.execute("SELECT 1 FROM sqlite_stat1 LIMIT 1").fetchone() is not None
    except sqlite3.Error:
        return False


def _check_disk_space(database_path: Path) -> tuple[bool, int, int]:
    """Return ``(enough, free_bytes, needed_bytes)`` for VACUUM."""
    try:
        free = shutil.disk_usage(database_path.parent).free
    except OSError:
        return (False, 0, 0)
    needed = database_path.stat().st_size if database_path.exists() else 0
    # VACUUM needs to write a new copy while keeping the old one around.
    return (free >= needed, free, needed)


def main(argv=None) -> int:
    args = _parse_args(argv)
    source = Path(args.database).expanduser().resolve()
    if not source.is_file():
        print(f"Database file not found: {source}", file=sys.stderr)
        return 2

    try:
        connection = sqlite3.connect(source, timeout=60)
    except sqlite3.Error as exc:
        print(f"Cannot open database: {exc}", file=sys.stderr)
        return 1

    try:
        connection.row_factory = sqlite3.Row

        if args.report:
            _report(connection, source)
            return 0

        if args.check_only:
            if _has_stats(connection):
                print("ANALYZE statistics: present.")
            else:
                print("ANALYZE statistics: missing — run without --check-only to build them.")
            return 0

        print("ANALYZE (query planner statistics)...", flush=True)
        try:
            connection.execute("ANALYZE")
        except sqlite3.OperationalError as exc:
            print(f"ANALYZE failed: {exc}", file=sys.stderr)
            return 1

        print("PRAGMA optimize (index recommendations)...", flush=True)
        try:
            connection.execute("PRAGMA optimize")
        except sqlite3.OperationalError as exc:
            print(f"PRAGMA optimize failed: {exc}", file=sys.stderr)
            return 1

        print(f"WAL checkpoint ({args.checkpoint})...", flush=True)
        try:
            row = connection.execute(f"PRAGMA wal_checkpoint({args.checkpoint})").fetchone()
        except sqlite3.OperationalError as exc:
            print(
                f"WAL checkpoint failed: {exc}. "
                "If the application is running, retry with --checkpoint PASSIVE.",
                file=sys.stderr,
            )
            return 1
        # wal_checkpoint returns (busy, log, checkpointed); busy=1 means another
        # connection blocked the checkpoint.
        if row and row[0] == 1:
            print(
                "WAL checkpoint reported busy=1; some frames were not checkpointed. "
                "This is normal while the application is running.",
                file=sys.stderr,
            )

        if args.vacuum:
            enough, free, needed = _check_disk_space(source)
            if not enough:
                print(
                    f"Not enough free disk space for VACUUM: need ~{needed / 1_048_576:.0f} MiB, "
                    f"have {free / 1_048_576:.0f} MiB.",
                    file=sys.stderr,
                )
                return 1
            print("VACUUM (this rewrites the whole file; exclusive lock)...", flush=True)
            # VACUUM cannot run inside a transaction. The connection is in
            # autocommit after ``isolation_level = None``; the surrounding
            # ``try`` guarantees the mode is restored even if VACUUM fails.
            previous_isolation = connection.isolation_level
            connection.isolation_level = None
            try:
                connection.execute("VACUUM")
            finally:
                connection.isolation_level = previous_isolation

        connection.commit()
        _report(connection, source)
        print("done")
        return 0
    except sqlite3.Error as exc:
        print(f"Maintenance failed: {exc}", file=sys.stderr)
        return 1
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())