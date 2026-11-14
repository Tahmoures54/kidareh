# Storage infrastructure

## Current runtime

Listing images are still written to the local `static/uploads/` directory through the existing upload flow. The local adapter remains the active implementation; do not remove or rewrite existing upload files until a migration has been completed and verified.

## Vercel Blob provisioning

A public Vercel Blob store named `kidareh-listing-images` has been created for the Vercel project `kidareh` in region `fra1`. Vercel automatically added `BLOB_READ_WRITE_TOKEN` to the project's Production, Preview, and Development environments. Secret values are managed by Vercel and must never be committed or printed.

**Provisioned does not mean active:** the Flask upload path has not yet been switched to Blob. Existing image URLs and files have not been migrated. The runtime adapter, URL persistence, deletion behavior, upload validation, and local-development fallback still require implementation and tests. Keep the local adapter as the fallback until those checks pass.

## Migration requirements

1. Add a Vercel Blob adapter behind the existing storage interface.
2. Preserve the existing public image URL contract or provide a backward-compatible resolver for old local paths.
3. Upload new images to Blob only when the token is configured; otherwise retain local storage for local development.
4. Keep image validation, size limits, safe generated names, and ownership checks in the Flask route.
5. Do not delete old local images during the first rollout. Migrate them with a separately verifiable, retryable script and compare counts/checksums before cleanup.
6. Test upload, retrieval, replacement, deletion, missing-token fallback, and failure rollback before enabling in Production.
