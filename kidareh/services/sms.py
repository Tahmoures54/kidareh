
"""Kavenegar OTP delivery service for Kidareh.

Configuration:
    KAVENEGAR_API_KEY
    KAVENEGAR_VERIFY_TEMPLATE
    KAVENEGAR_TIMEOUT_SECONDS

Secrets are read at call time, allowing tests to modify os.environ
between calls without reloading this module.
"""

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request


logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 10
MIN_TIMEOUT_SECONDS = 2
MAX_TIMEOUT_SECONDS = 20


class SMSDeliveryError(RuntimeError):
    """Raised when Kavenegar cannot confirm OTP delivery."""

    def __init__(self, message, *, reason="unknown"):
        super().__init__(message)
        self.reason = reason


def get_template() -> str:
    """Resolve the Kavenegar verification template name."""

    explicit = (
        os.environ.get("KAVENEGAR_VERIFY_TEMPLATE")
        or os.environ.get("KAVENEGAR_TEMPLATE")
    )

    if explicit and explicit.strip():
        return explicit.strip()

    logger.warning(
        "Neither KAVENEGAR_VERIFY_TEMPLATE nor KAVENEGAR_TEMPLATE "
        "is configured; falling back to template='verify'. "
        "Configure an explicit template in production."
    )

    return "verify"


def _resolve_timeout() -> int:
    """Parse and clamp the HTTP timeout."""

    raw = os.environ.get(
        "KAVENEGAR_TIMEOUT_SECONDS",
        str(DEFAULT_TIMEOUT_SECONDS),
    )

    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise SMSDeliveryError(
            "KAVENEGAR_TIMEOUT_SECONDS must be an integer",
            reason="invalid_timeout_config",
        ) from None

    return max(
        MIN_TIMEOUT_SECONDS,
        min(MAX_TIMEOUT_SECONDS, value),
    )


def _validate_otp_inputs(phone, code) -> None:
    """Validate Iranian mobile number and six-digit OTP."""

    if (
        not isinstance(phone, str)
        or len(phone) != 11
        or not phone.startswith("09")
        or not phone.isdigit()
    ):
        raise SMSDeliveryError(
            "Invalid Iranian mobile number",
            reason="invalid_phone",
        )

    if (
        not isinstance(code, str)
        or len(code) != 6
        or not code.isdigit()
    ):
        raise SMSDeliveryError(
            "OTP must be six digits",
            reason="invalid_otp",
        )


def _extract_api_status(payload):
    """Safely extract Kavenegar's response status."""

    if not isinstance(payload, dict):
        return None

    return_data = payload.get("return")

    if not isinstance(return_data, dict):
        return None

    return return_data.get("status")


def send_otp(phone: str, code: str) -> bool:
    """Send a six-digit OTP using Kavenegar Verify Lookup API."""

    _validate_otp_inputs(phone, code)

    api_key = (
        os.environ.get("KAVENEGAR_API_KEY") or ""
    ).strip()

    if not api_key:
        raise SMSDeliveryError(
            "KAVENEGAR_API_KEY is not configured",
            reason="missing_api_key",
        )

    template = get_template()

    if not template:
        raise SMSDeliveryError(
            "Kavenegar verification template is not configured",
            reason="missing_template",
        )

    timeout = _resolve_timeout()

    # Quote the API key as a URL path component.
    encoded_key = urllib.parse.quote(api_key, safe="")

    url = (
        f"https://api.kavenegar.com/v1/"
        f"{encoded_key}/verify/lookup.json"
    )

    body = urllib.parse.urlencode({
        "receptor": phone,
        "token": code,
        "template": template,
    }).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=timeout,
        ) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw)

    except urllib.error.HTTPError as exc:
        status_code = getattr(exc, "code", None)
        body_status = None

        # Kavenegar may return a JSON body even for HTTP errors.
        try:
            error_body = exc.read().decode(
                "utf-8",
                errors="replace",
            )

            error_json = json.loads(error_body)
            body_status = _extract_api_status(error_json)

        except Exception:
            # Diagnostic parsing must not hide the HTTP error.
            pass

        raise SMSDeliveryError(
            (
                "Kavenegar HTTP error "
                f"(http={status_code}, api_status={body_status})"
            ),
            reason=f"http_{status_code}_api_{body_status}",
        ) from None

    except (
        urllib.error.URLError,
        TimeoutError,
        OSError,
    ) as exc:
        raise SMSDeliveryError(
            f"Kavenegar network error: {type(exc).__name__}",
            reason="network_error",
        ) from None

    except (
        ValueError,
        UnicodeDecodeError,
    ):
        raise SMSDeliveryError(
            "Kavenegar returned invalid JSON",
            reason="invalid_json",
        ) from None

    if not isinstance(payload, dict):
        raise SMSDeliveryError(
            "Kavenegar returned unexpected payload",
            reason="bad_payload",
        )

    api_status = _extract_api_status(payload)

    if api_status != 200:
        raise SMSDeliveryError(
            f"Kavenegar rejected OTP (api_status={api_status})",
            reason=f"api_status_{api_status}",
        )

    return True
