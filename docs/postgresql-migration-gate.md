# PostgreSQL migration — implementation gate

## Current state

The application still runs on SQLite. The PostgreSQL URL helper and psycopg 3
driver added in this branch are **foundation only**; they do not activate
PostgreSQL in the Flask app. Do not set the production application to use a
PostgreSQL URL until the legacy query adapter, schema bootstrap, migrations,
health checks, search implementation, and integration tests have been ported.

## Required migration sequence

1. Inventory every domain table, column, constraint, index, trigger, and
   SQLite-only feature from the current schema bootstrap.
2. Create a canonical SQLAlchemy/Alembic schema for PostgreSQL. The existing
   reflected mappings and SQLite bootstrap are not a portable schema source.
3. Port SQL execution and result semantics. Current routes depend on SQLite
   behaviour including positional `?` binds, `lastrowid`, SQLite metadata
   tables, PRAGMA, `BEGIN IMMEDIATE`, and FTS5. Placeholder translation alone
   does not make these statements PostgreSQL-compatible.
4. Replace FTS5 with PostgreSQL full-text search (or a documented portable
   search implementation), including equivalent indexes and ranking.
5. Move OTP flow state and rate limits to shared persistent storage. Do not use
   process-local or per-instance state for authentication.
6. Add CI integration tests against a disposable PostgreSQL service and run
   the full Flask suite against both SQLite (compatibility) and PostgreSQL.
7. Verify Neon schema, role privileges, SSL, pooler/direct endpoint choice,
   connection limits, and backups before a controlled production cutover.
8. Run Alembic with an explicit `MIGRATION_DATABASE_URL` (or `DATABASE_URL`)
   only after reviewing the target. This controls migration commands, not Flask
   runtime traffic. The current baseline revision is empty and does not create
   domain tables.
9. Only after all gates pass, enable the PostgreSQL URL in the runtime config.
   Keep the old deployment rollback path available until smoke tests pass.

## Safety

- Never print or commit a database URL or password.
- Never drop or recreate the live Neon database merely because the application
  has little business data; first inspect its ownership, branch, schema, and
  connected projects.
- Prefer a fresh Neon branch/database for migration rehearsals. Production
  schema changes must be explicit, reviewed, and reversible where possible.
- The application must not silently run ORM and legacy writes against different
  databases.
