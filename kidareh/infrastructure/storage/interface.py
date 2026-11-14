"""Storage contract for public listing images."""
from __future__ import annotations

from typing import Protocol


class ImageStorage(Protocol):
    def put(self, pathname: str, body: bytes, content_type: str) -> str:
        """Store bytes and return a public URL."""

    def delete(self, url_or_pathname: str) -> None:
        """Delete an image by URL or pathname."""
