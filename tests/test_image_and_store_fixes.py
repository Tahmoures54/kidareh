"""Regression tests for image cleanup on listing delete and full store profile updates.

Fixes applied compared to the earlier version:

* ``app.config.update(TESTING=True, ...)`` leaked across tests; replaced with
  ``monkeypatch.setitem``.
* ``DATABASE_PATH`` was only patched on ``main``; ``core`` and ``schema_init``
  kept the original path. ``_patch_db_path`` now patches all three.
* User / store IDs were assumed to be ``1``. We capture ``lastrowid`` and use it
  explicitly.
* Inserts and ``UPDATE`` statements relied on the surrounding context manager to
  commit; we now commit explicitly.
* ``UPLOAD_FOLDER`` was patched only inside tests that needed it. It is now
  set once in ``setup_test_database`` so every test that publishes an image
  writes to the same throwaway directory.
* A failed delete (403) must not remove the image file. That case is now
  covered explicitly.
* ``image_path`` is checked to actually start with ``/static/uploads/`` before
  we trust the relative-path math.
* Env vars are cleared in ``setup_test_database``. A host that exports
  ``LIARA_APP_ID`` (Liara CI) would otherwise flip the factory into production
  mode and disable demo seed — ``test_nearby_search_uses_bounding_box...``
  relies on seed titles.
"""
import datetime as dt
import importlib
from io import BytesIO

import main as app_module


VERIFIED_AT = dt.datetime(2020, 1, 1, tzinfo=dt.timezone.utc).isoformat()
CSRF_TOKEN = "test-token"

_ENV_VARS_TO_CLEAR = (
    "LIARA_APP_ID",
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


def _seed_user(connection, phone, role="seller", password_hash="test-hash"):
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
    with client.session_transaction() as session:
        session["user_id"] = user_id
        session["csrf_token"] = CSRF_TOKEN
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN


def _logout(client):
    with client.session_transaction() as session:
        session.clear()
    client.environ_base.pop("HTTP_X_CSRF_TOKEN", None)


def _upload_folder(tmp_path):
    folder = tmp_path / "uploads"
    folder.mkdir(exist_ok=True)
    return folder


def setup_test_database(monkeypatch, tmp_path, filename="test-kidareh.sqlite3"):
    """Fresh DB seeded with one seller, one store, one upload folder; logged in as the seller.

    Env vars are cleared so a host that exports ``LIARA_APP_ID`` (Liara CI)
    cannot disable the demo seed that ``test_nearby_search_uses_bounding_box``
    depends on for the listing titles.
    """
    for name in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(name, raising=False)

    database = tmp_path / filename
    upload_folder = _upload_folder(tmp_path)

    _patch_db_path(monkeypatch, database)
    monkeypatch.setitem(app_module.app.config, "TESTING", True)
    monkeypatch.setitem(app_module.app.config, "TESTING_OTP_CODE", False)
    monkeypatch.setattr(app_module, "UPLOAD_FOLDER", upload_folder, raising=False)
    app_module.app.config["UPLOAD_FOLDER"] = str(upload_folder)

    app_module.initialize_database()

    client = app_module.app.test_client()
    with app_module.get_connection() as connection:
        seller_id = _seed_user(connection, "09120000000", role="seller")
        store_id = _seed_store(connection, seller_id)
        connection.commit()

    _login(client, seller_id)
    return client, seller_id, store_id


# ---------------------------------------------------------------------------
# image cleanup on delete
# ---------------------------------------------------------------------------
def test_delete_listing_removes_image_file_from_disk(monkeypatch, tmp_path):
    client, _, _ = setup_test_database(monkeypatch, tmp_path)
    upload_folder = _upload_folder(tmp_path)

    png = b"\x89PNG\r\n\x1a\n" + b"delete-me-image"
    created = client.post(
        "/api/listings",
        data={
            "title": "کالای دارای تصویر",
            "category": "home",
            "city": "تبریز",
            "price": "500000",
            "description": "حذف با تصویر",
            "image": (BytesIO(png), "photo.png"),
        },
        content_type="multipart/form-data",
    )
    assert created.status_code == 201
    item = created.get_json()["item"]
    listing_id = item["id"]
    assert item["image_path"].startswith("/static/uploads/"), item["image_path"]
    saved = upload_folder / item["image_path"].replace("/static/uploads/", "", 1)
    assert saved.is_file()
    assert saved.read_bytes() == png

    deleted = client.delete(f"/api/listings/{listing_id}", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert deleted.status_code == 200
    assert deleted.get_json()["ok"] is True
    assert not saved.exists()

    missing = client.get(f"/api/listings/{listing_id}")
    assert missing.status_code == 404


def test_failed_delete_does_not_remove_image_file(monkeypatch, tmp_path):
    """A non-owner delete (403) must not delete the seller's image from disk."""
    client, seller_id, _ = setup_test_database(monkeypatch, tmp_path)
    upload_folder = _upload_folder(tmp_path)

    png = b"\x89PNG\r\n\x1a\n" + b"keep-me"
    created = client.post(
        "/api/listings",
        data={
            "title": "کالای فروشنده",
            "category": "home",
            "city": "تبریز",
            "price": "1000",
            "description": "",
            "image": (BytesIO(png), "keep.png"),
        },
        content_type="multipart/form-data",
    )
    assert created.status_code == 201
    item = created.get_json()["item"]
    saved = upload_folder / item["image_path"].replace("/static/uploads/", "", 1)
    assert saved.is_file()

    with app_module.get_connection() as connection:
        stranger_id = _seed_user(connection, "09120000099", role="seller")
        connection.commit()
    _login(client, stranger_id)

    denied = client.delete(f"/api/listings/{item['id']}", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert denied.status_code == 403
    assert saved.is_file(), "403 delete removed the seller's image"

    # The original seller can still read the listing.
    _login(client, seller_id)
    assert client.get(f"/api/listings/{item['id']}").status_code == 200


def test_delete_listing_without_image_still_succeeds(monkeypatch, tmp_path):
    client, _, _ = setup_test_database(monkeypatch, tmp_path)
    created = client.post(
        "/api/listings",
        json={"title": "بدون تصویر", "category": "home", "city": "تهران", "price": 1000},
    )
    assert created.status_code == 201
    listing_id = created.get_json()["item"]["id"]
    deleted = client.delete(f"/api/listings/{listing_id}", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert deleted.status_code == 200
    assert deleted.get_json()["ok"] is True


def test_delete_listing_is_idempotent_on_missing_image_file(monkeypatch, tmp_path):
    """If the file was removed out-of-band, delete still succeeds and returns 200."""
    client, _, _ = setup_test_database(monkeypatch, tmp_path)
    upload_folder = _upload_folder(tmp_path)

    png = b"\x89PNG\r\n\x1a\n" + b"already-gone"
    created = client.post(
        "/api/listings",
        data={
            "title": "کالای حذف‌شده",
            "category": "home",
            "city": "تبریز",
            "price": "1000",
            "description": "",
            "image": (BytesIO(png), "gone.png"),
        },
        content_type="multipart/form-data",
    )
    assert created.status_code == 201
    item = created.get_json()["item"]
    saved = upload_folder / item["image_path"].replace("/static/uploads/", "", 1)
    saved.unlink()  # simulate manual cleanup

    deleted = client.delete(f"/api/listings/{item['id']}", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert deleted.status_code == 200
    assert deleted.get_json()["ok"] is True


# ---------------------------------------------------------------------------
# store extended profile
# ---------------------------------------------------------------------------
def test_store_owner_can_update_extended_profile_fields(monkeypatch, tmp_path):
    client, _, store_id = setup_test_database(monkeypatch, tmp_path)
    response = client.patch(
        f"/api/stores/{store_id}",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={
            "name": "ویترین کامل",
            "city": "اصفهان",
            "description": "توضیح به‌روز",
            "category": "digital",
            "contact_name": "علی فروشنده",
            "address": "خیابان اصلی، پلاک ۱۲",
            "hours": "۹ تا ۱۸",
            "in_person": True,
        },
    )
    assert response.status_code == 200, response.get_json()
    item = response.get_json()["item"]
    assert item["name"] == "ویترین کامل"
    assert item["city"] == "اصفهان"
    assert item["description"] == "توضیح به‌روز"
    assert item["category"] == "digital"
    assert item["contact_name"] == "علی فروشنده"
    assert item["address"] == "خیابان اصلی، پلاک ۱۲"
    assert item["hours"] == "۹ تا ۱۸"
    assert item["in_person"] in (1, True)


def test_store_update_rejects_unknown_fields(monkeypatch, tmp_path):
    client, _, store_id = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        before = connection.execute(
            "SELECT name, owner_id FROM stores WHERE id = ?", (store_id,)
        ).fetchone()

    response = client.patch(
        f"/api/stores/{store_id}",
        headers={"X-CSRF-Token": CSRF_TOKEN},
        json={"name": "نام", "owner_id": 99},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_payload"

    with app_module.get_connection() as connection:
        after = connection.execute(
            "SELECT name, owner_id FROM stores WHERE id = ?", (store_id,)
        ).fetchone()
    assert after["name"] == before["name"]
    assert after["owner_id"] == before["owner_id"]


# ---------------------------------------------------------------------------
# become-seller flow
# ---------------------------------------------------------------------------
def test_become_seller_reports_existing_storefront(monkeypatch, tmp_path):
    client, seller_id, _ = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.execute("UPDATE users SET role = 'buyer' WHERE id = ?", (seller_id,))
        connection.commit()

    response = client.post("/api/auth/become-seller", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert response.status_code == 200
    data = response.get_json()
    assert data["user"]["role"] == "seller"
    assert data["has_store"] is True
    assert data.get("next") is None

    # Calling again is idempotent.
    again = client.post("/api/auth/become-seller", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert again.status_code == 200
    assert again.get_json()["user"]["role"] == "seller"


def test_become_seller_prompts_store_creation_when_missing(monkeypatch, tmp_path):
    client, seller_id, _ = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as connection:
        connection.execute("DELETE FROM stores WHERE owner_id = ?", (seller_id,))
        connection.execute("UPDATE users SET role = 'buyer' WHERE id = ?", (seller_id,))
        connection.commit()

    response = client.post("/api/auth/become-seller", headers={"X-CSRF-Token": CSRF_TOKEN})
    assert response.status_code == 200
    data = response.get_json()
    assert data["user"]["role"] == "seller"
    assert data["has_store"] is False
    assert data["next"] == "/api/stores"
    assert "ویترین" in data["message"]


# ---------------------------------------------------------------------------
# nearby search geometry
# ---------------------------------------------------------------------------
def test_nearby_search_uses_bounding_box_and_excludes_null_coords(monkeypatch, tmp_path):
    client, _, _ = setup_test_database(monkeypatch, tmp_path)
    with app_module.get_connection() as db:
        db.execute(
            "UPDATE listings SET latitude=?, longitude=? WHERE title=?",
            (35.6892, 51.3890, "گوشی سامسونگ تمیز و سالم"),
        )
        db.execute(
            "UPDATE listings SET latitude=NULL, longitude=NULL WHERE title=?",
            ("میز کار چوبی مینیمال",),
        )
        # Far away listing should be outside the bounding box for a tight radius.
        db.execute(
            "UPDATE listings SET latitude=?, longitude=? WHERE title=?",
            (36.26, 59.61, "هدفون بی‌سیم"),  # roughly Mashhad
        )
        db.commit()

    response = client.get("/api/listings?lat=35.69&lon=51.39&radius_km=30")
    assert response.status_code == 200
    data = response.get_json()
    assert data["nearby"] is True
    titles = {item["title"] for item in data["items"]}
    assert "گوشی سامسونگ تمیز و سالم" in titles
    assert "میز کار چوبی مینیمال" not in titles
    assert "هدفون بی‌سیم" not in titles
    assert all(item.get("latitude") is not None for item in data["items"])
    assert all(item.get("distance_km") is not None for item in data["items"])
    # The Tehran listing must report a distance below the requested radius.
    tehran = next(i for i in data["items"] if i["title"] == "گوشی سامسونگ تمیز و سالم")
    assert 0 <= tehran["distance_km"] <= 30


def test_store_uploaded_image_uses_blob_when_token_is_configured(monkeypatch, tmp_path):
    from kidareh import core
    from kidareh.infrastructure.storage import object_storage

    upload_folder = _upload_folder(tmp_path)
    monkeypatch.setitem(app_module.app.config, "UPLOAD_FOLDER", str(upload_folder))
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")
    calls = []
    monkeypatch.setattr(
        object_storage, "upload_image",
        lambda pathname, body, content_type: (
            calls.append((pathname, body, content_type))
            or "https://example.public.blob.vercel-storage.com/listings/test.png"
        ),
    )

    result = core.store_uploaded_image(b"png-bytes", ".png")

    assert result.startswith("https://example.public.blob.vercel-storage.com/")
    assert len(calls) == 1
    assert calls[0][1:] == (b"png-bytes", "image/png")
    assert not list(upload_folder.rglob("*"))


def test_store_uploaded_image_fails_closed_when_blob_upload_fails(monkeypatch, tmp_path):
    from kidareh import core
    from kidareh.infrastructure.storage import object_storage

    upload_folder = _upload_folder(tmp_path)
    monkeypatch.setitem(app_module.app.config, "UPLOAD_FOLDER", str(upload_folder))
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")

    def fail_upload(*_args, **_kwargs):
        raise RuntimeError("Blob unavailable")

    monkeypatch.setattr(object_storage, "upload_image", fail_upload)
    try:
        core.store_uploaded_image(b"png-bytes", ".png")
    except RuntimeError as error:
        assert str(error) == "Blob unavailable"
    else:
        raise AssertionError("Blob failure should be propagated")
    assert not list(upload_folder.rglob("*"))


def test_delete_uploaded_blob_url_uses_blob_adapter(monkeypatch):
    from kidareh import core
    from kidareh.infrastructure.storage import object_storage

    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")
    deleted = []
    monkeypatch.setattr(object_storage, "delete_image", deleted.append)

    url = "https://example.public.blob.vercel-storage.com/listings/old.png"
    core.delete_uploaded_image(url)

    assert deleted == [url]


def test_delete_uploaded_image_ignores_untrusted_external_urls(monkeypatch):
    from kidareh import core
    from kidareh.infrastructure.storage import object_storage

    deleted = []
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")
    monkeypatch.setattr(object_storage, "delete_image", deleted.append)

    core.delete_uploaded_image("https://attacker.example/listings/image.png")

    assert deleted == []
