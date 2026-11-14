import pytest
from flask import Flask

from kidareh.routes import monetization


@pytest.mark.parametrize("payload", [[], "not-an-object", 42, None])
def test_create_order_rejects_non_object_json_without_server_error(
    monkeypatch, payload
):
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "test-secret"

    monkeypatch.setattr(
        monetization, "current_user", lambda: {"id": 123}
    )
    monkeypatch.setattr(monetization, "csrf_valid", lambda: True)

    with app.test_request_context(
        "/api/monetization/orders",
        method="POST",
        json=payload,
    ):
        response, status = monetization.create_order()

    assert status == 400
    assert response.get_json()["error"] == "invalid_package"
