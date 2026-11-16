"""PostgreSQL-only Alembic environment for Kidareh."""
from logging.config import fileConfig
import os

from alembic import context
from sqlalchemy import MetaData, engine_from_config, pool

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)


def _database_url() -> str:
    configured_url = (
        os.environ.get("MIGRATION_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not configured_url:
        raise RuntimeError(
            "DATABASE_URL is required for Alembic. SQLite migrations are unsupported."
        )
    if configured_url.startswith("postgres://"):
        return "postgresql+psycopg://" + configured_url[len("postgres://"):]
    if configured_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + configured_url[len("postgresql://"):]
    if configured_url.startswith("postgresql+psycopg://"):
        return configured_url
    raise RuntimeError("DATABASE_URL must be a PostgreSQL URL using psycopg 3.")


config.set_main_option("sqlalchemy.url", _database_url().replace("%", "%%"))
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
        connect_args={"prepare_threshold": None},
    )
    try:
        target_metadata.reflect(
            bind=connectable,
            only=lambda table_name, _metadata: table_name not in _EXCLUDED_TABLES,
        )
        with connectable.connect() as connection:
            if connection.dialect.name != "postgresql":
                raise RuntimeError("Kidareh migrations require PostgreSQL.")
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                render_as_batch=False,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
