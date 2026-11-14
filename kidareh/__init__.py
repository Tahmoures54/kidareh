"""Application factory for the Kidareh marketplace."""
import logging
import os
import secrets
import time
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request, send_from_directory

from .core import (
    CATEGORIES,
    DATABASE_PATH,
    MAX_IMAGE_BYTES,
    UPLOAD_FOLDER,
    close_request_connection,
)
from .data_catalog import CATEGORY_TREE, TRADE_GROUPS

logger = logging.getLogger(__name__)


def _make_csp_nonce() -> str:
    """Return the CSP nonce for the current request (generated once, reused).

    Every inline <script>, <style>, and JSON-LD block in base.html requests
    this nonce. Reusing it per request is what makes the CSP header valid
    across all inline tags on the page.
    """
    if not hasattr(g, "_kidareh_csp_nonce"):
        g._kidareh_csp_nonce = secrets.token_urlsafe(16)
    return g._kidareh_csp_nonce


def create_app(test_config=None):
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    is_production = (
        os.environ.get("FLASK_ENV", "").lower() == "production"
        or os.environ.get("ENV", "").lower() == "production"
        or os.environ.get("LIARA_APP_ID")
    )

    # Resolve the signing key from the environment first, then from an explicit
    # test configuration, and only then fall back to a generated value.
    secret_key = (os.environ.get("SECRET_KEY") or "").strip()
    if test_config:
        secret_key = str(test_config.get("SECRET_KEY") or secret_key or "")
    if not secret_key:
        if is_production:
            raise RuntimeError(
                "SECRET_KEY must be set to a strong random value in production. "
                "Do not use the development default."
            )
        secret_key = secrets.token_urlsafe(64)
        app.logger.warning(
            "SECRET_KEY is not configured; generated an ephemeral key. "
            "Sessions will be invalidated on restart. Set SECRET_KEY before deploying."
        )
    else:
        logger.info("SECRET_KEY loaded from environment (%d chars)", len(secret_key))

    if is_production and len(secret_key.encode("utf-8")) < 32:
        raise RuntimeError(
            "SECRET_KEY is too short for production; use at least 32 random bytes."
        )

    max_image_bytes = int(os.environ.get("MAX_IMAGE_BYTES", str(MAX_IMAGE_BYTES)))
    if max_image_bytes < 256 * 1024 or max_image_bytes > 20 * 1024 * 1024:
        raise RuntimeError("MAX_IMAGE_BYTES must be between 262144 and 20971520.")

    app.config.from_mapping(
        SECRET_KEY=secret_key,
        JSON_AS_ASCII=False,
        MAX_IMAGE_BYTES=max_image_bytes,
        MAX_CONTENT_LENGTH=max_image_bytes + 256 * 1024,
        DATABASE_PATH=str(DATABASE_PATH),
        UPLOAD_FOLDER=str(UPLOAD_FOLDER),
        SESSION_COOKIE_NAME=os.environ.get("SESSION_COOKIE_NAME", "session"),
        SESSION_COOKIE_HTTPONLY=(bool(is_production) or os.environ.get("SESSION_COOKIE_HTTPONLY", "1") == "1"),
        SESSION_COOKIE_SECURE=(bool(is_production) or os.environ.get("SESSION_COOKIE_SECURE", "0") == "1"),
        SESSION_COOKIE_SAMESITE=os.environ.get("SESSION_COOKIE_SAMESITE", "Lax"),
        PERMANENT_SESSION_LIFETIME=int(os.environ.get("PERMANENT_SESSION_LIFETIME", "1209600")),
        PREFERRED_URL_SCHEME="https" if is_production else "http",
        CSP_ENABLED=os.environ.get("CSP_ENABLED", "1") == "1",
        HSTS_ENABLED=os.environ.get("HSTS_ENABLED", "1") == "1",
        REDIS_URL=os.environ.get("REDIS_URL", "").strip(),
        CACHE_PREFIX=os.environ.get("CACHE_PREFIX", "kidareh:"),
        CACHE_DEFAULT_TTL=int(os.environ.get("CACHE_DEFAULT_TTL", "300")),
        CACHE_LOCAL_MAX_ITEMS=int(os.environ.get("CACHE_LOCAL_MAX_ITEMS", "2048")),
    )
    if test_config:
        app.config.update(test_config)

    # Shared cache: Redis in production when REDIS_URL is configured; bounded
    # in-process TTL cache otherwise. Redis failures degrade gracefully.
    from .infrastructure.cache import create_cache
    app.extensions["kidareh_cache"] = create_cache(
        app.config.get("REDIS_URL"),
        prefix=app.config.get("CACHE_PREFIX", "kidareh:"),
        max_items=app.config.get("CACHE_LOCAL_MAX_ITEMS", 2048),
        default_ttl=app.config.get("CACHE_DEFAULT_TTL", 300),
    )

    # Liara and other reverse-proxy hosts terminate TLS before the WSGI app.
    # Trust only the configured number of proxy hops; never enable this blindly
    # for a directly exposed development server.
    proxy_hops = int(os.environ.get("PROXY_FIX_HOPS", "1" if is_production else "0"))
    if proxy_hops < 0 or proxy_hops > 5:
        raise RuntimeError("PROXY_FIX_HOPS must be between 0 and 5.")
    if app.config["PERMANENT_SESSION_LIFETIME"] <= 0:
        raise RuntimeError("PERMANENT_SESSION_LIFETIME must be a positive number of seconds.")
    if proxy_hops > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=proxy_hops,
            x_proto=proxy_hops,
            x_host=proxy_hops,
            x_port=proxy_hops,
        )

    # One application-scoped SQLAlchemy 2.x engine/session factory is shared
    # by ORM repositories and the compatibility adapter used by legacy SQL.
    from .infrastructure.database.session import init_app as init_database_extension
    init_database_extension(app)

    # ---------------------------------------------------------
    # CSP nonce: exposed to every Jinja template as `csp_nonce()`
    # ---------------------------------------------------------
    @app.context_processor
    def inject_csp_nonce():
        return {"csp_nonce": _make_csp_nonce}

    # ---------------------------------------------------------
    # Request timing for the access log
    # ---------------------------------------------------------
    @app.before_request
    def mark_request_start():
        g._request_start = time.perf_counter()

    # ---------------------------------------------------------
    # Blueprints
    # ---------------------------------------------------------
    from .routes.pages import bp as pages_bp
    from .routes.auth import bp as auth_bp
    from .routes.stores import bp as stores_bp
    from .routes.listings import bp as listings_bp
    from .routes.system import bp as system_bp
    from .routes.monetization import bp as monetization_bp
    from .routes.moderation import bp as moderation_bp
    from .routes.communications import bp as communications_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(stores_bp)
    app.register_blueprint(listings_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(monetization_bp)
    app.register_blueprint(moderation_bp)
    app.register_blueprint(communications_bp)

    @app.get("/sw.js")
    def service_worker():
        """Expose the service worker at the origin root so it can control the PWA."""
        response = send_from_directory(
            app.static_folder,
            "sw.js",
            mimetype="application/javascript",
            max_age=0,
        )
        response.headers["Service-Worker-Allowed"] = "/"
        response.headers["Cache-Control"] = "no-cache"
        return response

    @app.teardown_appcontext
    def close_database(_error):
        """Release the request-scoped SQLAlchemy connection, if one was opened."""
        close_request_connection()

    # ---------------------------------------------------------
    # After-request handlers (executed in reverse order of registration)
    # ---------------------------------------------------------

    @app.after_request
    def security_headers(response):
        """Send baseline hardening headers with every response."""
        # CSP with a per-request nonce. Toggle with CSP_ENABLED=0 in .env if a
        # legacy template trips it.
        if app.config.get("CSP_ENABLED", os.environ.get("CSP_ENABLED", "1") == "1"):
            nonce = getattr(g, "_kidareh_csp_nonce", None) or _make_csp_nonce()
            csp = (
                "default-src 'self'; "
                f"script-src 'self' 'nonce-{nonce}'; "
                f"style-src 'self' 'nonce-{nonce}' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "
                "media-src 'self'; "
                "object-src 'none'; "
                "frame-ancestors 'none'; "
                "base-uri 'none'; "
                "form-action 'self';"
            )
            response.headers.setdefault("Content-Security-Policy", csp)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Frame-Options", "DENY")
        if is_production and app.config.get("HSTS_ENABLED", True) and request.scheme == "https":
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response

    @app.after_request
    def static_cache_headers(response):
        """Cache static assets: fonts and icons for a week, CSS/JS revalidated."""
        if request.path.startswith("/static/") and not request.path.startswith("/static/uploads/"):
            if request.path.endswith((".woff2", ".png", ".svg", ".ico")):
                response.headers["Cache-Control"] = "public, max-age=604800"
            elif request.path.endswith((".css", ".js", ".webmanifest", ".html")):
                response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
        return response

    @app.after_request
    def access_log(response):
        """Log every request to stdout: method, path, status, duration."""
        # Skip noisy static asset logs (images, fonts) but keep CSS/JS visible.
        if request.path.startswith("/static/") and not request.path.endswith((".css", ".js")):
            return response
        start = getattr(g, "_request_start", None)
        duration_ms = (time.perf_counter() - start) * 1000 if start else 0.0
        logger.info(
            "%s %s -> %d (%.1fms)",
            request.method, request.path, response.status_code, duration_ms,
        )
        return response

    @app.get("/static/uploads/<path:filename>")
    def uploaded_image(filename):
        """Serve only files from the configured uploads directory."""
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        if Path(filename).suffix.lower() not in allowed_extensions:
            return jsonify({"error": "not_found"}), 404
        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            filename,
            conditional=True,
            max_age=86400,
        )

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify({"error": "request_too_large", "message": "حجم درخواست بیش از حد مجاز است."}), 413

    @app.errorhandler(404)
    def not_found(_error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "not_found"}), 404
        return render_template(
            "index.html",
            categories=CATEGORIES,
            category_tree=CATEGORY_TREE,
            trade_groups=TRADE_GROUPS,
        ), 404

    return app