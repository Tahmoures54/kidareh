#!/usr/bin/env python3
"""Validate a SQLite backup and safely restore it, preserving the current DB.

Safety guarantees
-----------------
* The backup is validated (``PRAGMA integrity_check``) *before* the live
  database is touched. A corrupt backup never reaches the live file.
* A safety copy of the current live database is taken before the atomic
  ``os.replace`` and is left on disk next to the target so the operator can
  roll back manually.
* All sidecar files (``-wal``, ``-shm``, ``-journal``) are removed only
  after the safety copy exists, so a partial restore is never worse than the
  original state.
* The restore itself is atomic: ``os.replace`` on the same filesystem.
* On Windows, ``os.replace`` refuses to overwrite a file that still has an
  open handle (``WinError 5``). We force CPython to run ``__del__`` on
  unreachable SQLite connections via ``gc.collect()`` and retry with
  exponential backoff, so a caller (or test helper) that left a connection
  open through ``with sqlite3.connect(...)`` — which commits but does *not*
  close — cannot turn a valid restore into a failure. The same retry also
  covers the brief transient locks that antivirus and indexer scanners put
  on freshly closed files on Windows.

The application must be stopped before running this. There is no way to
restore a live database safely while the app holds file locks and has
cached schema state.

Usage
-----
    python scripts/restore_sqlite.py --backup /backups/kidareh-20260101T...Z.sqlite3
    python scripts/restore_sqlite.py --backup ... --database /persistent/kidareh.sqlite3
    python scripts/restore_sqlite.py --backup ... --yes
"""
import argparse
import contextlib
import gc
import os
import sqlite3
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

# Sidecar files SQLite may leave next to the main database. ``-journal`` is
# used in rollback-journal mode (the default for older databases or after
# ``PRAGMA journal_mode=DELETE``); ``-wal``/``-shm`` are used in WAL mode.
SIDECAR_SUFFIXES = ("-wal", "-shm", "-journal")


def _parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backup", required=True, help="Backup file to restore from.")
    parser.add_argument(
        "--database",
        default=os.environ.get("DATABASE_PATH", "instance/kidareh.sqlite3"),
        help="Live SQLite database to replace.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirm overwriting an existing live database.",
    )
    return parser.parse_args(argv)


def is_valid_database(path: Path) -> bool:
    """Return False instead of crashing when the backup is missing or malformed."""
    try:
        with contextlib.closing(
            sqlite3.connect(
                f"file:{path.as_posix()}?mode=ro", uri=True, timeout=30
            )
        ) as connection:
            result = connection.execute("PRAGMA integrity_check").fetchone()
        return bool(result and result[0] == "ok")
    except (OSError, sqlite3.Error, ValueError):
        return False


def create_safety_backup(source_path: Path, safety_path: Path) -> None:
    """Take a transactionally consistent copy, including committed WAL content."""
    with contextlib.closing(sqlite3.connect(source_path, timeout=30)) as source:
        with contextlib.closing(sqlite3.connect(safety_path, timeout=30)) as destination:
            source.backup(destination)
            result = destination.execute("PRAGMA integrity_check").fetchone()
            if not result or result[0] != "ok":
                raise sqlite3.DatabaseError("Safety backup integrity check failed")


def _remove_sidecars(database_path: Path) -> None:
    """Delete leftover WAL/SHM/journal files next to ``database_path``.

    Called only after the safety copy has been created and only when the
    application is stopped, so the removed sidecars have no committed data
    that is not already in the main file.
    """
    for suffix in SIDECAR_SUFFIXES:
        sidecar = Path(str(database_path) + suffix)
        if sidecar.exists():
            with contextlib.suppress(OSError):
                sidecar.unlink()


def _atomic_replace(source: Path, destination: Path, retries: int = 8) -> None:
    """Replace ``destination`` with ``source``, retrying on Windows.

    Windows raises ``WinError 5`` (``PermissionError``) when the destination
    still has an open handle — for instance, when a caller left a SQLite
    connection open through ``with sqlite3.connect(...)``, which commits the
    transaction but does *not* close the connection.

    ``gc.collect()`` runs ``__del__`` on those unreachable connection
    objects, releasing their handles. The exponential backoff then lets
    antivirus and indexer scanners drop the transient locks they briefly
    place on freshly closed files.

    On POSIX, ``os.replace`` succeeds on the first attempt even with open
    handles (the inode stays valid for existing readers), so the retry loop
    is effectively a no-op there.
    """
    if retries < 1:
        retries = 1
    last_error: OSError | None = None
    for attempt in range(retries):
        try:
            os.replace(str(source), str(destination))
            return
        except PermissionError as exc:
            last_error = exc
            gc.collect()
            if attempt < retries - 1:
                time.sleep(0.05 * (2 ** attempt))
    assert last_error is not None
    raise last_error


def main(argv=None) -> int:
    args = _parse_args(argv)
    source = Path(args.backup).expanduser().resolve()
    target = Path(args.database).expanduser().resolve()

    if not source.is_file() or not is_valid_database(source):
        print("Backup missing or invalid.", file=sys.stderr)
        return 2
    if source == target:
        print("Backup and target must differ.", file=sys.stderr)
        return 2
    if target.exists() and not args.yes:
        print("Target exists; rerun with --yes after stopping the app.", file=sys.stderr)
        return 2

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        # Create the temporary file beside the target so ``os.replace`` stays
        # atomic (same filesystem). ``mkstemp`` creates the file with 0600,
        # which is what we want; SQLite reuses the path but the mode is kept.
        fd, temp_name = tempfile.mkstemp(
            prefix=target.name + ".restore-", suffix=".tmp", dir=target.parent
        )
        os.close(fd)
        temp = Path(temp_name)
        # mkstemp already created an empty file; remove it so SQLite can
        # initialize a fresh database at that path with its own header.
        temp.unlink()
    except OSError as exc:
        print(f"Could not prepare restore destination: {exc}", file=sys.stderr)
        return 1

    safety = None
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    try:
        # 1. Restore the backup into a temporary file and verify it.
        with contextlib.closing(sqlite3.connect(source, timeout=30)) as backup_db:
            with contextlib.closing(sqlite3.connect(temp, timeout=30)) as restored_db:
                backup_db.backup(restored_db)
                result = restored_db.execute("PRAGMA integrity_check").fetchone()
                if not result or result[0] != "ok":
                    raise sqlite3.DatabaseError("Restored database integrity check failed")

        # 2. Preserve the current live database before swapping anything.
        if target.exists():
            safety = target.with_name(target.name + ".pre-restore-" + stamp)
            create_safety_backup(target, safety)
            try:
                safety.chmod(0o600)
            except OSError:
                pass

        # 3. Now that the safety copy exists, remove stale sidecars. This is
        #    the only step that is not trivially reversible, so it comes last.
        _remove_sidecars(target)

        # 4. Release any orphaned SQLite handles before the atomic swap. A
        #    caller (or test helper) may have left a connection open via
        #    ``with sqlite3.connect(...) as db:``, which commits but does not
        #    close. On Windows, that leftover handle makes ``os.replace``
        #    fail with ``WinError 5``; ``gc.collect()`` forces ``__del__`` to
        #    run so the handle is released before we attempt the swap.
        gc.collect()

        # 5. Atomic swap with retries, so a brief antivirus/indexer lock on
        #    the freshly closed target does not turn a valid restore into a
        #    WinError 5 failure.
        _atomic_replace(temp, target)
        try:
            target.chmod(0o600)
        except OSError:
            pass
    except (OSError, sqlite3.Error) as exc:
        temp.unlink(missing_ok=True)
        for suffix in SIDECAR_SUFFIXES:
            Path(str(temp) + suffix).unlink(missing_ok=True)
        print(f"Restore failed: {exc}", file=sys.stderr)
        if safety:
            print(f"Previous database safety copy: {safety}", file=sys.stderr)
        return 1

    print(f"Restore verified: {target}")
    if safety:
        print(f"Previous database preserved: {safety}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())