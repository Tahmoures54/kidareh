# Database migrations

Alembic is the schema migration entry point for the opt-in PostgreSQL backend.

## Revisions

- `0001_adopt_existing_schema` is a no-op baseline used to adopt existing SQLite installations without rewriting their schema.
- `0002_postgresql_bootstrap` is the initial PostgreSQL bootstrap. It builds the current application schema in a disposable SQLite database using the authoritative schema factory, reflects the tables and indexes, and creates them additively on the PostgreSQL connection. It does not copy user/business rows or drop existing tables. The downgrade is intentionally blocked.

The bootstrap is designed for an empty/new PostgreSQL schema. Existing tables are skipped by SQLAlchemy's `create_all(checkfirst=True)`; incompatible pre-existing schemas must be inspected and reconciled explicitly before enabling PostgreSQL.

## Running migrations

For a deliberate manual migration, set `MIGRATION_DATABASE_URL` to the intended PostgreSQL URL and run:

```bash
python -m alembic upgrade head
```

At runtime, `DATABASE_BACKEND=postgresql` plus `DATABASE_URL` enables the PostgreSQL path. Startup runs Alembic under a transaction-scoped advisory lock. If a separate direct/unpooled migration URL is required, set `MIGRATION_DATABASE_URL` to the same database as `DATABASE_URL`.

Never commit connection URLs or credentials. Do not run the migration against an unverified Neon project/branch. The default backend remains SQLite until PostgreSQL is explicitly selected.
