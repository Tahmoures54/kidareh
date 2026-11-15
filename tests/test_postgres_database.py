"""Disposable PostgreSQL integration checks for the SQLAlchemy adapter.

These tests are enabled only in CI (or when KIDAREH_TEST_POSTGRES_URL is set).
They use temporary tables and never touch application or production schemas.
"""
import os

import pytest

from kidareh.infrastructure.database.legacy_adapter import SQLAlchemyConnectionAdapter
from kidareh.infrastructure.database.session import create_database_engine


@pytest.fixture
def postgres_adapter():
    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")
    engine = create_database_engine("unused.sqlite3", url=url)
    connection = engine.connect()
    try:
        yield SQLAlchemyConnectionAdapter(connection)
    finally:
        connection.close()
        engine.dispose()


def test_postgres_adapter_supports_qmark_binds_and_mapping_rows(postgres_adapter):
    postgres_adapter.execute(
        "CREATE TEMP TABLE adapter_smoke (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL)"
    )
    result = postgres_adapter.execute(
        "INSERT INTO adapter_smoke(label) VALUES (?) RETURNING id, label",
        ("کی‌داره",),
    )
    row = result.fetchone()
    assert row["id"] > 0
    assert row[1] == "کی‌داره"
    assert dict(row) == {"id": row["id"], "label": "کی‌داره"}
    postgres_adapter.commit()


def test_postgres_adapter_supports_executemany(postgres_adapter):
    postgres_adapter.execute(
        "CREATE TEMP TABLE adapter_batch (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL)"
    )
    result = postgres_adapter.executemany(
        "INSERT INTO adapter_batch(label) VALUES (?)",
        [("one",), ("two",), ("three",)],
    )
    assert result.rowcount == 3
    postgres_adapter.commit()
    rows = postgres_adapter.execute(
        "SELECT label FROM adapter_batch ORDER BY id"
    ).fetchall()
    assert [row["label"] for row in rows] == ["one", "two", "three"]
