# Kidareh release checklist

This checklist separates checks that can be completed in the repository from
checks that require the real hosting account, mounted disk, and provider keys.
Do not mark the release Production-certified until every required item below
has evidence.

## Repository and CI

- [x] Runtime and development dependencies are separated (`requirements.txt`, `requirements-dev.txt`).
- [x] Production tests are not silently deselected in `pytest.ini`.
- [x] OTP acceptance test enforces explicit terms acceptance.
- [x] Python compilation and JavaScript syntax checks pass in the build environment.
- [x] SQLite backup, restore, preflight, and Alembic baseline tests pass in the build environment.
- [ ] Install dependencies from `requirements-dev.txt` in a clean Python 3.12 environment.
- [ ] Run the entire `pytest -q` suite; resolve every failure (not just collection errors).
- [ ] Confirm GitHub Actions checks are green on the exact release commit.

## Liara configuration

- [ ] Set a strong random `SECRET_KEY` (at least 32 random bytes) in Liara environment variables.
- [ ] Attach a persistent disk mounted at `/app/data`.
- [ ] Set `KIDAREH_DATA_DIR=/app/data`.
- [ ] Set `FLASK_ENV=production` and `PROXY_FIX_HOPS=1` when exactly one trusted reverse proxy is in front of Gunicorn.
- [ ] Configure `KAVENEGAR_API_KEY`, `KAVENEGAR_VERIFY_TEMPLATE`, and `ADMIN_PHONE` only after validating provider credentials.
- [ ] Configure `ZIBAL_MERCHANT` only after testing request, callback, amount, order ID, and idempotent verification in the merchant sandbox.
- [ ] Confirm the Liara start command uses the repository `Procfile` and Gunicorn configuration.
- [ ] Confirm the platform's listening port matches `PORT` (Gunicorn defaults to 3000 in this configuration).

## Post-deploy smoke tests

- [ ] `GET /api/health` returns HTTP 200 and reports database and upload storage as healthy.
- [ ] `python scripts/check_production.py --runtime` passes on the mounted disk.
- [ ] Register a test buyer and seller using the real SMS provider; verify OTP expiry, retry limits, and terms acceptance.
- [ ] Create, edit, view, and delete a test listing; upload and serve a real image.
- [ ] Verify store creation, city selection, search, pagination, favorites, following, messaging, support, and moderation.
- [ ] Verify payment callback with a real provider test transaction; confirm a repeated callback never grants a second entitlement.
- [ ] Create a backup, restore it to a separate test path, and verify `PRAGMA integrity_check`.
- [ ] Confirm no secrets, test records, or local SQLite database are committed to the release archive.

## Known release boundaries

- The current supported production database is SQLite on one app instance with a persistent local disk. Do not run multiple independent replicas against a network-shared SQLite file.
- SQLAlchemy 2.x Engine/Connection is active, but most legacy route statements still use the SQL compatibility adapter; full ORM/service extraction is not complete.
- Alembic currently has a non-destructive baseline. The application's idempotent schema bootstrap remains authoritative for existing feature tables.
- PostgreSQL, object storage, and horizontal multi-replica operation are not certified. A Redis cache backend is implemented, but production Redis connectivity and multi-worker behavior still require host-level verification.
- Actual Liara deployment, provider credentials, and end-to-end production transactions require access to the user's hosting account and cannot be certified from this source archive alone.


## 1.0.2 release-candidate notes (2026-11-14)

- Seller dashboard language is product-first: sellers manage کالاهای فروشگاه, not classified ads.
- Seller dashboard layout, responsive cards, store status, product count, and next-step indicators were refined.
- SQLAlchemy legacy adapter now normalizes flat list parameters to a single positional parameter tuple, fixing the `/api/listings` runtime error while preserving `executemany`.
- Verify `/api/listings` and seller product management on the target Windows environment before production deployment.


## 1.0.3 – Redis cache infrastructure

- [x] Add a bounded, thread-safe local TTL cache for development and graceful fallback.
- [x] Add Redis backend with connection timeouts and fail-open behavior.
- [x] Wire cache through the Flask application factory and expose status in `/api/health`.
- [x] Move sitemap caching from per-module dictionary to the shared cache interface.
- [x] Document `REDIS_URL` and cache environment variables.
- [ ] Configure a managed Redis instance in the production host and verify `/api/health` reports `backend=redis`, `status=ok`.
- [ ] Run multi-worker integration and load tests against the production Redis instance.


### 1.0.3 compatibility hotfix

- [x] If `REDIS_URL` is configured but the optional `redis` Python package is missing, application startup now logs a warning and falls back to the bounded local cache instead of crashing.
- [x] The configured local fallback capacity is respected.
- [ ] Install `redis` from `requirements.txt` and verify a real Redis connection before expecting shared cache across workers.
