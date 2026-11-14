"""Tests for the Kavenegar SMS adapter.

Fixes applied compared to the earlier version:

* An autouse fixture clears all ``KAVENEGAR_*`` variables before each test,
  so a host that exports them (e.g. a developer machine or CI secret store)
  cannot silently change the template or the API key.
* The fail-closed test now asserts that ``urlopen`` is **not** called when the
  API key is missing, and the validation test does the same for invalid
  phone/OTP input.
* The ``FakeResponse`` and the ``urlopen`` stub are factored into helpers so
  each test only expresses what it actually cares about.
* A new test covers the case where ``urlopen`` raises a network exception:
  the adapter must translate it into ``SMSDeliveryError``.
"""
import json
import urllib.parse

import pytest

from kidareh.services import sms


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


@pytest.fixture(autouse=True)
def _clean_sms_env(monkeypatch):
    """Isolate every test from host-exported Kavenegar settings."""
    for name in (
        "KAVENEGAR_API_KEY",
        "KAVENEGAR_TEMPLATE",
        "KAVENEGAR_VERIFY_TEMPLATE",
    ):
        monkeypatch.delenv(name, raising=False)
    yield


def _stub_urlopen(monkeypatch, payload):
    """Replace ``urlopen`` with a recorder that returns ``payload``."""
    seen = {}

    def fake_urlopen(request, timeout):
        seen["url"] = request.full_url
        seen["method"] = request.get_method()
        seen["body"] = urllib.parse.parse_qs(request.data.decode())
        seen["timeout"] = timeout
        return FakeResponse(payload)

    monkeypatch.setattr(sms.urllib.request, "urlopen", fake_urlopen)
    return seen


def _forbid_urlopen(monkeypatch, reason):
    """Make ``urlopen`` fail the test if it is called at all."""
    def explode(*_args, **_kwargs):
        raise AssertionError(reason)

    monkeypatch.setattr(sms.urllib.request, "urlopen", explode)


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_kavenegar_uses_smart_mec_template_variable_and_form_post(monkeypatch):
    monkeypatch.setenv("KAVENEGAR_API_KEY", "test-key")
    monkeypatch.setenv("KAVENEGAR_TEMPLATE", "smartmechanicregister")
    seen = _stub_urlopen(monkeypatch, {"return": {"status": 200}})

    assert sms.send_otp("09123456789", "123456") is True

    assert "/verify/lookup.json" in seen["url"]
    assert seen["method"] == "POST"
    assert seen["body"] == {
        "receptor": ["09123456789"],
        "token": ["123456"],
        "template": ["smartmechanicregister"],
    }
    assert seen["timeout"] == 10


def test_kidareh_template_variable_has_precedence(monkeypatch):
    monkeypatch.setenv("KAVENEGAR_VERIFY_TEMPLATE", "kidareh-otp")
    monkeypatch.setenv("KAVENEGAR_TEMPLATE", "smartmechanicregister")
    assert sms.get_template() == "kidareh-otp"


def test_sms_fails_closed_without_api_key(monkeypatch):
    # The autouse fixture already cleared KAVENEGAR_API_KEY.
    _forbid_urlopen(
        monkeypatch,
        "urlopen must not be called when KAVENEGAR_API_KEY is missing",
    )

    with pytest.raises(sms.SMSDeliveryError):
        sms.send_otp("09123456789", "123456")


def test_sms_rejects_kavenegar_error_response(monkeypatch):
    monkeypatch.setenv("KAVENEGAR_API_KEY", "test-key")
    monkeypatch.setattr(
        sms.urllib.request,
        "urlopen",
        lambda *_a, **_k: FakeResponse({"return": {"status": 400}}),
    )

    with pytest.raises(sms.SMSDeliveryError):
        sms.send_otp("09123456789", "123456")


def test_sms_validates_phone_and_otp(monkeypatch):
    monkeypatch.setenv("KAVENEGAR_API_KEY", "test-key")
    _forbid_urlopen(
        monkeypatch,
        "urlopen must not be called for invalid phone or OTP input",
    )

    with pytest.raises(sms.SMSDeliveryError):
        sms.send_otp("123", "123456")
    with pytest.raises(sms.SMSDeliveryError):
        sms.send_otp("09123456789", "12")


def test_sms_wraps_network_errors_as_delivery_errors(monkeypatch):
    """A network failure must surface as ``SMSDeliveryError``, not leak OSError."""
    monkeypatch.setenv("KAVENEGAR_API_KEY", "test-key")

    def refuse(*_args, **_kwargs):
        raise OSError("network unreachable")

    monkeypatch.setattr(sms.urllib.request, "urlopen", refuse)

    with pytest.raises(sms.SMSDeliveryError):
        sms.send_otp("09123456789", "123456")