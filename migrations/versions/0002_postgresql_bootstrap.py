"""Bootstrap PostgreSQL domain tables from the versioned SQLite schema factory.

Revision ID: 0002_postgresql_bootstrap
Revises: 0001_adopt_existing_schema

This initial PostgreSQL bootstrap uses the application's idempotent schema
factory against a disposable SQLite database, reflects the resulting domain
schema, and creates that schema on the Alembic PostgreSQL connection. It
preserves the application-owned constraints and indexes without copying demo
or user rows. The migration is intentionally one-time and non-destructive.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from alembic import op
from sqlalchemy import MetaData

revision = "0002_postgresql_bootstrap"
down_revision = "0001_adopt_existing_schema"
branch_labels = None
depends_on = None

_EXCLUDED_TABLES = {
    "listings_fts",
    "listings_fts_config",
    "listings_fts_data",
    "listings_fts_docsize",
    "listings_fts_idx",
}


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        # SQLite installations continue to use the existing application
        # bootstrap; this revision only provisions PostgreSQL domain tables.
        return

    # Import the Flask app lazily so ordinary SQLite Alembic commands and
    # migration inspection do not boot the web application.
    from kidareh import create_app
    from kidareh.core import initialize_database
    from kidareh.infrastructure.database.session import get_database

    with tempfile.TemporaryDirectory(prefix="kidareh-pg-schema-") as directory:
        root = Path(directory)
        app = create_app(
            {
                "TESTING": True,
                "SECRET_KEY": "schema-bootstrap-only-not-a-production-secret",
                "DATABASE_BACKEND": "sqlite",
                "DATABASE_URL": "",
                "DATABASE_PATH": str(root / "schema.sqlite3"),
                "UPLOAD_FOLDER": str(root / "uploads"),
                "REDIS_URL": "",
            }
        )
        with app.app_context():
            try:
                # Build every current domain table using the authoritative,
                # idempotent SQLite schema factory, but in an empty temp file.
                initialize_database()
                source_engine = get_database().engine
                metadata = MetaData()
                metadata.reflect(
                    bind=source_engine,
                    only=lambda table_name, _metadata: table_name not in _EXCLUDED_TABLES,
                )

                # create_all is additive and checkfirst-aware: existing Neon
                # objects are not dropped or overwritten.
                metadata.create_all(bind=bind)

                # PostgreSQL full-text search uses an expression GIN index;
                # SQLite FTS5 virtual tables/triggers are intentionally omitted.
                bind.exec_driver_sql(
                    """
                    CREATE INDEX IF NOT EXISTS idx_listings_search_vector
                    ON listings USING GIN (
                        to_tsvector(
                            'simple',
                            coalesce(title, '') || ' ' ||
                            coalesce(description, '') || ' ' ||
                            coalesce(city, '')
                        )
                    )
                    """
                )
            finally:
                get_database().dispose()


def downgrade() -> None:
    raise RuntimeError(
        "The PostgreSQL bootstrap is intentionally non-destructive; "
        "restore a verified database snapshot instead of dropping domain tables."
    )
