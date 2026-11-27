# Production readiness gate

## Deployment prerequisites

- Python 3.12 runtime (kept in sync with GitHub Actions).
- A production `SECRET_KEY` containing at least 32 random bytes. Platform-injected environment variables take precedence over `.env` values.
- A PostgreSQL `DATABASE_URL` is mandatory on every deployment. SQLite is rejected outside the isolated legacy test harness.
- On Vercel, use `DATABASE_BACKEND=postgresql` with a persistent PostgreSQL `DATABASE_URL`, and connect Vercel Blob so `BLOB_READ_WRITE_TOKEN` is injected. Vercel's writable `/tmp` is ephemeral and must never be treated as durable application storage. Application startup rejects SQLite; the health endpoint checks the configured PostgreSQL connection.
- On Vercel, connect Neon and Vercel Blob. Local uploads on other hosts require a durable configured upload path or object storage.
- Configure SMS and payment credentials only when their respective feature flags are enabled.
- Configure trusted proxy hops only for the actual reverse-proxy topology. The default is one hop in production.

## Database backend selection

PostgreSQL is mandatory. Set:
- `DATABASE_BACKEND=postgresql`
- `DATABASE_URL` to the secret Neon/PostgreSQL connection URL.

The application refuses to start if a deployment selects SQLite or omits `DATABASE_URL`.

For a separate direct/unpooled migration endpoint, optionally set `MIGRATION_DATABASE_URL` to the same database. It must target the same Neon database as `DATABASE_URL`; do not point the two variables at different branches or databases.

On PostgreSQL startup, the app:
1. Acquires a transaction-scoped PostgreSQL advisory lock (compatible with PgBouncer transaction pooling).
2. Runs Alembic to head.
3. Applies revision `0002_postgresql_bootstrap`, which runs the repository's PostgreSQL-native schema migration modules.
4. Ensures PostgreSQL performance and Persian full-text GIN indexes, reflects the schema, and checks the core tables.

The bootstrap is intended for a fresh empty PostgreSQL schema. No business rows are transferred from SQLite because the project currently has no data. Existing tables and incompatible pre-existing columns must still be inspected before applying revisions. Do not assume an automated downgrade is a safe rollback.

## Preflight commands

```bash
python scripts/check_production.py
python main.py
# After the first successful boot, in the same environment:
python scripts/check_production.py --runtime
```

The runtime check is read-only with respect to business data. It verifies PostgreSQL connectivity and required core tables; it does not replace a backup/restore rehearsal or a full schema audit.

## Current release boundary

PostgreSQL is the only supported application backend. CI runs PostgreSQL 16 integration coverage for schema bootstrap, health checks, Persian full-text search, rate-limit concurrency, OTP cooldown concurrency, and advisory-lock coordination. A small legacy SQLite test harness remains temporarily while the broad route tests are ported; it is not available in deployed runtime.

Before promoting a new deployment:
- Verify the exact Neon project/branch/database and apply the Alembic schema to a fresh empty database.
- Run `python scripts/check_production.py` with the exact Vercel Production environment variables before promotion; it rejects ephemeral SQLite and missing Blob configuration.
- Run full startup and authenticated end-to-end flows on a Preview using PostgreSQL.
- Verify registration, OTP verification, session persistence, seller dashboard access, listing create/edit/search, image upload, and rate limiting across cold starts/instances.
- Verify Neon connection limits, SSL, pooler/direct URLs, backups, and a rollback plan.
- Keep a verified PostgreSQL backup and the prior deployment available until the rollback window closes.

## Test-suite policy

All acceptance tests are enabled in `pytest.ini`. A legacy OTP test was updated to match the server's explicit consent requirement: an OTP request must include `terms_accepted=true`. The CI workflow installs `requirements-dev.txt`, while the deployed application installs only `requirements.txt`; pytest is not a production dependency.

## Verification available in this build environment

GitHub Actions is the source of truth for verification. It runs the application suite (a few legacy tests still use a temporary SQLite fixture) and a separate PostgreSQL 16 integration suite. Do not treat a successful isolated adapter test as proof that the live Neon database or hosted deployment has been verified.
