"""Vercel Blob adapter for public listing images."""
from __future__ import annotations

import os


def _client():
    if not os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip():
        raise RuntimeError("BLOB_READ_WRITE_TOKEN is not configured")
    from vercel.blob import sync as blob

    return blob


def upload_image(pathname: str, body: bytes, content_type: str) -> str:
    """Upload an image and return its public, cacheable Blob URL."""
    result = _client().put_blob(
        pathname,
        body,
        access="public",
        content_type=content_type,
        add_random_suffix=False,
        cache_control_max_age=31536000,
    )
    return result.url


def delete_image(url_or_pathname: str) -> None:
    """Delete a previously uploaded image from the connected Blob store."""
    _client().delete_blob(url_or_pathname)
