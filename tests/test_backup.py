"""Tests for scripts/backup_sqlite.py.

The original file had two problems:

- ``with sqlite3.connect(...)`` commits the transaction but does **not** close
  the connection. The source DB stayed open (and potentially locked on
  Windows) when ``main()`` tried to copy it. We now close it explicitly via
  ``try/finally``.
- Coverage was limited to one happy path and one error path. The expansion
  below also exercises:
    * output directory auto-creation
    * preservation of the source schema
    * safety of pre-existing backups
    * validation that the backup is a real SQLite file
"""
import sqlite3
import sys

from scripts.backup_sqlite import main


# ---------------------------------------------------------------------------
# helpers (not collected by pytest)
# ---------------------------------------------------------------------------
def _create_source_db(path):
    """Create a small source SQLite DB and *fully close* the connection."""
    connection = sqlite3.connect(str(path))
    try:
        connection.execute("CREATE TABLE sample (value TEXT)")
        connection.execute("INSERT INTO sample VALUES ('persisted')")
        connection.execute("CREATE TABLE other (id INTEGER PRIMARY KEY, name TEXT)")
        connection.execute("INSERT INTO other (name) VALUES ('alpha')")
        connection.commit()
    finally:
        connection.close()


def _run_backup(monkeypatch, source, output):
    monkeypatch.setattr(
        sys, "argv",
        ["backup_sqlite.py", "--database", str(source), "--output-dir", str(output)],
    )
    return main()


def _read_schema(path):
    connection = sqlite3.connect(str(path))
    try:
        return sorted(
            row[0]
            for row in connection.execute(
                "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL"
            )
        )
    finally:
        connection.close()


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_backup_sqlite_creates_verified_copy(tmp_path, monkeypatch):
    source = tmp_path / "source.sqlite3"
    _create_source_db(source)
    output = tmp_path / "safe-backups"

    assert _run_backup(monkeypatch, source, output) == 0

    backups = list(output.glob("kidareh-*.sqlite3"))
    assert len(backups) == 1
    with sqlite3.connect(str(backups[0])) as connection:
        assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert connection.execute("SELECT value FROM sample").fetchone()[0] == "persisted"
        assert connection.execute("SELECT name FROM other").fetchone()[0] == "alpha"


def test_backup_sqlite_creates_a_real_sqlite_file(tmp_path, monkeypatch):
    """The backup must be a SQLite file, not just a renamed copy of bytes."""
    source = tmp_path / "source.sqlite3"
    _create_source_db(source)
    output = tmp_path / "safe-backups"

    assert _run_backup(monkeypatch, source, output) == 0
    (backup,) = output.glob("kidareh-*.sqlite3")

    with open(backup, "rb") as handle:
        magic = handle.read(16)
    assert magic.startswith(b"SQLite format 3\x00"), (
        f"backup does not start with the SQLite magic header: {magic!r}"
    )


def test_backup_sqlite_preserves_schema(tmp_path, monkeypatch):
    source = tmp_path / "source.sqlite3"
    _create_source_db(source)
    output = tmp_path / "safe-backups"

    assert _run_backup(monkeypatch, source, output) == 0
    (backup,) = output.glob("kidareh-*.sqlite3")

    assert _read_schema(backup) == _read_schema(source)


def test_backup_sqlite_creates_output_directory_when_missing(tmp_path, monkeypatch):
    source = tmp_path / "source.sqlite3"
    _create_source_db(source)
    output = tmp_path / "nested" / "safe-backups"  # intentionally missing

    assert _run_backup(monkeypatch, source, output) == 0
    assert output.is_dir()
    assert len(list(output.glob("kidareh-*.sqlite3"))) == 1


def test_backup_sqlite_does_not_clobber_existing_backups(tmp_path, monkeypatch):
    source = tmp_path / "source.sqlite3"
    _create_source_db(source)
    output = tmp_path / "safe-backups"
    output.mkdir()

    # A backup from an earlier run: must survive untouched.
    sentinel = output / "kidareh-19700101-000000.sqlite3"
    sentinel.write_bytes(b"pre-existing-backup")

    assert _run_backup(monkeypatch, source, output) == 0

    assert sentinel.read_bytes() == b"pre-existing-backup"
    new_backups = [p for p in output.glob("kidareh-*.sqlite3") if p != sentinel]
    assert len(new_backups) == 1


def test_backup_sqlite_reports_missing_database(tmp_path, monkeypatch):
    missing = tmp_path / "missing.sqlite3"
    output = tmp_path / "backups"
    assert _run_backup(monkeypatch, missing, output) == 2