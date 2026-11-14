# Database layer — SQLAlchemy 2.x

Kidareh now has an application-scoped SQLAlchemy 2.x engine, `DeclarativeBase`,
transaction-scoped `Session` factory, SQLite connection pragmas, and ORM mappings
for the initialized domain tables. `get_database()` returns the Flask extension;
`session_scope()` provides commit/rollback/close semantics.

```python
from kidareh.infrastructure.database import get_database

with get_database().session_scope() as session:
    User = get_database().models["users"]
    user = session.get(User, 1)
```

The account, listing, and store domains now include SQLAlchemy 2.x repository
implementations (`UserRepository`, `ListingRepository`, `StoreRepository`) using
`select()` and `Session`. The current HTTP route handlers still contain legacy
SQL statements; they are deliberately kept operational during this compatibility
phase while route/service behavior is migrated and regression-tested. The
reflected mappings adopt the real deployed schema after the existing idempotent
bootstrap, avoiding an unsafe table recreation or data copy. FTS5 virtual-table
internals are excluded.

## Alembic

Alembic is configured in the repository root. The initial revision is a
non-destructive baseline because existing installations already have tables
managed by the application bootstrap. After changing ORM/domain schema, create a
reviewed revision with `alembic revision --autogenerate -m "describe change"`,
then apply with `alembic upgrade head`. Always back up production data before
schema changes.

## Neon / PostgreSQL compatibility audit (2026-11-14)

**Status: not ready to point production traffic at Neon.** The Neon integration
is provisioned, but the application runtime remains SQLite. This is intentional:
the existing database layer is not yet portable merely because SQLAlchemy is
installed.

The initial source audit found these concrete SQLite dependencies:

1. **Connection and placeholder contract.** `kidareh/core.py` still owns the
   request-scoped compatibility connection. Route and feature code issues
   driver-level SQL using SQLite positional `?` placeholders. The
   `SQLAlchemyConnectionAdapter` calls `exec_driver_sql`, which forwards this
   SQL to the active DB-API driver; PostgreSQL drivers do not accept SQLite's
   placeholder syntax. The adapter also exposes SQLite-oriented result behavior
   such as `lastrowid`.
2. **Schema discovery and startup DDL.** `core.py` and route initializers use
   `sqlite_master`, `PRAGMA table_info`, `PRAGMA foreign_key_list`, and
   `PRAGMA journal_mode`. These are not PostgreSQL catalog/DDL operations.
   Startup also creates and alters tables from route modules rather than relying
   exclusively on reviewed Alembic revisions.
3. **Search implementation.** Listing search uses SQLite FTS5 virtual tables,
   FTS5 vocabulary probes, rebuild commands, and FTS triggers. PostgreSQL needs
   a separate full-text-search design (for example `tsvector` plus a GIN index)
   and equivalent Persian tokenization/ranking tests; replacing the SQL string
   alone would change search behavior.
4. **Transaction semantics.** Rate-limit and OTP flows explicitly issue
   `BEGIN IMMEDIATE` to serialize read-modify-write operations under SQLite.
   PostgreSQL requires a deliberate concurrency strategy, such as row-level
   locking or atomic upserts, plus concurrent integration tests. A blind
   replacement with `BEGIN` would reintroduce race conditions.
5. **Schema and data types.** DDL uses `INTEGER PRIMARY KEY AUTOINCREMENT`,
   SQLite-specific column introspection, integer booleans, and text timestamps.
   PostgreSQL migrations must preserve generated IDs, uniqueness, foreign keys,
   nullable legacy values, and the exact application-level timestamp semantics.

### Required migration sequence

- [ ] Inventory every runtime SQL statement, schema initializer, trigger, index,
      and transaction boundary; classify SQLite-only constructs and their owners.
- [ ] Define PostgreSQL schema migrations from the real current schema. The
      existing `0001_adopt_existing_schema` revision is an empty baseline, not a
      PostgreSQL schema migration.
- [ ] Implement a dialect-aware connection/result layer or migrate route
      operations to SQLAlchemy Core/ORM. Do not use global string replacement
      for placeholders or SQL syntax.
- [ ] Replace FTS5 with PostgreSQL full-text search and validate Persian queries,
      ranking, filtering, pagination, and index maintenance against fixtures.
- [ ] Redesign OTP and rate-limit atomicity for PostgreSQL and test concurrent
      requests across independent connections.
- [ ] Run the full test suite against both SQLite and a disposable PostgreSQL
      database; add migration upgrade, rollback, schema parity, and data-integrity
      checks.
- [ ] Back up the live SQLite database and uploaded-image inventory. Copy data
      with row counts, key checks, and checksums; verify a reversible cutover
      plan before changing the production connection string.
- [ ] Only after preview and authenticated end-to-end verification, switch
      production to Neon. Keep the SQLite backup untouched until the rollback
      window has closed.

**Safety rule:** do not set `DATABASE_URL` as the production runtime database
selector, do not run schema bootstrap against Neon, and do not migrate or delete
live records until the PostgreSQL schema, adapter, tests, backup, and rollback
plan are reviewed and verified. The current empty Alembic baseline must not be
mistaken for a completed migration.
