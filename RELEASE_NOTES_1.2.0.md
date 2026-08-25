# Kidareh 1.2.0 — Production Release Candidate

## Security hardening
- Browser authentication is cookie-only; legacy localStorage credentials are no longer accepted by the API.
- Production session cookie uses `__Host-kidareh_session`, `Secure`, `HttpOnly`, `SameSite=Strict`, and `Path=/`.
- State-changing cookie-authenticated requests require an allowed Origin in production.
- Socket.IO authenticates from the HTTP session cookie instead of a client-provided token.
- Support attachments are private, signature-validated, stored outside public static assets, and served only after authorization.
- Public health output is minimized; `/api/ready` performs a lightweight database readiness check.
- Refresh never returns the session token to JavaScript.

## Release gate
Run `npm ci` then `npm run release:verify`. A release is approved only when typecheck, lint, tests, and production build all pass.

## Deployment
Production requires strong `JWT_SECRET` and `COOKIE_SECRET` values, `APP_URL`, `ADMIN_PHONE`, `DATABASE_URL`, and real SMS/payment configuration. Never enable development OTP bypasses in production.
