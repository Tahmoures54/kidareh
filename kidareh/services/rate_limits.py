"""Shared, database-backed rate limiting for write-heavy endpoints.

Limits live in SQLite rather than in process memory so every Gunicorn worker
and every instance sharing the database enforces the same budget. The ledger is
generic (``scope`` + hashed key) and is used far beyond OTP delivery: publishing
listings, opening conversations, sending chat messages and filing reports are all
cheap to spam and expensive to moderate at marketplace scale.
"""
import hashlib
import time

from flask import request
from flask import current_app

from ..core import get_connection


class RateLimitExceeded(Exception):
    """Raised when a caller has spent its budget for the current window."""

    def __init__(self, scope: str, retry_after: int, limit: int):
        super().__init__(scope)
        self.scope = scope
        self.retry_after = retry_after
        self.limit = limit


def ensure_tables() -> None:
    """Create the shared rate-limit ledger at start-up."""
    with get_connection() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS rate_limits (
                scope TEXT NOT NULL,
                key_hash TEXT NOT NULL,
                last_request_at REAL NOT NULL DEFAULT 0,
                window_started_at REAL NOT NULL DEFAULT 0,
                request_count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(scope, key_hash)
            )"""
        )
        # The periodic prune deletes rows whose window started long ago. Without
        # an index on ``window_started_at`` the DELETE scans the whole table
        # while holding the write lock, which becomes visible once the ledger
        # has accumulated millions of rows. The index keeps that operation O(k)
        # in the number of *expired* rows instead of O(N).
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_started_at)"
        )


# Every caller leaves a row behind, so the ledger is pruned. Deleting on a
# fraction of calls keeps it cheap.
PRUNE_INTERVAL_SECONDS = 300.0

# The longest scope window currently registered is one day (``support_ticket``:
# 10 per day). A row whose window started more than two days ago cannot affect
# any current decision — the window has long since closed and would be reset on
# the next request anyway. Keeping the retention **strictly longer** than the
# longest window is what guarantees pruning never silently resets a caller's
# budget; if a future scope needs a longer window, bump this constant
# accordingly (and prefer generous headroom over exactly matching the window).
MAX_RETENTION_SECONDS = 2 * 24 * 60 * 60.0

_last_prune = 0.0


def _prune(connection, now: float) -> None:
    """Drop rows whose window closed long before now."""
    global _last_prune
    if now - _last_prune < PRUNE_INTERVAL_SECONDS:
        return
    _last_prune = now
    connection.execute(
        "DELETE FROM rate_limits WHERE window_started_at < ?",
        (now - MAX_RETENTION_SECONDS,),
    )


def _hash(value: str) -> str:
    """Hash the key so raw phone numbers and IPs never reach the database."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def consume(scope: str, key: str, limit: int, window_seconds: int, cooldown_seconds: int = 0) -> int:
    """Spend one unit of ``scope``'s budget for ``key``.

    Returns the number of requests left in the window. Raises
    :class:`RateLimitExceeded` when the caller is out of budget, or when
    ``cooldown_seconds`` has not elapsed since its previous request.
    """
    if not isinstance(key, str) or not key:
        raise ValueError("rate-limit key must be a non-empty string")
    if not isinstance(limit, int) or limit < 1:
        raise ValueError("rate-limit limit must be a positive integer")
    if not isinstance(window_seconds, int) or window_seconds < 1:
        raise ValueError("rate-limit window_seconds must be a positive integer")

    now = time.time()
    key_hash = _hash(key)
    with get_connection() as connection:
        # BEGIN IMMEDIATE takes the write lock up front, which is what makes the
        # read-modify-write atomic across workers: starting deferred would let
        # two workers read the same count and both decide they are under budget.
        # Skipped when the caller already opened a transaction (that one is
        # equivalent, and nesting BEGIN raises).
        if not connection.in_transaction:
            connection.execute("BEGIN IMMEDIATE")
        _prune(connection, now)
        row = connection.execute(
            "SELECT last_request_at, window_started_at, request_count FROM rate_limits"
            " WHERE scope=? AND key_hash=?",
            (scope, key_hash),
        ).fetchone()
        last_request_at = row["last_request_at"] if row else 0.0
        window_started_at = row["window_started_at"] if row else now
        request_count = row["request_count"] if row else 0

        if cooldown_seconds and now - last_request_at < cooldown_seconds:
            raise RateLimitExceeded(
                scope, max(1, int(cooldown_seconds - (now - last_request_at))), limit
            )
        if now - window_started_at >= window_seconds:
            window_started_at, request_count = now, 0
        if request_count >= limit:
            raise RateLimitExceeded(
                scope, max(1, int(window_seconds - (now - window_started_at))), limit
            )
        request_count += 1
        connection.execute(
            """INSERT INTO rate_limits (scope, key_hash, last_request_at, window_started_at, request_count)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(scope, key_hash) DO UPDATE SET
                   last_request_at=excluded.last_request_at,
                   window_started_at=excluded.window_started_at,
                   request_count=excluded.request_count""",
            (scope, key_hash, now, window_started_at, request_count),
        )
    return max(0, limit - request_count)


def _identity(user, scope: str) -> str:
    """Build a stable key: the signed-in user when possible, else the client IP.

    Signed-in identity comes first: a shared NAT or mobile carrier IP would
    otherwise make one abusive caller consume everybody else's budget.
    """
    if user and user.get("id"):
        return f"{scope}:user:{user['id']}"
    ip = request.remote_addr or "unknown"
    return f"{scope}:ip:{ip}"


def enforce(scope: str, user, limit: int, window_seconds: int, cooldown_seconds: int = 0) -> None:
    """Raise :class:`RateLimitExceeded` when ``user`` has exhausted ``scope``."""
    consume(
        scope,
        _identity(user, scope),
        limit=limit,
        window_seconds=window_seconds,
        cooldown_seconds=cooldown_seconds,
    )


def error_response(error: RateLimitExceeded, message: str):
    """Render a 429 response carrying the standard machine-readable fields."""
    from flask import jsonify

    current_app.logger.info("Rate limit reached scope=%s retry_after=%ss", error.scope, error.retry_after)
    return (
        jsonify(
            {
                "error": error.scope,
                "message": message,
                "retry_after": error.retry_after,
            }
        ),
        429,
    )