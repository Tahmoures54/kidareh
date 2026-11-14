"""SQLAlchemy 2.x engine, reflected mappings, and session lifecycle."""
from __future__ import annotations

import contextlib
import logging
from pathlib import Path
from typing import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, registry, sessionmaker

from .base import Base

logger = logging.getLogger(__name__)

# These are FTS5 virtual-table implementation tables, not domain entities.
_EXCLUDED_TABLES = {
    "listings_fts", "listings_fts_config", "listings_fts_data",
    "listings_fts_docsize", "listings_fts_idx",
}


def database_url(database_path: str | Path) -> str:
    """Build a safe SQLAlchemy URL for the configured SQLite file."""
    # DATABASE_URL is intentionally not activated yet: the legacy route layer
    # still uses the DATABASE_PATH/DB_PATH SQLite connection. Reading a second
    # URL here could split ORM and legacy writes across two different databases.
    path = Path(database_path).expanduser().resolve()
    return f"sqlite:///{path.as_posix()}"


def create_database_engine(database_path: str | Path, url: str | None = None) -> Engine:
    target_url = url or database_url(database_path)
    options = {"pool_pre_ping": True, "future": True}
    if target_url.startswith("sqlite:"):
        options["connect_args"] = {"check_same_thread": False, "timeout": 30}
    engine = create_engine(target_url, **options)

    if target_url.startswith("sqlite:"):
        @event.listens_for(engine, "connect")
        def _sqlite_connection_setup(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA busy_timeout=30000")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA cache_size=-65536")
            cursor.execute("PRAGMA mmap_size=268435456")
            cursor.close()

    return engine


def reflect_domain_models(engine: Engine) -> dict[str, type]:
    """Reflect current domain tables and map them using SQLAlchemy's ORM.

    Reflection is intentionally performed only after Kidareh's existing schema
    bootstrap. It preserves the exact deployed SQLite schema and supports
    incremental conversion of route/service code to ORM repositories.
    """
    metadata = Base.metadata
    metadata.clear()
    metadata.reflect(
        bind=engine,
        only=lambda table_name, _metadata: table_name not in _EXCLUDED_TABLES,
    )

    mapped: dict[str, type] = {}
    mapper_registry = registry(metadata=metadata)
    for table_name, table in metadata.tables.items():
        if not table.primary_key.columns:
            logger.warning("Skipping ORM mapping for table without a primary key: %s", table_name)
            continue
        model_name = "".join(part.capitalize() for part in table_name.split("_"))
        model = type(model_name, (), {"__module__": __name__})
        mapper_registry.map_imperatively(model, table)
        mapped[table_name] = model
    return mapped


class Database:
    """Application-scoped SQLAlchemy engine and session factory."""

    def __init__(self, engine: Engine):
        self.engine = engine
        self.models: dict[str, type] = {}
        self._session_factory = sessionmaker(
            bind=engine, class_=Session, autoflush=False,
            expire_on_commit=False,
        )

    def reflect(self) -> dict[str, type]:
        self.models = reflect_domain_models(self.engine)
        return self.models

    def session(self) -> Session:
        return self._session_factory()

    @contextlib.contextmanager
    def session_scope(self) -> Iterator[Session]:
        session = self.session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def dispose(self) -> None:
        self.engine.dispose()


def init_app(app) -> Database:
    """Attach a Database instance to Flask without touching schema state."""
    existing = app.extensions.get("kidareh_db")
    if existing is not None:
        return existing
    engine = create_database_engine(
        app.config["DATABASE_PATH"], app.config.get("DATABASE_URL")
    )
    database = Database(engine)
    app.extensions["kidareh_db"] = database
    return database


def get_database() -> Database:
    """Get the active app's Database extension."""
    from flask import current_app
    database = current_app.extensions.get("kidareh_db")
    if database is None:
        raise RuntimeError("Kidareh SQLAlchemy database is not initialized")
    return database


@contextlib.contextmanager
def session_scope() -> Iterator[Session]:
    """Convenience transaction scope for application code."""
    with get_database().session_scope() as session:
        yield session
