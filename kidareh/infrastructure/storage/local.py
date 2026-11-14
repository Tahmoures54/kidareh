"""Filesystem image storage for local development and persistent Liara disks."""
from __future__ import annotations

from pathlib import Path


def save_image(root: Path, relative_path: str, body: bytes) -> Path:
    """Write image bytes below root, rejecting traversal and absolute paths."""
    root = Path(root).expanduser().resolve()
    relative = Path(relative_path)
    if relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
        raise ValueError("invalid_image_path")
    target = (root / relative).resolve()
    target.relative_to(root)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(body)
    return target


def delete_image(root: Path, *parts: str) -> None:
    """Delete a safe path below the upload root; missing files are harmless."""
    root = Path(root).expanduser().resolve()
    if not parts or len(parts) > 2 or any(part in {"", ".", ".."} or "\\" in part for part in parts):
        return
    target = root.joinpath(*parts).resolve()
    target.relative_to(root)
    if target.is_file():
        target.unlink()
