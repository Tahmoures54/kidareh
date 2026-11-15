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


def test_initialized_sqlite_schema_can_be_rehearsed_on_postgres(tmp_path):
    """Create the current app schema in disposable PostgreSQL without data.

    This is a schema-conversion rehearsal only, not the production migration
    mechanism. It deliberately uses a fresh SQLite fixture as the schema
    source, then verifies SQLAlchemy can create all reflected domain tables on
    PostgreSQL.
    """
    url = os.environ.get("KIDAREH_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("KIDAREH_TEST_POSTGRES_URL is not configured")

    from sqlalchemy import inspect
    from kidareh import create_app
    from kidareh.core import initialize_database
    from kidareh.infrastructure.database.base import Base
    from kidareh.infrastructure.database.session import get_database

    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "postgres-schema-rehearsal-only",
        "DATABASE_PATH": str(tmp_path / "schema-source.sqlite3"),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    with app.app_context():
        initialize_database()
        source_tables = set(Base.metadata.tables)
        assert {"users", "stores", "listings"}.issubset(source_tables)

        target_engine = create_database_engine("unused.sqlite3", url=url)
        try:
            Base.metadata.create_all(target_engine)
            target_tables = set(inspect(target_engine).get_table_names())
            assert source_tables.issubset(target_tables)
        finally:
            target_engine.dispose()
            get_database().dispose()
