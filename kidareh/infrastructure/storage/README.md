# Storage infrastructure

## Runtime behavior

- **Vercel:** when `BLOB_READ_WRITE_TOKEN` is configured, new listing images are uploaded to the public Vercel Blob store under `listings/`. The database stores the returned absolute Blob URL. Upload failures return HTTP 503; the app never falls back to Vercel's ephemeral filesystem.
- **Local development and Liara:** without the Blob token, images continue to use the existing sharded `UPLOAD_FOLDER` filesystem path and `/static/uploads/` URL contract.
- **Deletion:** listing deletion recognizes public Vercel Blob URLs and uses the official SDK. Legacy `/static/uploads/` paths are still deleted from the local upload directory.

The official `vercel-blob` Python SDK is used through its synchronous API, suitable for the current synchronous Flask routes. Existing image validation is retained and limits files to 4 MiB, below Vercel Functions' 4.5 MB request-body limit.

## Provisioned resource

The public Blob store `kidareh-listing-images` is connected to the `kidareh` Vercel project in region `fra1`. Vercel manages `BLOB_READ_WRITE_TOKEN`; never commit or print its value.

## Existing images and rollback

Existing SQLite records and local image files are not migrated or deleted by this change. Existing `/static/uploads/` paths remain supported. Only newly uploaded images go to Blob. Keep old local files until a separately reviewed migration verifies counts and checksums.

If Blob is unavailable, new image uploads fail closed with a retryable 503 instead of being written to ephemeral Vercel storage. Listings without an image remain usable.
