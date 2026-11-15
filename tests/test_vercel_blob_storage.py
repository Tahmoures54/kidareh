"""Regression tests for the Vercel Blob adapter and listing image lifecycle."""
import sys
import types

import pytest


class FakeBlobClient:
    def __init__(self):
        self.put_calls = []
        self.delete_calls = []

    def put_blob(self, pathname, body, **kwargs):
        self.put_calls.append((pathname, body, kwargs))
        return types.SimpleNamespace(
            url=f"https://{pathname.replace('/', '-')}.public.blob.vercel-storage.com"
        )

    def delete_blob(self, url):
        self.delete_calls.append(url)


def _install_fake_blob(monkeypatch):
    client = FakeBlobClient()
    blob_module = types.ModuleType("vercel.blob")
    blob_module.sync = client
    vercel_module = types.ModuleType("vercel")
    vercel_module.blob = blob_module
    monkeypatch.setitem(sys.modules, "vercel", vercel_module)
    monkeypatch.setitem(sys.modules, "vercel.blob", blob_module)
    return client


def test_vercel_listing_image_upload_uses_public_blob(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")
    client = _install_fake_blob(monkeypatch)

    from kidareh.core import store_uploaded_image

    url = store_uploaded_image(b"fake-png-bytes", ".png")

    assert url.startswith("https://")
    assert ".public.blob.vercel-storage.com" in url
    assert len(client.put_calls) == 1
    pathname, body, options = client.put_calls[0]
    assert pathname.startswith("listings/")
    assert pathname.endswith(".png")
    assert body == b"fake-png-bytes"
    assert options["access"] == "public"
    assert options["content_type"] == "image/png"
    assert options["add_random_suffix"] is False
    assert options["cache_control_max_age"] == 31536000


def test_vercel_listing_image_delete_uses_blob_url(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")
    client = _install_fake_blob(monkeypatch)
    url = "https://listings-example.public.blob.vercel-storage.com"

    from kidareh.core import delete_uploaded_image

    delete_uploaded_image(url)

    assert client.delete_calls == [url]


def test_vercel_listing_image_upload_fails_closed_without_blob_token(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)

    from kidareh.core import store_uploaded_image

    with pytest.raises(RuntimeError, match="BLOB_READ_WRITE_TOKEN"):
        store_uploaded_image(b"fake-image", ".jpg")


def test_listing_image_upload_rejects_unsupported_extension(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")

    from kidareh.core import store_uploaded_image

    with pytest.raises(ValueError, match="unsupported_image_extension"):
        store_uploaded_image(b"fake-image", ".gif")
