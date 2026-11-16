# Production readiness gate

## Deployment prerequisites

- Python 3.12 runtime (kept in sync with GitHub Actions).
- A production `SECRET_KEY` containing at least 32 random bytes. Platform-injected environment variables take precedence over `.env` values.
- On Liara, a persistent disk mounted at `/app/data` and `KIDAREH_DATA_DIR=/app/data` set in the app's runtime environment. The app intentionally refuses to boot on Liara without a persistent-data path.
- `DATABASE_PATH` and `UPLOAD_FOLDER`, when explicitly set, must point inside the persistent mount on Liara when using SQLite.
- Configure SMS and payment credentials only when their respective feature flags are enabled.
- Configure trusted proxy hops only for the actual reverse-proxy topology. The default is one hop in production.

## Database backend selection

SQLite remains the default. A configured `DATABASE_URL` by itself does not change the runtime database.

To opt into PostgreSQL, set both:
- `DATABASE_BACKEND=postgresql`
- `DATABASE_URL` to the secret PostgreSQL connection URL.

For a separate direct/unpooled migration endpoint, optionally set `MIGRATION_DATABASE_URL` to the same database. It must target the same Neon database as `DATABASE_URL`; do not point the two variables at different branches or databases.

On PostgreSQL startup, the app:
1. Acquires a transaction-scoped PostgreSQL advisory lock (compatible with PgBouncer transaction pooling).
2. Runs Alembic to head.
3. Applies revision `0002_postgresql_bootstrap`, which runs the repository's PostgreSQL-native schema migration modules.
4. Ensures PostgreSQL performance and Persian full-text GIN indexes, reflects the schema, and checks the core tables.

The bootstrap is additive and is intended for a compatible empty/new PostgreSQL schema. It does not copy business rows or drop existing tables. Existing tables and incompatible pre-existing columns must be inspected and reconciled explicitly before enabling PostgreSQL. Do not assume an automated downgrade is a safe rollback; review the exact revision behavior and take a verified backup first.

## Preflight commands

```bash
python scripts/check_production.py
python main.py
# After the first successful boot, in the same environment:
python scripts/check_production.py --runtime
```

The runtime check is read-only with respect to business data. It currently performs SQLite-specific integrity checks; do not use that command as a PostgreSQL integrity check.

## Current release boundary

The PostgreSQL path is implemented as an opt-in backend and has disposable PostgreSQL integration coverage, including schema bootstrap, full Flask startup, health checks, Persian full-text search, rate-limit concurrency, OTP cooldown concurrency, and advisory-lock coordination. The existing SQLite path remains the default and its full suite continues to run separately.

This is not yet authorization to switch the live Vercel or Liara project. Before changing Production:
- Verify the exact Neon project/branch/database and its existing schema.
- Run the same full startup and authenticated end-to-end flows on a Preview using the PostgreSQL backend.
- Verify registration, OTP verification, session persistence, seller dashboard access, listing create/edit/search, image upload, and rate limiting across cold starts/instances.
- Verify Neon connection limits, SSL, pooler/direct URLs, backups, and a rollback plan.
- Keep the current SQLite deployment and any uploaded-image inventory untouched until the rollback window closes.

## Test-suite policy

All acceptance tests are enabled in `pytest.ini`. A legacy OTP test was updated to match the server's explicit consent requirement: an OTP request must include `terms_accepted=true`. The CI workflow installs `requirements-dev.txt`, while the deployed application installs only `requirements.txt`; pytest is not a production dependency.

## Verification available in this build environment

GitHub Actions is the source of truth for verification. It runs the complete SQLite/application suite and a separate PostgreSQL 16 service suite. Do not treat a successful isolated adapter test as proof that the live Neon database or hosted deployment has been verified.
