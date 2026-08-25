# Kidareh v1.2.0 — Final Release Status

## Completed
- Unified browser authentication around HttpOnly cookies.
- Removed frontend Authorization bearer-token handling.
- Production session cookie hardened with `__Host-`, Secure, HttpOnly, SameSite and Path=/.
- Added production Origin protection for cookie-authenticated state changes.
- Unified Socket.IO authentication with the browser session cookie.
- Removed session-token exposure from refresh responses.
- Added private support attachment storage and authorization-checked downloads.
- Added upload signature validation for supported support-file types.
- Prevented public static serving of support attachments.
- Reduced public health information and added `/api/ready`.
- Disabled authenticated GET caching in the generic API service to avoid cross-user stale data.
- Added ESLint flat configuration.
- Fixed TypeScript deprecation configuration.
- Fixed missing PWA screenshot reference.
- Added Windows-safe production startup script.
- Added `npm run release:verify` release gate.
- Updated version to 1.2.0 and added release notes.

## Verification performed in this environment
- Archive integrity: PASS
- Node syntax checks for release scripts: PASS
- Static security-pattern audit: PASS (server-to-server Payment bearer tokens are intentional)
- Required release files/configuration: PASS

## Environment limitation
`npm ci --ignore-scripts` was attempted twice but did not complete within the available execution window. Consequently, dependency-backed `typecheck`, `lint`, `test`, and production `build` could not be executed in this environment. The project contains `npm run release:verify` specifically to execute these gates on the deployment/build machine.

## Deployment gate
Do not publish until:
1. `npm ci`
2. `npm run release:verify`
3. production secrets/services are configured
4. payment callback and SMS OTP are tested in staging
5. `/api/health` and `/api/ready` return healthy/ready

The included ZIP is the hardened production package; it does not include `node_modules`, `dist`, or coverage artifacts.
