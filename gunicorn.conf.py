"""Production Gunicorn configuration for Liara/Linux deployments."""
from __future__ import annotations

import os


def _int(name: str, default: int, minimum: int = 1) -> int:
    try:
        value = int(os.environ.get(name, default))
    except (TypeError, ValueError):
        value = default
    return max(minimum, value)


bind = f"{os.environ.get('HOST', '0.0.0.0')}:{_int('PORT', 3000)}"
workers = _int("WEB_CONCURRENCY", 2)
threads = _int("GUNICORN_THREADS", 4)
worker_class = "gthread"
timeout = _int("GUNICORN_TIMEOUT", 60)
graceful_timeout = _int("GUNICORN_GRACEFUL_TIMEOUT", 30)
keepalive = _int("GUNICORN_KEEPALIVE", 5)
max_requests = _int("GUNICORN_MAX_REQUESTS", 1000)
max_requests_jitter = _int("GUNICORN_MAX_REQUESTS_JITTER", 100, minimum=0)
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info").lower()
preload_app = False

# The platform runs Linux. A shared-memory temp directory avoids writing
# Gunicorn worker heartbeat files into a potentially read-only application FS.
worker_tmp_dir = os.environ.get("GUNICORN_WORKER_TMP_DIR", "/dev/shm")
