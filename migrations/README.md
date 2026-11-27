# PostgreSQL database migrations

PostgreSQL/Neon is the only supported application database. Alembic is the
authoritative schema lifecycle manager.

## Revisions

- `0001_adopt_existing_schema`: historical no-op baseline.
- `0002_postgresql_bootstrap`: creates the application domain schema in a fresh
  PostgreSQL database from the version-controlled PostgreSQL schema modules.
- `0003_listings_search_vector`: provisions the PostgreSQL full-text search index.
- `0004_double_precision`: preserves epoch timestamp and coordinate precision.

The initial schema bootstrap is intended for a fresh empty Neon database. It
does not copy business records or silently drop existing tables. Downgrade of
the initial schema is intentionally blocked.

## Running migrations

Set `DATABASE_URL` (or `MIGRATION_DATABASE_URL` for a dedicated direct endpoint)
to the intended Neon PostgreSQL database, then run:

```bash
python -m alembic upgrade head
```

At application startup, Alembic runs under a transaction-scoped PostgreSQL
advisory lock. Never commit connection URLs or credentials.

SQLite is not a supported application database. A temporary SQLite test fixture
is retained only while the remaining legacy route tests are migrated.
