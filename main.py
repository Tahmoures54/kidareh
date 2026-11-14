"""Application entry point for local runs, Gunicorn, and Liara."""
import logging
import os
import sys
from pathlib import Path

# =========================================================
# 1. Load .env BEFORE any project import.
#    Project modules read os.environ at import time.
# =========================================================
_BASE_DIR = Path(__file__).resolve().parent
_ENV_FILE = _BASE_DIR / ".env"

try:
    from dotenv import load_dotenv
    if _ENV_FILE.exists():
        load_dotenv(_ENV_FILE, override=False)
        print(f"[BOOT] Loaded environment from {_ENV_FILE}")
    else:
        print(f"[BOOT] WARNING: no .env at {_ENV_FILE}", file=sys.stderr)
except ImportError:
    print(
        "[BOOT] WARNING: python-dotenv not installed; .env not loaded. "
        "Run: pip install python-dotenv",
        file=sys.stderr,
    )


# =========================================================
# 2. Route every log to stdout so all events reach the terminal.
# =========================================================
def _configure_logging() -> None:
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    root = logging.getLogger()
    root.setLevel(level)
    for h in root.handlers[:]:
        root.removeHandler(h)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        "[%(asctime)s] %(levelname)-7s %(name)-24s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    root.addHandler(handler)
    # Give Waitress / Gunicorn / Werkzeug their own handler so messages
    # reach stdout instead of getting swallowed by their defaults.
    for name in (
        "werkzeug", "waitress", "waitress.queue",
        "gunicorn", "gunicorn.error", "gunicorn.access",
    ):
        lg = logging.getLogger(name)
        lg.handlers = [handler]
        lg.propagate = False
        lg.setLevel(level)


_configure_logging()


# =========================================================
# 3. Now safe to import the app.
# =========================================================
import kidareh.core as core  # noqa: E402
from kidareh import create_app  # noqa: E402

BASE_DIR = core.BASE_DIR
INSTANCE_DIR = core.INSTANCE_DIR
DATABASE_PATH = core.DATABASE_PATH
UPLOAD_FOLDER = core.UPLOAD_FOLDER
MAX_IMAGE_BYTES = core.MAX_IMAGE_BYTES
CATEGORIES = core.CATEGORIES
DEMO_LISTINGS = core.DEMO_LISTINGS


def _env_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, default))
    except (TypeError, ValueError):
        return default


# Startup summary in the terminal
_secret = (os.environ.get("SECRET_KEY") or "").strip()
print(f"[BOOT] SECRET_KEY: {'set (' + str(len(_secret)) + ' chars)' if _secret else 'MISSING - using ephemeral key'}")
print(f"[BOOT] Database: {DATABASE_PATH}")
print(f"[BOOT] Upload folder: {UPLOAD_FOLDER}")
print(f"[BOOT] Log level: {os.environ.get('LOG_LEVEL', 'INFO').upper()}")

app = create_app()


def get_connection():
    core.DATABASE_PATH = Path(DATABASE_PATH)
    app.config["DATABASE_PATH"] = str(DATABASE_PATH)
    return core.get_connection()


def initialize_database():
    core.DATABASE_PATH = Path(DATABASE_PATH)
    app.config["DATABASE_PATH"] = str(DATABASE_PATH)
    app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
    # ORM reflection must happen after the legacy bootstrap and inside the
    # Flask app context so the application-scoped SQLAlchemy engine is used.
    with app.app_context():
        return core.initialize_database()


initialize_database()


def main() -> None:
    """Run the WSGI server.

    - Windows: Waitress (Gunicorn needs fcntl, Unix-only).
    - Linux/macOS (Liara): Gunicorn.
    """
    port = _env_int("PORT", 8000)
    host = os.environ.get("HOST", "0.0.0.0")

    if sys.platform == "win32":
        from waitress import serve

        threads = _env_int("THREADS", 16)
        connection_limit = _env_int("CONNECTION_LIMIT", 200)
        channel_timeout = _env_int("CHANNEL_TIMEOUT", 120)
        print(
            f"[BOOT] Starting Waitress on http://{host}:{port} "
            f"(threads={threads}, connection_limit={connection_limit})"
        )
        serve(
            app,
            host=host,
            port=port,
            threads=threads,
            connection_limit=connection_limit,
            channel_timeout=channel_timeout,
            ident="Kidareh",
        )
        return

    # Linux/macOS (Liara)
    print(f"[BOOT] Starting Gunicorn on http://{host}:{port}")
    os.execvp(
        "gunicorn",
        [
            "gunicorn",
            "--bind", f"{host}:{port}",
            "--workers", os.environ.get("WEB_CONCURRENCY", "2"),
            "--threads", str(_env_int("GUNICORN_THREADS", 4)),
            "--access-logfile", "-",
            "--error-logfile", "-",
            "--log-level", os.environ.get("LOG_LEVEL", "info").lower(),
            "--timeout", str(_env_int("GUNICORN_TIMEOUT", 60)),
            "--graceful-timeout", str(_env_int("GUNICORN_GRACEFUL_TIMEOUT", 30)),
            "--keep-alive", str(_env_int("GUNICORN_KEEPALIVE", 5)),
            "--max-requests", str(_env_int("GUNICORN_MAX_REQUESTS", 1000)),
            "--max-requests-jitter", str(_env_int("GUNICORN_MAX_REQUESTS_JITTER", 100)),
            "main:app",
        ],
    )


if __name__ == "__main__":
    main()