# PostgreSQL migration — release gate

## Implemented

The repository contains an opt-in PostgreSQL runtime path, a SQLAlchemy-backed
legacy SQL compatibility adapter, PostgreSQL-native Alembic schema revisions,
PostgreSQL full-text search/index support, shared-database OTP/rate-limit
coordination, and CI integration coverage against PostgreSQL 16.

SQLite remains the default runtime backend. A `DATABASE_URL` by itself does
not switch the application to PostgreSQL. PostgreSQL is selected only when
`DATABASE_BACKEND=postgresql` and a valid secret `DATABASE_URL` are both
configured.

## Verified in CI

The GitHub Actions workflow runs the complete SQLite/application suite and a
separate PostgreSQL service suite. The PostgreSQL suite covers schema
bootstrap, Flask startup, health checks, Persian search, rate-limit and OTP
concurrency, and advisory-lock coordination.

The current registration change also passed the latest PR workflow on the
merged head. CI success is not evidence that the live Neon project, deployed
Preview, SMS provider, or image storage has been exercised end to end.

## Required before enabling PostgreSQL on a hosted environment

1. Inspect the exact Neon project, branch, database, role, and existing schema
   read-only. Never infer that a database is empty because the app has few
   users.
2. Confirm the target schema is compatible with the additive PostgreSQL
   bootstrap. Existing tables and incompatible columns require explicit
   inspection and reconciliation; do not assume the migration will rewrite
   them.
3. Use a disposable Neon branch for rehearsal. Verify SSL, pooler versus direct
   endpoint, connection limits, role privileges, backups, and recovery.
4. Configure PostgreSQL only on a Preview environment first. Keep SQLite as
   the Production backend during this rehearsal.
5. Complete authenticated end-to-end checks on Preview: request and verify a
   real SMS OTP, complete buyer and seller registration, preserve sessions
   across requests/cold starts, create a seller store, access the dashboard,
   create/edit/search listings, upload and retrieve images, and exercise
   rate limits across instances.
6. Confirm application runtime and Alembic migration URLs point to the same
   Neon database. Use a separate direct/unpooled migration URL only when it
   targets that same database.
7. Document a rollback plan and preserve the existing SQLite database and
   uploaded-image inventory until the rollback window has closed.

## Safety rules

- Never print, commit, or paste database URLs, passwords, or provider tokens.
- Never drop or recreate a live Neon database as a shortcut.
- Do not enable PostgreSQL on Production until every gate above is reviewed.
- Do not assume an Alembic downgrade is a safe rollback; inspect the exact
  revision behavior and take a verified backup before any schema change.
- Do not allow ORM and legacy SQL traffic to silently use different databases.

## Useful references

See [production-readiness.md](production-readiness.md) for deployment
prerequisites, backend selection, and CI verification details.
