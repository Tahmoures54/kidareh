# Kidareh Production Hardening — v1.2.0

This release supersedes v1.1.0 and completes the final security hardening pass.

## What was improved

- Unified the frontend data location under `src/data` and fixed the `@data` alias.
- Removed the stale `server/products.service.ts` duplicate that belonged to the frontend layer.
- Fixed server-side city-data imports to use the actual source tree.
- Normalized API URL handling so `VITE_API_URL=http://host` and `VITE_API_URL=http://host/api` both work without `/api/api` duplication.
- Hardened production environment validation for JWT, cookie signing, database, admin phone, and application URL.
- Disabled the development OTP shortcut by default and made it explicitly opt-in through `SHOW_OTP_IN_DEV`.
- Removed the hard-coded master admin phone fallback.
- Reduced the normal authentication cookie/JWT lifetime to 60 minutes; refresh remains available.
- Stopped exposing the JWT in the normal login response. Legacy exposure is available only with `LEGACY_EXPOSE_TOKEN=true`.
- Updated the badge-payment page to rely on secure HttpOnly cookies instead of reading the authentication cookie from JavaScript.
- Added image signature validation for JPEG/PNG/WebP uploads in addition to MIME filtering.
- Secured product reporting so the authenticated user ID is taken from the session rather than the request body.
- Added a consistent API 404 response with request IDs.
- Sanitized incoming request IDs before returning them as response headers.
- Added `npm run verify` and a lightweight project-structure verification script.

## Release note

The project is structurally hardened, but a complete TypeScript/build/test run still requires dependency installation in the target environment. The supplied environment timed out during `npm ci`, so no false claim of a successful production build is made.
