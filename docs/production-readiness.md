# Production readiness gate

## Deployment prerequisites

- Python 3.12 runtime (kept in sync with GitHub Actions).
- A production `SECRET_KEY` containing at least 32 random bytes. Platform-injected environment variables take precedence over `.env` values.
- On Liara, a persistent disk mounted at `/app/data` and `KIDAREH_DATA_DIR=/app/data` set in the app's runtime environment. The app intentionally refuses to boot on Liara without a persistent-data path.
- `DATABASE_PATH` and `UPLOAD_FOLDER`, when explicitly set, must point inside the persistent mount on Liara.
- Configure SMS and payment credentials only when their respective feature flags are enabled.
- Configure trusted proxy hops only for the actual reverse-proxy topology. The default is one hop in production.

Liara's CLI supports mounting disks during deployment; create and attach the disk in the Liara app configuration before enabling production traffic. The exact disk name and mount path are account/app-specific.

## Preflight commands

```bash
python scripts/check_production.py
python main.py
# After the first successful boot, in the same environment:
python scripts/check_production.py --runtime
```

The runtime check is read-only with respect to business data. It checks SQLite integrity, the required core tables, and WAL journal mode.

## Current release boundary

The current production runtime is still SQLite-backed. SQLAlchemy 2.x Engine/Connection is used for route query execution and the ORM can reflect/map the 18 domain tables. `current_user` now uses ORM `select()` and the account/listing repositories expose ORM query methods. However, most route handlers still use parameterized SQL through the compatibility adapter; Alembic is not yet the sole schema migration mechanism; `DATABASE_URL` is not active; and PostgreSQL compatibility has not been established.

Do not scale this release horizontally or claim PostgreSQL readiness. Before that, complete the ORM/service extraction, move feature schema initialization out of route modules, create and test forward Alembic revisions, and run the complete application test suite against the target database.

## Test-suite policy

All acceptance tests are enabled in `pytest.ini`. A legacy OTP test was updated to match the server's explicit consent requirement: an OTP request must include `terms_accepted=true`. The CI workflow installs `requirements-dev.txt`, while the deployed application installs only `requirements.txt`; pytest is not a production dependency.

## Verification available in this build environment

- Production preflight/backup/restore tests: 20 passed.
- SQLAlchemy 2.x reflection and SELECT queries were checked directly against the bundled SQLite schema.
- Full Flask integration tests and live Liara deployment cannot be certified from this environment because Flask is not installed here and outbound package installation is unavailable. Alembic baseline migration was exercised against a disposable SQLite database and the resulting database passed `PRAGMA integrity_check`. A release is not certified until GitHub Actions runs the full enabled suite successfully and a deployment smoke test passes on the actual Liara app and persistent disk.
