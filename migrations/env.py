"""Alembic environment for Kidareh's SQLite schema.

This module deliberately does not import the Flask application package. Alembic
must be able to inspect and migrate a database in a maintenance process without
booting the web app or requiring Flask to be imported as a side effect.
"""
from logging.config import fileConfig
import os
from pathlib import Path

from alembic import context
from sqlalchemy import MetaData, engine_from_config, pool

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)


def _database_url() -> str:
    configured = os.environ.get("DATABASE_PATH") or os.environ.get("DB_PATH")
    if configured:
        path = Path(configured).expanduser().resolve()
    else:
        path = Path("instance/kidareh.sqlite3").resolve()
    return f"sqlite:///{path.as_posix()}"


config.set_main_option("sqlalchemy.url", _database_url().replace("%", "%%"))
# Runtime ORM mappings are reflected after the application-owned bootstrap.
# Alembic reflects the same physical domain schema directly, without importing
# kidareh.__init__ (which would require Flask and create the application).
target_metadata = MetaData()
_EXCLUDED_TABLES = {
    "listings_fts", "listings_fts_config", "listings_fts_data",
    "listings_fts_docsize", "listings_fts_idx",
}


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    try:
        target_metadata.reflect(
            bind=connectable,
            only=lambda table_name, _metadata: table_name not in _EXCLUDED_TABLES,
        )
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                render_as_batch=connection.dialect.name == "sqlite",
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
