import hashlib
import re
import secrets
import time
import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.exc import IntegrityError

from ..core import current_user, csrf_valid, get_connection
from ..data_catalog import is_city_name, normalize_location_name
from ..services.sms import send_otp


bp = Blueprint("auth", __name__, url_prefix="/api/auth")

PHONE_TRANSLATION = str.maketrans(
    "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
    "01234567890123456789",
)


def _json_payload():
    """Return a JSON object, never an arbitrary JSON value."""
    payload = request.get_json(silent=True)
    return payload if isinstance(payload, dict) else {}


def _text(value):
    """Return a string value or an empty string."""
    return value.strip() if isinstance(value, str) else ""


def ensure_tables() -> None:
    """Create OTP storage and rate-limit tables during application startup."""
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS otp_rate_limits (
                scope TEXT NOT NULL,
                key_hash TEXT NOT NULL,
                last_sent_at REAL NOT NULL DEFAULT 0,
                window_started_at REAL NOT NULL DEFAULT 0,
                request_count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(scope, key_hash)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_window
            ON otp_rate_limits(window_started_at)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS otp_challenges (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                otp_hash TEXT NOT NULL,
                expires_at REAL NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                terms_accepted_at TEXT NOT NULL,
                existing_user INTEGER NOT NULL DEFAULT 0,
                consumed_at REAL,
                created_at REAL NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone_created
            ON otp_challenges(phone, created_at)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_flows (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                state TEXT NOT NULL,
                challenge_id TEXT NOT NULL,
                terms_accepted_at TEXT NOT NULL,
                expires_at REAL NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_auth_flows_state_expiry
            ON auth_flows(state, expires_at)
            """
        )


def _normalize_phone(value):
    if not isinstance(value, str):
        return None

    phone = re.sub(
        r"[\s()\-]",
        "",
        value.translate(PHONE_TRANSLATION),
    )
    return phone if re.fullmatch(r"09\d{9}", phone) else None


def _send_kavenegar_otp(phone, code):
    """Compatibility wrapper retained for tests and existing callers."""
    return send_otp(phone, code)


def _check_otp_rate_limit(phone):
    """Enforce shared SQLite rate limits across sessions and app workers."""
    now = time.time()
    ip = request.remote_addr or "unknown"

    keys = {
        "phone": hashlib.sha256(phone.encode("utf-8")).hexdigest(),
        "ip": hashlib.sha256(ip.encode("utf-8")).hexdigest(),
    }

    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")

        # Rows older than two hours cannot affect the active one-hour window.
        connection.execute(
            "DELETE FROM otp_rate_limits WHERE window_started_at < ?",
            (now - 7200,),
        )

        rows = {}
        for scope, key_hash in keys.items():
            row = connection.execute(
                """
                SELECT last_sent_at, window_started_at, request_count
                FROM otp_rate_limits
                WHERE scope = ? AND key_hash = ?
                """,
                (scope, key_hash),
            ).fetchone()

            rows[scope] = (
                dict(row)
                if row
                else {
                    "last_sent_at": 0,
                    "window_started_at": now,
                    "request_count": 0,
                }
            )

        phone_row = rows["phone"]
        ip_row = rows["ip"]

        if now - phone_row["last_sent_at"] < 60:
            retry = max(
                1,
                int(60 - (now - phone_row["last_sent_at"])),
            )
            return False, "otp_cooldown", retry

        if now - phone_row["window_started_at"] >= 3600:
            phone_row.update(
                window_started_at=now,
                request_count=0,
            )

        if now - ip_row["window_started_at"] >= 3600:
            ip_row.update(
                window_started_at=now,
                request_count=0,
            )

        if phone_row["request_count"] >= 3:
            retry = max(
                1,
                int(3600 - (now - phone_row["window_started_at"])),
            )
            return False, "otp_hourly_limit", retry

        if ip_row["request_count"] >= 10:
            retry = max(
                1,
                int(3600 - (now - ip_row["window_started_at"])),
            )
            return False, "otp_ip_limit", retry

        for scope, key_hash in keys.items():
            row = rows[scope]
            connection.execute(
                """
                INSERT INTO otp_rate_limits (
                    scope,
                    key_hash,
                    last_sent_at,
                    window_started_at,
                    request_count
                )
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(scope, key_hash) DO UPDATE SET
                    last_sent_at = excluded.last_sent_at,
                    window_started_at = excluded.window_started_at,
                    request_count = excluded.request_count
                """,
                (
                    scope,
                    key_hash,
                    now,
                    row["window_started_at"],
                    row["request_count"] + 1,
                ),
            )

    return True, "", 0


@bp.get("/challenge")
def auth_challenge():
    left = secrets.randbelow(8) + 2
    right = secrets.randbelow(8) + 1

    session["math_challenge_answer"] = str(left + right)
    session["math_challenge_at"] = time.time()

    return jsonify({"question": f"{left} + {right} = ؟"})


@bp.post("/request-otp")
def request_otp():
    if not csrf_valid():
        return jsonify({
            "error": "csrf_failed",
            "message": "صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
        }), 400

    payload = _json_payload()

    phone = _normalize_phone(payload.get("phone"))
    requested_role = payload.get("role", "buyer")

    if not isinstance(requested_role, str) or requested_role not in {
        "buyer",
        "seller",
    }:
        return jsonify({
            "error": "invalid_role",
            "message": "نوع حساب معتبر نیست.",
        }), 400

    if not phone:
        return jsonify({
            "error": "invalid_phone",
            "message": "شماره همراه باید مانند 09123456789 باشد.",
        }), 400

    # The registration page communicates acceptance before the user requests
    # an SMS. The server must still validate the submitted value.
    if payload.get("terms_accepted") is not True:
        return jsonify({
            "error": "terms_required",
            "message": "برای ادامه، پذیرش قوانین و شرایط استفاده الزامی است.",
        }), 400

    answer_value = payload.get("captcha_answer", "")
    if isinstance(answer_value, str):
        answer = answer_value.translate(PHONE_TRANSLATION).strip()
    else:
        answer = ""

    challenge_answer = str(
        session.get("math_challenge_answer", "!")
    )
    challenge_at = session.get("math_challenge_at", 0)

    try:
        challenge_is_fresh = (
            isinstance(challenge_at, (int, float))
            and 0 <= time.time() - challenge_at <= 300
        )
    except (TypeError, ValueError):
        challenge_is_fresh = False

    if (
        not challenge_is_fresh
        or not secrets.compare_digest(answer, challenge_answer)
    ):
        return jsonify({
            "error": "captcha_failed",
            "message": "پاسخ محاسبه درست نیست؛ دوباره تلاش کنید.",
        }), 400

    session.pop("math_challenge_answer", None)
    session.pop("math_challenge_at", None)

    allowed, limit_error, retry_after = _check_otp_rate_limit(phone)

    if not allowed:
        if limit_error == "otp_cooldown":
            message = "برای ارسال دوباره کد کمی صبر کنید."
        else:
            message = (
                "سقف درخواست پیامک موقتاً پر شده است؛ "
                "بعداً دوباره تلاش کنید."
            )

        return jsonify({
            "error": limit_error,
            "message": message,
            "retry_after": retry_after,
        }), 429

    with get_connection() as connection:
        # Keep the challenge table compact.
        now = time.time()
        connection.execute(
            """
            DELETE FROM otp_challenges
            WHERE expires_at < ? OR consumed_at < ?
            """,
            (now - 3600, now - 86400),
        )

        exists = connection.execute(
            "SELECT 1 FROM users WHERE phone = ?",
            (phone,),
        ).fetchone() is not None

    code = f"{secrets.randbelow(1_000_000):06d}"

    try:
        _send_kavenegar_otp(phone, code)
    except Exception as exc:
        reason = getattr(exc, "reason", None) or type(exc).__name__
        detail = str(exc)[:200] if str(exc) else type(exc).__name__

        # Never expose credentials or a full gateway URL in logs.
        if "api.kavenegar.com" in detail:
            detail = reason

        current_app.logger.error(
            "Kavenegar OTP delivery failed reason=%s detail=%s",
            reason,
            detail,
        )

        return jsonify({
            "error": "sms_unavailable",
            "message": (
                "ارسال پیامک ممکن نشد. تنظیمات یا سرویس پیامک را بررسی کنید."
            ),
        }), 503

    challenge_id = uuid.uuid4().hex
    accepted_at = datetime.now(timezone.utc).isoformat()
    now = time.time()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO otp_challenges (
                id,
                phone,
                otp_hash,
                expires_at,
                attempts,
                terms_accepted_at,
                existing_user,
                created_at
            )
            VALUES (?, ?, ?, ?, 0, ?, ?, ?)
            """,
            (
                challenge_id,
                phone,
                generate_password_hash(code),
                now + 300,
                accepted_at,
                int(exists),
                now,
            ),
        )

    flow_id = uuid.uuid4().hex
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO auth_flows (
                id, phone, state, challenge_id, terms_accepted_at,
                expires_at, created_at, updated_at
            )
            VALUES (?, ?, 'otp_pending', ?, ?, ?, ?, ?)
            """,
            (
                flow_id, phone, challenge_id, accepted_at,
                now + 1800, now, now,
            ),
        )

    # The browser receives only a random flow handle. Phone, OTP state and
    # verification status remain in the database, not in the signed cookie.
    session.pop("otp_challenge_id", None)
    session.pop("verified_phone", None)
    session.pop("verified_terms_accepted_at", None)
    session["auth_flow_id"] = flow_id

    result = {
        "ok": True,
        "message": "کد تأیید ارسال شد.",
        "expires_in": 300,
        "resend_after": 60,
    }

    if current_app.testing and current_app.config.get("TESTING_OTP_CODE"):
        result["test_code"] = code

    return jsonify(result)


@bp.get("/flow")
def auth_flow_state():
    """Return the current server-side registration state without exposing OTP data."""
    user = current_user()
    if user:
        with get_connection() as connection:
            has_store = connection.execute(
                "SELECT 1 FROM stores WHERE owner_id = ?",
                (user["id"],),
            ).fetchone() is not None
        return jsonify({
            "state": "authenticated",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "phone": user["phone"],
                "role": user["role"],
            },
            "has_store": has_store,
        })

    flow_id = session.get("auth_flow_id")
    if not isinstance(flow_id, str) or not flow_id:
        return jsonify({"state": "none"})

    now = time.time()
    with get_connection() as connection:
        flow = connection.execute(
            """
            SELECT phone, state, expires_at
            FROM auth_flows
            WHERE id = ?
            """,
            (flow_id,),
        ).fetchone()

    if not flow or now > flow["expires_at"] or flow["state"] not in {
        "otp_pending", "profile_pending"
    }:
        session.pop("auth_flow_id", None)
        return jsonify({"state": "none"})

    phone = flow["phone"]
    masked = f"{phone[:2]}•••••{phone[-4:]}" if len(phone) == 11 else ""
    return jsonify({
        "state": flow["state"],
        "phone": masked,
        "expires_in": max(0, int(flow["expires_at"] - now)),
    })


@bp.post("/verify-otp")
def verify_otp():
    if not csrf_valid():
        return jsonify({
            "error": "csrf_failed",
            "message": "صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
        }), 400

    payload = _json_payload()
    raw_code = payload.get("code", "")
    code = (
        raw_code.translate(PHONE_TRANSLATION).strip()
        if isinstance(raw_code, str) else ""
    )

    if not re.fullmatch(r"\d{6}", code):
        return jsonify({
            "error": "otp_invalid",
            "message": "کد تأیید باید شش رقم باشد.",
        }), 400

    flow_id = session.get("auth_flow_id")
    if not isinstance(flow_id, str) or not flow_id:
        return jsonify({
            "error": "otp_expired",
            "message": "کد منقضی شده است؛ دوباره درخواست کد کنید.",
        }), 400

    now = time.time()
    user = None
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        flow = connection.execute(
            """
            SELECT phone, state, challenge_id, terms_accepted_at, expires_at
            FROM auth_flows WHERE id = ?
            """,
            (flow_id,),
        ).fetchone()

        if (
            not flow
            or flow["state"] != "otp_pending"
            or now > flow["expires_at"]
        ):
            if flow:
                connection.execute(
                    "UPDATE auth_flows SET state = 'expired', updated_at = ? WHERE id = ?",
                    (now, flow_id),
                )
            session.pop("auth_flow_id", None)
            return jsonify({
                "error": "otp_expired",
                "message": "کد منقضی شده است؛ دوباره درخواست کد کنید.",
            }), 400

        challenge = connection.execute(
            """
            SELECT id, otp_hash, expires_at, attempts
            FROM otp_challenges
            WHERE id = ? AND consumed_at IS NULL
            """,
            (flow["challenge_id"],),
        ).fetchone()

        if not challenge or now > challenge["expires_at"]:
            connection.execute(
                "UPDATE auth_flows SET state = 'expired', updated_at = ? WHERE id = ?",
                (now, flow_id),
            )
            session.pop("auth_flow_id", None)
            return jsonify({
                "error": "otp_expired",
                "message": "کد منقضی شده است؛ دوباره درخواست کد کنید.",
            }), 400

        if challenge["attempts"] >= 5:
            connection.execute(
                "UPDATE otp_challenges SET consumed_at = ? WHERE id = ?",
                (now, challenge["id"]),
            )
            connection.execute(
                "UPDATE auth_flows SET state = 'locked', updated_at = ? WHERE id = ?",
                (now, flow_id),
            )
            session.pop("auth_flow_id", None)
            return jsonify({
                "error": "otp_locked",
                "message": "تعداد تلاش‌ها تمام شد؛ کد تازه درخواست کنید.",
            }), 429

        if not check_password_hash(challenge["otp_hash"], code):
            attempts = challenge["attempts"] + 1
            connection.execute(
                "UPDATE otp_challenges SET attempts = ?, consumed_at = ? WHERE id = ?",
                (attempts, now if attempts >= 5 else None, challenge["id"]),
            )
            if attempts >= 5:
                connection.execute(
                    "UPDATE auth_flows SET state = 'locked', updated_at = ? WHERE id = ?",
                    (now, flow_id),
                )
                session.pop("auth_flow_id", None)
                return jsonify({
                    "error": "otp_locked",
                    "message": "تعداد تلاش‌ها تمام شد؛ کد تازه درخواست کنید.",
                }), 429
            return jsonify({
                "error": "otp_invalid",
                "message": "کد تأیید نادرست است.",
            }), 400

        connection.execute(
            "UPDATE otp_challenges SET consumed_at = ? WHERE id = ?",
            (now, challenge["id"]),
        )
        user = connection.execute(
            """
            SELECT id, name, phone, role, is_banned
            FROM users WHERE phone = ?
            """,
            (flow["phone"],),
        ).fetchone()

        if user and user["is_banned"]:
            connection.execute(
                "UPDATE auth_flows SET state = 'blocked', updated_at = ? WHERE id = ?",
                (now, flow_id),
            )
            session.pop("auth_flow_id", None)
            return jsonify({
                "error": "account_banned",
                "message": "حساب کاربری شما مسدود شده است.",
            }), 403

        if user:
            connection.execute(
                """
                UPDATE users SET
                    phone_verified_at = COALESCE(NULLIF(phone_verified_at, ''), ?),
                    terms_accepted_at = COALESCE(NULLIF(terms_accepted_at, ''), ?)
                WHERE id = ?
                """,
                (
                    datetime.now(timezone.utc).isoformat(),
                    flow["terms_accepted_at"] or "",
                    user["id"],
                ),
            )
            connection.execute(
                "UPDATE auth_flows SET state = 'completed', updated_at = ? WHERE id = ?",
                (now, flow_id),
            )
        else:
            # Verification state and verified phone stay server-side.
            connection.execute(
                """
                UPDATE auth_flows
                SET state = 'profile_pending', expires_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (now + 1800, now, flow_id),
            )

    if user:
        session.clear()
        session["user_id"] = user["id"]
        session["csrf_token"] = uuid.uuid4().hex
        return jsonify({
            "existing_user": True,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "phone": user["phone"],
                "role": user["role"],
            },
            "csrf_token": session["csrf_token"],
        })

    return jsonify({
        "existing_user": False,
        "phone_verified": True,
    })


@bp.post("/complete-profile")
def complete_profile():
    if not csrf_valid():
        return jsonify({
            "error": "csrf_failed",
            "message": "صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
        }), 400

    flow_id = session.get("auth_flow_id")
    if not isinstance(flow_id, str) or not flow_id:
        return jsonify({
            "error": "phone_verification_required",
            "message": "ابتدا شماره همراه را تأیید کنید.",
        }), 401

    payload = _json_payload()
    name = payload.get("name", "")
    role = payload.get("role", "buyer")

    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 80:
        return jsonify({
            "error": "invalid_name",
            "message": "نام و نام خانوادگی را وارد کنید.",
        }), 400

    if not isinstance(role, str) or role not in {"buyer", "seller"}:
        return jsonify({
            "error": "invalid_role",
            "message": "نوع حساب معتبر نیست.",
        }), 400

    raw_city = payload.get("city", "")
    profile_city = normalize_location_name(
        raw_city if isinstance(raw_city, str) else ""
    )
    if role == "buyer" and not is_city_name(profile_city):
        return jsonify({
            "error": "invalid_city",
            "message": "شهر محل سکونت را از فهرست شهرهای معتبر انتخاب کنید.",
        }), 400

    now = time.time()
    try:
        with get_connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            flow = connection.execute(
                """
                SELECT phone, terms_accepted_at, state, expires_at
                FROM auth_flows WHERE id = ?
                """,
                (flow_id,),
            ).fetchone()
            if (
                not flow
                or flow["state"] != "profile_pending"
                or now > flow["expires_at"]
            ):
                session.pop("auth_flow_id", None)
                return jsonify({
                    "error": "phone_verification_required",
                    "message": "اعتبار تأیید شماره پایان یافته است؛ دوباره کد بگیرید.",
                }), 401

            cursor = connection.execute(
                """
                INSERT INTO users (
                    name, phone, password_hash, role, phone_verified_at,
                    terms_accepted_at, city
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name.strip(),
                    flow["phone"],
                    generate_password_hash(secrets.token_urlsafe(32)),
                    role,
                    datetime.now(timezone.utc).isoformat(),
                    flow["terms_accepted_at"],
                    profile_city if role == "buyer" else "",
                ),
            )
            user_id = cursor.lastrowid
            connection.execute(
                "UPDATE auth_flows SET state = 'completed', updated_at = ? WHERE id = ?",
                (now, flow_id),
            )
    except IntegrityError:
        return jsonify({
            "error": "phone_exists",
            "message": (
                "این شماره قبلاً ثبت شده است؛ "
                "برای ورود، کد پیامکی را دوباره درخواست کنید."
            ),
        }), 409

    phone = flow["phone"]
    session.clear()
    session["user_id"] = user_id
    session["csrf_token"] = uuid.uuid4().hex

    return jsonify({
        "user": {
            "id": user_id,
            "name": name.strip(),
            "phone": phone,
            "role": role,
            "city": profile_city if role == "buyer" else "",
        },
        "store": None,
        "onboarding_required": role == "seller",
        "csrf_token": session["csrf_token"],
    })


@bp.post("/signup")
def auth_signup():
    """Reject legacy password signup."""
    if not csrf_valid():
        return jsonify({
            "error": "csrf_failed",
            "message": "صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
        }), 400

    return jsonify({
        "error": "otp_required",
        "message": (
            "ثبت‌نام فقط پس از تأیید کد پیامکی امکان‌پذیر است."
        ),
        "next": "/api/auth/request-otp",
    }), 410


@bp.post("/login")
def auth_login():
    """SMS OTP is the only supported login method."""
    if not csrf_valid():
        return jsonify({
            "error": "csrf_failed",
            "message": "صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
        }), 400

    return jsonify({
        "error": "sms_login_only",
        "message": (
            "ورود به کی‌داره فقط با کد یک‌بارمصرف پیامکی انجام می‌شود."
        ),
        "next": "/api/auth/request-otp",
    }), 410


@bp.post("/become-seller")
def become_seller():
    user = current_user()

    if not user:
        return jsonify({"error": "authentication_required"}), 401

    if not csrf_valid():
        return jsonify({"error": "csrf_failed"}), 400

    with get_connection() as connection:
        connection.execute(
            "UPDATE users SET role = 'seller' WHERE id = ?",
            (user["id"],),
        )

        has_store = connection.execute(
            "SELECT 1 FROM stores WHERE owner_id = ?",
            (user["id"],),
        ).fetchone() is not None

    user["role"] = "seller"

    return jsonify({
        "user": user,
        "has_store": has_store,
        "message": (
            "حساب شما به فروشنده تغییر کرد."
            if has_store
            else (
                "حساب شما به فروشنده تغییر کرد. "
                "برای افزودن کالا ابتدا فروشگاه خود را بسازید."
            )
        ),
        "next": None if has_store else "/api/stores",
    })


@bp.get("/me")
def auth_me():
    user = current_user()

    if not user:
        response = jsonify({"user": None})
    else:
        if not session.get("csrf_token"):
            session["csrf_token"] = uuid.uuid4().hex

        response = jsonify({
            "user": user,
            "csrf_token": session["csrf_token"],
        })

    # Authentication state is session-specific and must never be reused from
    # a browser, CDN, or shared intermediary cache.
    response.headers["Cache-Control"] = "private, no-store, max-age=0"
    response.headers["Vary"] = "Cookie"
    return response


@bp.post("/logout")
def auth_logout():
    if not csrf_valid():
        return jsonify({"error": "csrf_failed"}), 400

    session.clear()
    return jsonify({"ok": True})


@bp.post("/profile")
def update_profile():
    """Update basic profile data without changing verified identity."""
    user = current_user()

    if not user:
        return jsonify({
            "error": "authentication_required",
            "message": "ابتدا وارد حساب شوید.",
        }), 401

    if not csrf_valid():
        return jsonify({
            "error": "csrf_failed",
            "message": "صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
        }), 400

    payload = _json_payload()
    name = payload.get("name", "")

    if (
        not isinstance(name, str)
        or not name.strip()
        or len(name.strip()) > 80
    ):
        return jsonify({
            "error": "invalid_name",
            "message": "نام و نام خانوادگی را وارد کنید.",
        }), 400

    name = name.strip()

    with get_connection() as connection:
        connection.execute(
            "UPDATE users SET name = ? WHERE id = ?",
            (name, user["id"]),
        )

        row = connection.execute(
            """
            SELECT id, name, phone, role
            FROM users
            WHERE id = ?
            """,
            (user["id"],),
        ).fetchone()

    return jsonify({
        "ok": True,
        "user": dict(row),
    })
