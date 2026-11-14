"""Integration coverage for listing filters, notifications, sellers, admin and payments.

This module is hardened compared to the original version:

- ``app.config.update(TESTING=True, ...)`` leaked the flag across tests; we
  now use ``monkeypatch.setitem`` so the previous value is restored on teardown.
- ``DATABASE_PATH`` was only patched on ``main``; ``kidareh.core`` and
  ``kidareh.schema_init`` could still reference the real path. ``_patch_db_path``
  patches every module that may own the constant.
- Inserts relied on the surrounding ``with get_connection()`` to commit; we now
  commit explicitly so the test does not depend on context-manager behaviour.
- Tests that used ``app_module.app.test_client()`` directly now go through
  ``setup_empty_database`` so they cannot accidentally touch the real DB.
- Env vars are cleared in ``setup_empty_database``. Production hosts such as
  Liara and Vercel must not seed showcase records; local tests retain the
  development fixtures used by listing-flow coverage.
"""
import datetime as dt
import importlib

import main as app_module


VERIFIED_AT = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc).isoformat()
CSRF_TOKEN = "test-token"

_ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
    "VERCEL",
    "KIDAREH_SEED_DEMO_DATA",
    "KAVENEGAR_API_KEY",
    "ADMIN_PHONE",
    "ZIBAL_MERCHANT",
    "ZIBAL_MERCHANT_ID",
    "SECRET_KEY",
)


# ---------------------------------------------------------------------------
# infrastructure helpers (not collected by pytest)
# ---------------------------------------------------------------------------
def _patch_db_path(monkeypatch, db_path):
    """Point every module that may own a ``DATABASE_PATH`` reference at the test DB."""
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


def _seed_user(connection, phone, role="buyer", password_hash="test-hash"):
    return connection.execute(
        "INSERT INTO users (name, phone, password_hash, role, phone_verified_at)"
        " VALUES (?, ?, ?, ?, ?)",
        (f"user-{phone}", phone, password_hash, role, VERIFIED_AT),
    ).lastrowid


def _seed_store(connection, owner_id, name="ویترین آزمایش", city="تبریز", description="فروشگاه تست"):
    return connection.execute(
        "INSERT INTO stores (owner_id, name, city, description) VALUES (?, ?, ?, ?)",
        (owner_id, name, city, description),
    ).lastrowid


def _login(client, user_id):
    with client.session_transaction() as browser_session:
        browser_session["user_id"] = user_id
        browser_session["csrf_token"] = CSRF_TOKEN
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN


def _logout(client):
    with client.session_transaction() as browser_session:
        browser_session.clear()
    client.environ_base.pop("HTTP_X_CSRF_TOKEN", None)


def setup_empty_database(monkeypatch, tmp_path, filename="test-kidareh.sqlite3"):
    """Fresh DB, no seed users/stores. For tests that only need the schema.

    Env vars are cleared so production-only seed guards do not interfere with
    local fixture-based tests.
    """
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)

    database = tmp_path / filename
    _patch_db_path(monkeypatch, database)
    monkeypatch.setitem(app_module.app.config, "TESTING", True)
    monkeypatch.setitem(app_module.app.config, "TESTING_OTP_CODE", False)
    app_module.initialize_database()
    return app_module.app.test_client()


def setup_test_database(monkeypatch, tmp_path, filename="test-kidareh.sqlite3"):
    """Fresh DB seeded with one seller user + one store, logged in as that seller."""
    client = setup_empty_database(monkeypatch, tmp_path, filename=filename)
    with app_module.get_connection() as connection:
        seller_id = _seed_user(connection, "09120000000", role="seller")
        _seed_store(connection, seller_id)
        connection.commit()
    _login(client, seller_id)
    return client


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_homepage_renders_persian_marketplace(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/")
    assert response.status_code == 200
    assert "کی‌داره".encode() in response.data
    assert b"listingGrid" in response.data


def test_health_endpoint(monkeypatch, tmp_path):
    client = setup_empty_database(monkeypatch, tmp_path)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["ok"] is True
    assert response.get_json()["cache"]["backend"] == "local"
    assert response.get_json()["cache"]["status"] == "ok"


def test_listing_api_returns_seed_data(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/api/listings")
    data = response.get_json()
    assert response.status_code == 200
    assert data["count"] >= 1
    assert any(item["title"] == "گوشی سامسونگ تمیز و سالم" for item in data["items"])


def test_listing_api_filters_by_category(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/api/listings?category=digital")
    data = response.get_json()
    assert response.status_code == 200
    assert data["items"]
    assert all(item["category"] == "digital" for item in data["items"])


def test_listing_api_search_is_applied(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/api/listings?q=گوشی")
    data = response.get_json()
    assert response.status_code == 200
    assert data["count"] == 1
    assert "گوشی" in data["items"][0]["title"]


def test_listing_detail_returns_matching_item(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    listing = client.get("/api/listings").get_json()["items"][0]

    response = client.get(f"/api/listings/{listing['id']}")

    assert response.status_code == 200
    assert response.get_json()["item"]["id"] == listing["id"]
    assert response.get_json()["item"]["title"] == listing["title"]


def test_listing_detail_returns_json_404_for_missing_item(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)

    response = client.get("/api/listings/999999")

    assert response.status_code == 404
    assert response.get_json() == {"error": "listing_not_found"}


def test_create_listing_returns_created_item(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    payload = {
        "title": "میز مطالعه",
        "category": "home",
        "city": "تبریز",
        "price": 1250000,
        "description": "میز سالم و تمیز",
        "availability_status": "in_stock",
    }

    response = client.post("/api/listings", json=payload)

    assert response.status_code == 201
    item = response.get_json()["item"]
    assert item["title"] == payload["title"]
    assert item["category"] == payload["category"]
    assert item["price"] == payload["price"]
    assert item["availability_status"] == "in_stock"
    assert item["price_updated_at"]
    assert item["featured"] is False


def test_create_listing_rejects_invalid_category(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    payload = {
        "title": "آگهی نامعتبر",
        "category": "unknown",
        "city": "تهران",
        "price": 1000,
        "description": "",
    }

    response = client.post("/api/listings", json=payload)

    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_category"


def test_create_listing_rejects_negative_price(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    payload = {
        "title": "آگهی تست",
        "category": "home",
        "city": "تهران",
        "price": -10,
        "description": "",
    }

    response = client.post("/api/listings", json=payload)

    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_price"


def test_create_listing_with_valid_png_upload(monkeypatch, tmp_path):
    from io import BytesIO

    client = setup_test_database(monkeypatch, tmp_path)
    upload_folder = tmp_path / "uploads"
    monkeypatch.setattr(app_module, "UPLOAD_FOLDER", upload_folder)
    app_module.app.config["UPLOAD_FOLDER"] = str(upload_folder)
    png = b"\x89PNG\r\n\x1a\n" + b"test-image-data"
    response = client.post(
        "/api/listings",
        data={
            "title": "صندلی سالم",
            "category": "home",
            "city": "تبریز",
            "price": "850000",
            "description": "بازدید حضوری",
            "image": (BytesIO(png), "my-photo.png"),
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    item = response.get_json()["item"]
    assert item["image_path"].startswith("/static/uploads/")
    saved_file = upload_folder / item["image_path"].replace("/static/uploads/", "", 1)
    assert saved_file.read_bytes() == png


def test_create_listing_rejects_non_image_upload(monkeypatch, tmp_path):
    from io import BytesIO

    client = setup_test_database(monkeypatch, tmp_path)
    response = client.post(
        "/api/listings",
        data={
            "title": "آگهی با فایل نامعتبر",
            "category": "home",
            "city": "تهران",
            "price": "1000",
            "description": "",
            "image": (BytesIO(b"this is not an image"), "photo.jpg"),
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_image"


def test_create_listing_without_image_keeps_empty_image_path(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.post(
        "/api/listings",
        json={"title": "آگهی ساده", "category": "home", "city": "تهران", "price": 0},
    )
    assert response.status_code == 201
    assert response.get_json()["item"]["image_path"] == ""


def test_create_listing_normalizes_persian_seller_phone(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.post(
        "/api/listings",
        json={
            "title": "میز برای بازدید حضوری",
            "category": "home",
            "city": "تبریز",
            "price": 900000,
            "seller_phone": "۰۹۱۲ ۳۴۵ ۶۷۸۹",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["item"]["seller_phone"] == "09123456789"


def test_create_listing_rejects_invalid_seller_phone(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.post(
        "/api/listings",
        json={
            "title": "آگهی با شماره نامعتبر",
            "category": "home",
            "city": "تهران",
            "price": 1000,
            "seller_phone": "12345",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_seller_phone"


def test_listing_detail_includes_seller_phone(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    created = client.post(
        "/api/listings",
        json={
            "title": "میز با امکان بازدید",
            "category": "home",
            "city": "تبریز",
            "price": 900000,
            "seller_phone": "09123456789",
        },
    )
    listing_id = created.get_json()["item"]["id"]

    response = client.get(f"/api/listings/{listing_id}")

    assert response.status_code == 200
    assert response.get_json()["item"]["seller_phone"] == "09123456789"


def test_listing_creation_requires_login_and_csrf(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    _logout(client)
    response = client.post(
        "/api/listings",
        json={"title": "آگهی", "category": "home", "city": "تهران", "price": 0},
    )
    assert response.status_code == 401
    assert response.get_json()["error"] == "authentication_required"


def test_legacy_signup_cannot_bypass_phone_verification(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    _logout(client)
    with client.session_transaction() as browser_session:
        browser_session["csrf_token"] = CSRF_TOKEN
    response = client.post(
        "/api/auth/signup",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": "کاربر جدید", "phone": "۰۹۱۲۳۴۵۶۷۸۹", "password": "secure-pass-123"},
    )
    assert response.status_code == 410
    assert response.get_json()["error"] == "otp_required"
    with app_module.get_connection() as connection:
        row = connection.execute(
            "SELECT id FROM users WHERE phone = ?", ("09123456789",)
        ).fetchone()
    assert row is None


def test_only_owner_can_edit_or_delete_listing(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    created = client.post(
        "/api/listings",
        json={"title": "میز خودم", "category": "home", "city": "تبریز", "price": 1000},
    )
    listing_id = created.get_json()["item"]["id"]
    with app_module.get_connection() as connection:
        other_user_id = _seed_user(connection, "09120000001", password_hash="test-hash")
        connection.commit()
    _login(client, other_user_id)
    denied = client.patch(
        f"/api/listings/{listing_id}",
        json={"title": "تغییر غیرمجاز"},
    )
    assert denied.status_code == 403
    denied_delete = client.delete(f"/api/listings/{listing_id}")
    assert denied_delete.status_code == 403

    # Switch back to the original seller and verify edit/delete succeed.
    with app_module.get_connection() as connection:
        seller_id = connection.execute(
            "SELECT owner_id FROM listings WHERE id = ?", (listing_id,)
        ).fetchone()[0]
    _login(client, seller_id)
    updated = client.patch(
        f"/api/listings/{listing_id}",
        json={"title": "میز ویرایش‌شده"},
    )
    assert updated.status_code == 200
    assert updated.get_json()["item"]["title"] == "میز ویرایش‌شده"
    deleted = client.delete(f"/api/listings/{listing_id}")
    assert deleted.status_code == 200


def test_guest_can_browse_storefronts_and_store_products(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    _logout(client)
    stores = client.get("/api/stores")
    assert stores.status_code == 200
    assert stores.get_json()["items"]
    store_id = stores.get_json()["items"][0]["id"]
    detail = client.get(f"/api/stores/{store_id}")
    assert detail.status_code == 200
    assert "store" in detail.get_json()
    assert "items" in detail.get_json()


def test_following_store_requires_login_and_csrf(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    store_id = client.get("/api/stores").get_json()["items"][0]["id"]
    _logout(client)
    denied = client.post(f"/api/stores/{store_id}/follow")
    assert denied.status_code == 401

    with client.session_transaction() as browser_session:
        browser_session["user_id"] = 1
        browser_session["csrf_token"] = CSRF_TOKEN
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN
    followed = client.post(f"/api/stores/{store_id}/follow", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert followed.status_code == 200
    assert followed.get_json()["following"] is True
    unfollowed = client.post(f"/api/stores/{store_id}/follow", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert unfollowed.status_code == 200
    assert unfollowed.get_json()["following"] is False


def test_saved_product_requires_login(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    product_id = client.get("/api/listings").get_json()["items"][0]["id"]
    _logout(client)
    response = client.post(f"/api/listings/{product_id}/save")
    assert response.status_code == 401


def test_buyer_cannot_create_store(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.execute("UPDATE users SET role = 'buyer' WHERE phone = ?", ("09120000000",))
        connection.commit()
    response = client.post(
        "/api/stores",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": "ویترین خریدار", "city": "تهران", "description": ""},
    )
    assert response.status_code == 403
    assert response.get_json()["error"] == "seller_account_required"


def test_buyer_cannot_create_listing_or_access_seller_analytics(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.execute("UPDATE users SET role = 'buyer' WHERE phone = ?", ("09120000000",))
        connection.commit()

    created = client.post(
        "/api/listings",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"title": "آگهی خریدار", "category": "home", "city": "تبریز", "price": 1000},
    )
    assert created.status_code == 403
    assert created.get_json()["error"] == "seller_account_required"

    stats = client.get("/api/seller/stats")
    assert stats.status_code == 403
    assert stats.get_json()["error"] == "seller_account_required"


def test_buyer_role_cannot_manage_previously_owned_inventory_or_store(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    created = client.post(
        "/api/listings",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"title": "کالای فروشنده", "category": "home", "city": "تبریز", "price": 1000},
    )
    assert created.status_code == 201
    listing_id = created.get_json()["item"]["id"]
    store_id = client.get("/api/my/store").get_json()["item"]["id"]

    with app_module.get_connection() as connection:
        connection.execute("UPDATE users SET role = 'buyer' WHERE phone = ?", ("09120000000",))
        connection.commit()

    listing_edit = client.patch(
        f"/api/listings/{listing_id}",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"title": "تغییر پس از تبدیل نقش"},
    )
    assert listing_edit.status_code == 403
    assert listing_edit.get_json()["error"] == "seller_account_required"

    store_edit = client.patch(
        f"/api/stores/{store_id}",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": "تغییر پس از تبدیل نقش"},
    )
    assert store_edit.status_code == 403
    assert store_edit.get_json()["error"] == "seller_account_required"


def test_buyer_can_switch_to_seller_when_ready_to_open_storefront(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.execute("UPDATE users SET role = 'buyer' WHERE phone = ?", ("09120000000",))
        connection.commit()
    response = client.post("/api/auth/become-seller", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert response.status_code == 200
    assert response.get_json()["user"]["role"] == "seller"


def test_store_owner_can_update_store_details(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    store_id = client.get("/api/my/store").get_json()["item"]["id"]
    response = client.patch(
        f"/api/stores/{store_id}",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": "ویترین تازه", "city": "تهران", "description": "توضیح جدید"},
    )
    assert response.status_code == 200
    assert response.get_json()["item"]["name"] == "ویترین تازه"
    assert response.get_json()["item"]["city"] == "تهران"


def test_non_owner_cannot_update_store_details(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        other_id = _seed_user(connection, "09120000002", role="seller")
        connection.commit()
    _login(client, other_id)
    response = client.patch(
        "/api/stores/1",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": "تغییر غیرمجاز"},
    )
    assert response.status_code == 403
    assert response.get_json()["error"] == "store_forbidden"


def test_store_update_rejects_invalid_name(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    store_id = client.get("/api/my/store").get_json()["item"]["id"]
    response = client.patch(
        f"/api/stores/{store_id}",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": " "},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_store_name"


def test_saved_products_api_toggles_and_lists_saved_item(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    product_id = client.get("/api/listings").get_json()["items"][0]["id"]
    saved = client.post(f"/api/listings/{product_id}/save", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert saved.status_code == 200
    assert saved.get_json()["saved"] is True
    listing = client.get("/api/products/saved")
    assert listing.status_code == 200
    assert any(item["id"] == product_id for item in listing.get_json()["items"])
    removed = client.post(f"/api/listings/{product_id}/save", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert removed.status_code == 200
    assert removed.get_json()["saved"] is False
    assert all(
        item["id"] != product_id
        for item in client.get("/api/products/saved").get_json()["items"]
    )


def test_following_stores_api_lists_followed_store(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    store_id = client.get("/api/my/store").get_json()["item"]["id"]
    followed = client.post(f"/api/stores/{store_id}/follow", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert followed.status_code == 200
    assert followed.get_json()["following"] is True
    response = client.get("/api/stores/following")
    assert response.status_code == 200
    assert any(item["id"] == store_id for item in response.get_json()["items"])


def _request_test_otp(client, phone, monkeypatch):
    import kidareh.routes.auth as auth_routes

    monkeypatch.setattr(auth_routes, "_send_kavenegar_otp", lambda _phone, _code: True)
    monkeypatch.setitem(app_module.app.config, "TESTING_OTP_CODE", True)
    challenge = client.get("/api/auth/challenge").get_json()["question"]
    left, right = [
        int(value.strip())
        for value in challenge.replace("= ؟", "").strip().split("+")
    ]
    response = client.post(
        "/api/auth/request-otp",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={
            "phone": phone,
            "captcha_answer": str(left + right),
            "terms_accepted": True,
        },
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["test_code"]


def test_phone_first_signup_records_terms_and_verifies_phone(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    code = _request_test_otp(client, "۰۹۱۲۳۴۵۶۷۸۹", monkeypatch)
    verified = client.post(
        "/api/auth/verify-otp", headers={"X-CSRF-Token": CSRF_TOKEN}, json={"code": code}
    )
    assert verified.status_code == 200
    assert verified.get_json()["existing_user"] is False
    created = client.post(
        "/api/auth/complete-profile",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": "خریدار آزمایشی", "role": "buyer", "city": "تهران"},
    )
    assert created.status_code == 200
    assert created.get_json()["user"]["phone"] == "09123456789"
    with app_module.get_connection() as connection:
        row = connection.execute(
            "SELECT phone_verified_at, terms_accepted_at FROM users WHERE phone = ?",
            ("09123456789",),
        ).fetchone()
    assert row["phone_verified_at"]
    assert row["terms_accepted_at"]


def test_phone_first_seller_signup_creates_store_and_full_journey(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    code = _request_test_otp(client, "09123334444", monkeypatch)
    verified = client.post(
        "/api/auth/verify-otp", headers={"X-CSRF-Token": CSRF_TOKEN}, json={"code": code}
    )
    assert verified.status_code == 200 and not verified.get_json()["existing_user"]
    created = client.post(
        "/api/auth/complete-profile",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={
            "name": "فروشنده آزمایشی",
            "role": "seller",
            "store_name": "فروشگاه آزمون",
            "store_category": "لوازم خانه",
            "store_city": "تبریز",
            "contact_name": "مسئول آزمون",
            "store_address": "تبریز، خیابان نمونه",
            "store_hours": "۹ تا ۱۸",
            "social_url": "@kidareh_test",
            "store_description": "فروشگاه تست مسیر کامل",
            "in_person": True,
        },
    )
    assert created.status_code == 200, created.get_json()
    store = created.get_json()["store"]
    assert store["name"] == "فروشگاه آزمون"
    assert store["address"] == "" and store["hours"] == ""
    new_csrf = created.get_json()["csrf_token"]
    client.environ_base["HTTP_X_CSRF_TOKEN"] = new_csrf
    product = client.post(
        "/api/listings",
        headers={"X-CSRF-Token": new_csrf},
        json={
            "title": "کالای مسیر کامل",
            "category": "home",
            "city": "تبریز",
            "price": 125000,
            "description": "آزمون ذخیره و حذف",
        },
    )
    assert product.status_code == 201, product.get_json()
    product_id = product.get_json()["item"]["id"]
    assert product.get_json()["item"]["store_id"] == store["id"]
    edited = client.patch(
        f"/api/listings/{product_id}",
        headers={"X-CSRF-Token": new_csrf},
        json={"title": "کالای ویرایش‌شده"},
    )
    assert edited.status_code == 200
    assert edited.get_json()["item"]["title"] == "کالای ویرایش‌شده"
    saved = client.post(
        f"/api/listings/{product_id}/save", headers={"X-CSRF-Token": new_csrf}
    )
    assert saved.status_code == 200 and saved.get_json()["saved"] is True
    assert any(
        item["id"] == product_id
        for item in client.get("/api/products/saved").get_json()["items"]
    )
    other_store = next(
        item
        for item in client.get("/api/stores").get_json()["items"]
        if item["id"] != store["id"]
    )
    followed = client.post(
        f"/api/stores/{other_store['id']}/follow", headers={"X-CSRF-Token": new_csrf}
    )
    assert followed.status_code == 200 and followed.get_json()["following"] is True
    assert any(
        item["id"] == other_store["id"]
        for item in client.get("/api/stores/following").get_json()["items"]
    )
    deleted = client.delete(
        f"/api/listings/{product_id}", headers={"X-CSRF-Token": new_csrf}
    )
    assert deleted.status_code == 200
    assert client.get(f"/api/listings/{product_id}").status_code == 404
    with app_module.get_connection() as connection:
        persisted_store = connection.execute(
            "SELECT name, address, hours FROM stores WHERE id = ?", (store["id"],)
        ).fetchone()
        persisted_follow = connection.execute(
            "SELECT 1 FROM store_follows WHERE user_id = ? AND store_id = ?",
            (created.get_json()["user"]["id"], other_store["id"]),
        ).fetchone()
    assert persisted_store["name"] == "فروشگاه آزمون" and persisted_store["address"] == ""
    assert persisted_follow is not None


def test_otp_requires_correct_math_answer_and_explicit_terms_acceptance(monkeypatch, tmp_path):
    import kidareh.routes.auth as auth_routes

    client = setup_test_database(monkeypatch, tmp_path)
    monkeypatch.setattr(auth_routes, "_send_kavenegar_otp", lambda _phone, _code: True)
    monkeypatch.setitem(app_module.app.config, "TESTING_OTP_CODE", True)
    client.get("/api/auth/challenge")
    response = client.post(
        "/api/auth/request-otp",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"phone": "09123334445", "captcha_answer": "999", "terms_accepted": True},
    )
    assert response.status_code == 400 and response.get_json()["error"] == "captcha_failed"
    challenge = client.get("/api/auth/challenge").get_json()["question"]
    left, right = [
        int(value.strip())
        for value in challenge.replace("= ؟", "").strip().split("+")
    ]
    without_consent = client.post(
        "/api/auth/request-otp",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"phone": "09123334445", "captcha_answer": str(left + right)},
    )
    assert without_consent.status_code == 400
    assert without_consent.get_json()["error"] == "terms_required"
    accepted = client.post(
        "/api/auth/request-otp",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"phone": "09123334445", "captcha_answer": str(left + right), "terms_accepted": True},
    )
    assert accepted.status_code == 200, accepted.get_json()
    assert accepted.get_json()["ok"] is True


def test_otp_verification_rejects_wrong_code(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    valid_code = _request_test_otp(client, "09123334446", monkeypatch)
    wrong_code = "000000" if valid_code != "000000" else "000001"
    response = client.post(
        "/api/auth/verify-otp",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"code": wrong_code},
    )
    assert response.status_code == 400 and response.get_json()["error"] == "otp_invalid"


def test_monetization_catalog_is_public_and_has_expected_packages(monkeypatch, tmp_path):
    client = setup_empty_database(monkeypatch, tmp_path)
    response = client.get("/api/monetization/packages")
    assert response.status_code == 200
    data = response.get_json()
    ids = {item["id"] for item in data["items"]}
    assert "blue_tick_30d" in ids
    assert "visibility_bundle_7d" in ids
    assert all(item["price"] > 0 for item in data["items"])


def test_monetization_requires_login_for_orders(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    _logout(client)
    response = client.post(
        "/api/monetization/orders",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"package_id": "blue_tick_30d"},
    )
    assert response.status_code == 401


def test_monetization_order_does_not_activate_without_zibal_configuration(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    monkeypatch.delenv("ZIBAL_MERCHANT", raising=False)
    monkeypatch.delenv("ZIBAL_MERCHANT_ID", raising=False)
    response = client.post(
        "/api/monetization/orders",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"package_id": "blue_tick_30d"},
    )
    assert response.status_code == 503
    assert response.get_json()["error"] == "payment_unavailable"
    with app_module.get_connection() as connection:
        order = connection.execute(
            "SELECT id FROM monetization_orders ORDER BY id DESC LIMIT 1"
        ).fetchone()
    assert order is None


def test_seller_tags_page_renders_tag_store(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/seller/tags")
    assert response.status_code == 200
    assert "تگ حراج".encode() in response.data
    assert "رایگان".encode() in response.data


def test_my_listings_for_tags_requires_login(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    _logout(client)
    response = client.get("/api/my/listings")
    assert response.status_code == 401


def test_listing_api_includes_paid_tag_field(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    response = client.get("/api/listings")
    assert response.status_code == 200
    assert all("paid_tag" in item for item in response.get_json()["items"])


def test_listing_search_filters_by_availability(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    created = client.post(
        "/api/listings",
        json={
            "title": "چراغ مطالعه موجود",
            "category": "home",
            "city": "تبریز",
            "price": 350000,
            "description": "کالای تست",
            "availability_status": "in_stock",
        },
    )
    assert created.status_code == 201

    available = client.get("/api/listings?availability=in_stock").get_json()["items"]
    unavailable = client.get("/api/listings?availability=out_of_stock").get_json()["items"]
    assert any(item["title"] == "چراغ مطالعه موجود" for item in available)
    assert all(item["title"] != "چراغ مطالعه موجود" for item in unavailable)

    invalid = client.get("/api/listings?availability=maybe")
    assert invalid.status_code == 400
    assert invalid.get_json()["error"] == "invalid_availability"


def test_nearby_search_filters_unlocated_listings(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as db:
        db.execute(
            "UPDATE listings SET latitude=?, longitude=? WHERE title=?",
            (35.6892, 51.3890, "گوشی سامسونگ تمیز و سالم"),
        )
        db.execute(
            "UPDATE listings SET latitude=NULL, longitude=NULL WHERE title=?",
            ("میز کار چوبی مینیمال",),
        )
        db.commit()
    response = client.get("/api/listings?lat=35.69&lon=51.39&radius_km=25")
    assert response.status_code == 200 and response.get_json()["nearby"] is True
    items = response.get_json()["items"]
    assert any(
        item["title"] == "گوشی سامسونگ تمیز و سالم" and item["distance_km"] is not None
        for item in items
    )
    assert all(item.get("latitude") is not None for item in items)


def test_report_queue_requires_configured_admin_phone(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    created = client.post(
        "/api/reports",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"target_type": "listing", "target_id": 1, "reason": "spam", "details": "test"},
    )
    assert created.status_code == 201
    assert client.get("/api/admin/reports").status_code == 403
    monkeypatch.setenv("ADMIN_PHONE", "09120000000")
    result = client.get("/api/admin/reports")
    assert result.status_code == 200 and len(result.get_json()["items"]) == 1


def test_pwa_assets_are_served(monkeypatch, tmp_path):
    client = setup_empty_database(monkeypatch, tmp_path)
    assert client.get("/static/manifest.webmanifest").status_code == 200
    assert client.get("/static/sw.js").status_code == 200


def test_otp_rate_limit_is_shared_across_browser_sessions(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    _request_test_otp(client, "09129998877", monkeypatch)
    _logout(client)
    with client.session_transaction() as browser_session:
        browser_session["csrf_token"] = CSRF_TOKEN
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN
    challenge = client.get("/api/auth/challenge").get_json()["question"]
    left, right = [
        int(value.strip())
        for value in challenge.replace("= ؟", "").strip().split("+")
    ]
    response = client.post(
        "/api/auth/request-otp",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={
            "phone": "09129998877",
            "captcha_answer": str(left + right),
            "terms_accepted": True,
        },
    )
    assert response.status_code == 429
    assert response.get_json()["error"] == "otp_cooldown"


def test_otp_fails_closed_when_kavenegar_is_not_configured(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    monkeypatch.delenv("KAVENEGAR_API_KEY", raising=False)
    challenge = client.get("/api/auth/challenge").get_json()["question"]
    left, right = [
        int(value.strip())
        for value in challenge.replace("= ؟", "").strip().split("+")
    ]
    response = client.post(
        "/api/auth/request-otp",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={
            "phone": "09128887766",
            "captcha_answer": str(left + right),
            "terms_accepted": True,
        },
    )
    assert response.status_code == 503
    assert response.get_json()["error"] == "sms_unavailable"


def test_password_login_is_disabled_in_favor_of_sms(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    with client.session_transaction() as browser_session:
        browser_session["csrf_token"] = CSRF_TOKEN
    response = client.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"phone": "09120000000", "password": "anything"},
    )
    assert response.status_code == 410
    assert response.get_json()["error"] == "sms_login_only"


def test_database_path_failure_does_not_fall_back_to_temporary_database(monkeypatch, tmp_path):
    import pytest
    from pathlib import Path
    import kidareh.core as core

    blocked_parent = tmp_path / "blocked"
    app_module.app.config["DATABASE_PATH"] = str(blocked_parent / "kidareh.sqlite3")
    original_mkdir = Path.mkdir

    def fail_for_configured_parent(self, *args, **kwargs):
        if self == blocked_parent:
            raise OSError("simulated persistent-volume permission error")
        return original_mkdir(self, *args, **kwargs)

    monkeypatch.setattr(Path, "mkdir", fail_for_configured_parent)
    with app_module.app.app_context():
        with pytest.raises(OSError, match="simulated persistent-volume permission error"):
            with core.get_connection():
                pass


def test_production_database_does_not_receive_demo_records(monkeypatch, tmp_path):
    monkeypatch.setenv("LIARA_APP_ID", "test-liara-app")
    monkeypatch.delenv("KIDAREH_SEED_DEMO_DATA", raising=False)
    _patch_db_path(monkeypatch, tmp_path / "production.sqlite3")

    app_module.initialize_database()

    with app_module.get_connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM listings").fetchone()[0] == 0
        assert connection.execute("SELECT COUNT(*) FROM stores").fetchone()[0] == 0


def test_demo_records_cannot_be_enabled_in_production(monkeypatch, tmp_path):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("KIDAREH_SEED_DEMO_DATA", "true")
    _patch_db_path(monkeypatch, tmp_path / "production-demo.sqlite3")

    app_module.initialize_database()

    with app_module.get_connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM listings").fetchone()[0] == 0
        assert connection.execute("SELECT COUNT(*) FROM stores").fetchone()[0] == 0


def test_vercel_startup_removes_legacy_demo_data_but_preserves_real_records(monkeypatch, tmp_path):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("KIDAREH_SEED_DEMO_DATA", "true")
    _patch_db_path(monkeypatch, tmp_path / "vercel-cleanup.sqlite3")
    app_module.initialize_database()

    with app_module.get_connection() as connection:
        real_user_id = _seed_user(connection, "09120000077", role="seller")
        real_store_id = _seed_store(
            connection, real_user_id, name="فروشگاه واقعی", city="تهران"
        )
        connection.execute(
            "INSERT INTO listings (title, category, city, price, owner_id, store_id) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            ("کالای واقعی فروشنده", "digital", "تهران", 1500000, real_user_id, real_store_id),
        )
        demo_store_id = connection.execute(
            "INSERT INTO stores (owner_id, name, city) VALUES (NULL, ?, ?)",
            ("دیجیتال‌کده", "تبریز"),
        ).lastrowid
        connection.execute(
            "INSERT INTO listings (title, category, city, price, store_id) "
            "VALUES (?, ?, ?, ?, ?)",
            ("گوشی سامسونگ تمیز و سالم", "digital", "تهران", 12800000, demo_store_id),
        )
        connection.commit()

    # A second startup simulates a warm Vercel instance with an old SQLite file.
    app_module.initialize_database()

    with app_module.get_connection() as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM listings WHERE title = ?",
            ("گوشی سامسونگ تمیز و سالم",),
        ).fetchone()[0] == 0
        assert connection.execute(
            "SELECT COUNT(*) FROM stores WHERE name = ? AND owner_id IS NULL",
            ("دیجیتال‌کده",),
        ).fetchone()[0] == 0
        assert connection.execute(
            "SELECT COUNT(*) FROM listings WHERE title = ?",
            ("کالای واقعی فروشنده",),
        ).fetchone()[0] == 1
        assert connection.execute(
            "SELECT COUNT(*) FROM stores WHERE id = ? AND owner_id = ?",
            (real_store_id, real_user_id),
        ).fetchone()[0] == 1


def test_production_requires_non_default_secret_and_secure_cookie_settings(monkeypatch, tmp_path):
    import pytest
    from kidareh import create_app

    monkeypatch.setenv("LIARA_APP_ID", "test-liara-app")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY must be set"):
        create_app()

    monkeypatch.setenv("SECRET_KEY", "test-only-strong-secret-value-for-ci")
    production_app = create_app()
    assert production_app.config["SESSION_COOKIE_SECURE"] is True
    assert production_app.config["SESSION_COOKIE_HTTPONLY"] is True
    assert production_app.config["SESSION_COOKIE_SAMESITE"] == "Lax"


def _create_pending_blue_tick_order(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    import kidareh.routes.monetization as monetization

    monetization.ensure_tables()
    with app_module.get_connection() as db:
        cursor = db.execute(
            """INSERT INTO monetization_orders
               (user_id, store_id, package_id, amount_toman, status, gateway_code)
               VALUES (?, ?, ?, ?, 'pending', ?)""",
            (1, 1, "blue_tick_30d", 79000, "123456789"),
        )
        db.commit()
    return client, cursor.lastrowid, monetization


def test_zibal_callback_rejects_missing_amount_or_order_id(monkeypatch, tmp_path):
    cases = [
        {"result": 100, "orderId": "kidareh-1", "refNumber": "ref-1"},
        {"result": 100, "amount": 790000, "refNumber": "ref-1"},
        {"result": 100, "amount": 790001, "orderId": "kidareh-1"},
        {"result": 100, "amount": 790000, "orderId": "kidareh-999"},
    ]
    for index, gateway_response in enumerate(cases):
        client, order_id, monetization = _create_pending_blue_tick_order(
            monkeypatch, tmp_path / str(index)
        )
        gateway_response = dict(gateway_response)
        monkeypatch.setattr(
            monetization,
            "zibal_request",
            lambda _url, _payload, data=gateway_response: data,
        )

        response = client.get(
            f"/monetization/callback?order_id={order_id}&trackId=123456789"
        )

        assert response.status_code == 302
        assert "payment=unverified" in response.headers["Location"]
        with app_module.get_connection() as db:
            order = db.execute(
                "SELECT status FROM monetization_orders WHERE id=?", (order_id,)
            ).fetchone()
            promotion_count = db.execute(
                "SELECT COUNT(*) FROM store_promotions WHERE store_id=1"
            ).fetchone()[0]
            store = db.execute("SELECT badge_until FROM stores WHERE id=1").fetchone()
        assert order["status"] == "pending"
        assert promotion_count == 0
        assert store["badge_until"] == ""


def test_zibal_callback_activates_once_after_complete_verification(monkeypatch, tmp_path):
    client, order_id, monetization = _create_pending_blue_tick_order(monkeypatch, tmp_path)
    monkeypatch.setattr(
        monetization,
        "zibal_request",
        lambda _url, _payload: {
            "result": 100,
            "amount": 790000,
            "orderId": f"kidareh-{order_id}",
            "refNumber": "verified-reference",
        },
    )

    first = client.get(f"/monetization/callback?order_id={order_id}&trackId=123456789")
    assert first.status_code == 302
    assert "payment=success" in first.headers["Location"]
    second = client.get(f"/monetization/callback?order_id={order_id}&trackId=123456789")
    assert second.status_code == 302
    assert "payment=unverified" in second.headers["Location"]

    with app_module.get_connection() as db:
        order = db.execute(
            "SELECT status, gateway_ref FROM monetization_orders WHERE id=?",
            (order_id,),
        ).fetchone()
        promotions = db.execute(
            "SELECT COUNT(*) FROM store_promotions WHERE store_id=1"
        ).fetchone()[0]
        store = db.execute("SELECT badge_until FROM stores WHERE id=1").fetchone()
    assert order["status"] == "paid"
    assert order["gateway_ref"] == "verified-reference"
    assert promotions == 1
    assert store["badge_until"]


def test_non_admin_cannot_access_admin_api_or_mutate_accounts(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    monkeypatch.delenv("ADMIN_PHONE", raising=False)

    assert client.get("/api/admin/dashboard").status_code == 403
    assert client.get("/api/admin/reports").status_code == 403
    assert client.patch(
        "/api/admin/users/1",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"is_banned": True, "reason": "test"},
    ).status_code == 403
    assert client.patch(
        "/api/admin/tickets/1",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"status": "closed"},
    ).status_code == 403


def test_full_taxonomy_trade_directory_and_iran_locations(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)

    taxonomy = client.get("/api/categories").get_json()
    assert len(taxonomy["items"]) == 20
    assert sum(len(group["types"]) for group in taxonomy["items"]) == 271
    assert len(taxonomy["subcategories"]) == 271

    trades = client.get("/api/trades").get_json()["items"]
    assert len(trades) == 11
    assert sum(len(group["items"]) for group in trades) == 157

    locations = client.get("/api/locations?q=تهران").get_json()
    assert any(
        item["name"] == "تهران" and item["type"] == "city"
        for item in locations["items"]
    )

    from kidareh.data_catalog import LOCATION_INDEX, normalize_location_name

    city_names = [normalized for normalized, _ in LOCATION_INDEX["city"]]
    assert len(city_names) == len(set(city_names))
    assert all(item["type"] == "city" for _, item in LOCATION_INDEX["city"])

    same_name = client.get("/api/locations?q=سردشت").get_json()["items"]
    assert len(same_name) == 1
    assert same_name[0]["name"] == "سردشت"
    assert same_name[0]["type"] == "city"
    assert "،" in same_name[0]["province"]

    popular = client.get("/api/locations").get_json()["items"]
    popular_names = [normalize_location_name(item["name"]) for item in popular]
    assert len(popular_names) == len(set(popular_names))
    assert all(item["type"] == "city" for item in popular)

    complete = client.get("/api/locations?kind=city&all=1").get_json()
    complete_names = [normalize_location_name(item["name"]) for item in complete["items"]]
    assert complete["count"] == len(complete["items"])
    assert len(complete_names) == len(set(complete_names))
    assert len(complete_names) > len(popular_names)
    assert all(item["type"] == "city" for item in complete["items"])
    assert complete["popular"] and all(item["type"] == "city" for item in complete["popular"])


def test_listing_accepts_imported_subcategory_and_group_filter(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path)
    created = client.post(
        "/api/listings",
        json={
            "title": "خودروی آزمایشی",
            "category": "cars",
            "city": "تهران",
            "price": 0,
            "description": "آگهی تست دسته‌بندی جدید",
        },
    )
    assert created.status_code == 201
    filtered = client.get("/api/listings?category=vehicles").get_json()
    assert any(item["title"] == "خودروی آزمایشی" for item in filtered["items"])

def test_auth_me_response_is_private_and_never_cached(monkeypatch, tmp_path):
    client = setup_test_database(monkeypatch, tmp_path, filename="auth-me-cache.sqlite3")
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.get_json()["user"]["role"] == "seller"
    assert "no-store" in response.headers.get("Cache-Control", "")
    assert "private" in response.headers.get("Cache-Control", "")
    assert "Cookie" in response.headers.get("Vary", "")
