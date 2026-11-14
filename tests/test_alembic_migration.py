"""Alembic baseline smoke tests that do not need to boot the Flask app."""
from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_alembic_baseline_adopts_existing_sqlite_without_changing_rows(tmp_path):
    database = tmp_path / "existing-kidareh.sqlite3"
    connection = sqlite3.connect(database)
    connection.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"
    )
    connection.execute("INSERT INTO users(id, name) VALUES (1, 'preserved')")
    connection.commit()
    connection.close()

    environment = dict(os.environ)
    environment["DATABASE_PATH"] = str(database)
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        cwd=ROOT,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )

    connection = sqlite3.connect(database)
    try:
        assert connection.execute("SELECT name FROM users WHERE id=1").fetchone() == ("preserved",)
        assert connection.execute("SELECT version_num FROM alembic_version").fetchone() == (
            "0001_adopt_existing_schema",
        )
        assert connection.execute("PRAGMA integrity_check").fetchone() == ("ok",)
    finally:
        connection.close()
