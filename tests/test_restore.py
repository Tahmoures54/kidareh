"""Tests for scripts/restore_sqlite.py.

Fixes applied compared to the earlier version:

* ``with sqlite3.connect(...)`` commits but does **not** close the connection.
  File descriptors and locks persisted, which caused the ``main()`` call to
  fail on Windows with "database is locked". Helpers now close explicitly.
* ``test_restore_rejects_corrupt_backup...`` relied on a plain-text payload
  (``b"this is not a SQLite database"``) that SQLite rejects on the header.
  A more realistic corruption is a *valid* SQLite header followed by garbage;
  ``test_restore_rejects_truncated_sqlite_backup`` now covers that.
* No test covered the case where ``--backup`` and ``--database`` point to the
  same file. That must be refused, otherwise the safety copy would be the
  file itself and the restore would silently overwrite the only copy.
* ``test_restore_preserves_previous_database`` tested both the refuse path and
  the happy path; it is split so a single failure pinpoints a single
  behaviour.
"""
import sqlite3
import sys

import pytest

from scripts.restore_sqlite import main


# ---------------------------------------------------------------------------
# helpers (not collected by pytest)
# ---------------------------------------------------------------------------
def _write_sample_database(path, value):
    """Create a small SQLite DB and *close* the connection."""
    connection = sqlite3.connect(str(path))
    try:
        connection.execute("CREATE TABLE sample(value TEXT)")
        connection.execute("INSERT INTO sample VALUES(?)", (value,))
        connection.commit()
    finally:
        connection.close()


def _read_sample_database(path):
    """Read the ``sample`` row from a SQLite DB and *close* the connection."""
    connection = sqlite3.connect(str(path))
    try:
        return connection.execute("SELECT value FROM sample").fetchone()[0]
    finally:
        connection.close()


def _run(monkeypatch, *args):
    monkeypatch.setattr(sys, "argv", ["restore_sqlite.py", *args])
    return main()


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_restore_refuses_without_confirmation(tmp_path, monkeypatch):
    """Without ``--yes`` the script must refuse and leave the DB untouched."""
    source, target = tmp_path / "backup.sqlite3", tmp_path / "live.sqlite3"
    _write_sample_database(source, "new")
    _write_sample_database(target, "old")

    assert _run(monkeypatch, "--backup", str(source), "--database", str(target)) == 2

    assert _read_sample_database(target) == "old"
    assert not list(tmp_path.glob("live.sqlite3.pre-restore-*"))


def test_restore_replaces_database_and_creates_safety_copy(tmp_path, monkeypatch):
    source, target = tmp_path / "backup.sqlite3", tmp_path / "live.sqlite3"
    _write_sample_database(source, "new")
    _write_sample_database(target, "old")

    assert (
        _run(
            monkeypatch,
            "--backup", str(source),
            "--database", str(target),
            "--yes",
        )
        == 0
    )

    assert _read_sample_database(target) == "new"

    safety_copies = list(tmp_path.glob("live.sqlite3.pre-restore-*"))
    assert len(safety_copies) == 1, safety_copies
    assert _read_sample_database(safety_copies[0]) == "old"


def test_restore_rejects_non_sqlite_backup_without_touching_live_database(
    tmp_path, monkeypatch
):
    source, target = tmp_path / "corrupt.sqlite3", tmp_path / "live.sqlite3"
    source.write_bytes(b"this is not a SQLite database")
    _write_sample_database(target, "keep-me")

    assert (
        _run(
            monkeypatch,
            "--backup", str(source),
            "--database", str(target),
            "--yes",
        )
        == 2
    )

    assert _read_sample_database(target) == "keep-me"
    assert not list(tmp_path.glob("live.sqlite3.pre-restore-*"))


def test_restore_rejects_truncated_sqlite_backup(tmp_path, monkeypatch):
    """A valid SQLite header with a broken body must be refused too.

    This catches the case where the script only checks the header bytes but
    does not run ``PRAGMA integrity_check`` or equivalent on the backup.
    """
    source, target = tmp_path / "truncated.sqlite3", tmp_path / "live.sqlite3"
    source.write_bytes(b"SQLite format 3\x00" + b"\x00" * 64)
    _write_sample_database(target, "keep-me")

    assert (
        _run(
            monkeypatch,
            "--backup", str(source),
            "--database", str(target),
            "--yes",
        )
        == 2
    )

    assert _read_sample_database(target) == "keep-me"
    assert not list(tmp_path.glob("live.sqlite3.pre-restore-*"))


def test_restore_rejects_missing_backup_cleanly(tmp_path, monkeypatch):
    target = tmp_path / "live.sqlite3"
    _write_sample_database(target, "keep-me")

    assert (
        _run(
            monkeypatch,
            "--backup", str(tmp_path / "missing.sqlite3"),
            "--database", str(target),
            "--yes",
        )
        == 2
    )

    assert _read_sample_database(target) == "keep-me"


def test_restore_refuses_when_backup_and_database_are_the_same_file(
    tmp_path, monkeypatch
):
    """``--backup X --database X`` must be refused.

    Without this guard the safety copy would be the file itself, so the
    restore would silently destroy the only copy of the data.
    """
    same = tmp_path / "live.sqlite3"
    _write_sample_database(same, "only-copy")

    assert (
        _run(
            monkeypatch,
            "--backup", str(same),
            "--database", str(same),
            "--yes",
        )
        == 2
    )

    assert _read_sample_database(same) == "only-copy"
    assert not list(tmp_path.glob("live.sqlite3.pre-restore-*"))