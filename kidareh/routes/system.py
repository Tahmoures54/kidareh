"""Health endpoint for the web service and its local storage dependencies."""
import os
import tempfile
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError

from flask import Blueprint, current_app, jsonify

from ..core import get_connection

bp = Blueprint("system", __name__)

# A successful SQLite connection is not enough: an empty or incorrectly
# configured database can accept SELECT 1 while every business route fails.
_REQUIRED_TABLES = {"users", "stores", "listings"}


def _upload_probe_ok() -> bool:
    """Return True only when the upload folder accepts real writes.

    `os.access(..., W_OK)` reports the *mode bits*, which lie in several
    deployment scenarios: NFS with root-squash, a read-only bind mount, or a
    full filesystem. A tiny write-and-unlink probe is the definitive test and
    costs almost nothing on a health check that fires every few seconds.
    """
    try:
        upload_folder = Path(current_app.config["UPLOAD_FOLDER"])
        upload_folder.mkdir(parents=True, exist_ok=True)
        if not upload_folder.is_dir():
            return False
        # A unique probe avoids races between concurrent Gunicorn threads.
        descriptor, filename = tempfile.mkstemp(prefix=".kidareh-health-", dir=upload_folder)
        os.close(descriptor)
        Path(filename).unlink(missing_ok=True)
        return True
    except OSError:
        return False


@bp.get("/api/health")
def health():
    database_status = "unavailable"
    try:
        with get_connection() as connection:
            connection.execute("SELECT 1").fetchone()
            existing_tables = {
                row["name"]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
        missing_tables = _REQUIRED_TABLES - existing_tables
        database_status = "schema_incomplete" if missing_tables else "ok"
    except (SQLAlchemyError, OSError, RuntimeError):
        database_status = "unavailable"

    uploads_ok = _upload_probe_ok()
    cache = current_app.extensions.get("kidareh_cache")
    cache_status = cache.health() if cache else {"backend": "none", "status": "unavailable"}

    # Cache degradation is non-fatal: the application has a local fallback.
    ok = database_status == "ok" and uploads_ok
    return jsonify({
        "ok": ok,
        "service": "kidareh-pf",
        "database": database_status,
        "uploads": "writable" if uploads_ok else "unavailable",
        "cache": cache_status,
    }), (200 if ok else 503)