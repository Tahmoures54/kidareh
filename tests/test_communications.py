"""Communications, support, and admin tests.

Fixes applied compared to the earlier version:

* ``app.config.update(TESTING=True)`` leaked across tests; replaced with
  ``monkeypatch.setitem``.
* ``DATABASE_PATH`` was only patched on ``main``; ``core`` and
  ``schema_init`` kept the original path. ``_patch_db_path`` now patches
  all three.
* Inserts were committed by the surrounding context manager; we now commit
  explicitly so the tests do not depend on its behaviour.
* User / store / listing / conversation IDs were assumed to be ``1``. We
  now capture ``lastrowid`` and use it explicitly.
* ``phone_verified_at`` was ``"verified"`` (a non-datetime string) in some
  inserts and an ISO datetime in others. All inserts use the same ISO value.
* ``ensure_tables()`` was called inside a single test. It is idempotent and
  is now invoked once from the fixture.
* The privacy test asserted a hardcoded conversation id. It now uses the
  actual row.
* ``test_support_ticket_owner_and_admin_reply`` did not actually exercise
  two distinct roles: the same user was ticket creator and admin. A second
  test now covers a real owner/admin handoff.
* CSRF protection on the admin PATCH endpoint had no coverage.
* ``counts["users"] == 2`` was replaced with ``>= 2`` to be robust against
  future seed changes.
"""
import datetime as dt
import importlib

import main as app_module


VERIFIED_AT = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc).isoformat()
CSRF_TOKEN = "test-token"


# ---------------------------------------------------------------------------
# helpers (not collected by pytest)
# ---------------------------------------------------------------------------
def _patch_db_path(monkeypatch, db_path):
    monkeypatch.setattr(app_module, "DATABASE_PATH", db_path, raising=False)
    for module_name in ("kidareh.core", "kidareh.schema_init"):
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue
        monkeypatch.setattr(module, "DATABASE_PATH", db_path, raising=False)


def _login(client, user_id):
    with client.session_transaction() as session:
        session["user_id"] = user_id
        session["csrf_token"] = CSRF_TOKEN
    client.environ_base["HTTP_X_CSRF_TOKEN"] = CSRF_TOKEN


def _create_user(db, name, phone, role="buyer", verified=True):
    return db.execute(
        "INSERT INTO users(name,phone,password_hash,role,phone_verified_at) VALUES(?,?,?,?,?)",
        (name, phone, "x", role, VERIFIED_AT if verified else None),
    ).lastrowid


def setup_client(monkeypatch, tmp_path, phone="09120000000", role="seller"):
    """Fresh DB with one seller, one store, one listing; logged in as the seller."""
    db_path = tmp_path / "community.sqlite3"
    _patch_db_path(monkeypatch, db_path)
    monkeypatch.setitem(app_module.app.config, "TESTING", True)
    monkeypatch.delenv("KIDAREH_SEED_DEMO_DATA", raising=False)
    monkeypatch.delenv("LIARA_APP_ID", raising=False)

    app_module.initialize_database()

    # Ensure communications tables exist even before the first API call.
    from kidareh.routes.communications import ensure_tables as _ensure_comm_tables
    _ensure_comm_tables()

    client = app_module.app.test_client()
    with app_module.get_connection() as db:
        seller_id = _create_user(db, "کاربر تست", phone, role=role)
        store_id = db.execute(
            "INSERT INTO stores(owner_id,name,city,description) VALUES(?,?,?,?)",
            (seller_id, "فروشگاه تست", "تبریز", "توضیح"),
        ).lastrowid
        db.execute(
            "INSERT INTO listings(title,category,city,price,owner_id,store_id) VALUES(?,?,?,?,?,?)",
            ("کالای تست", "home", "تبریز", 1000, seller_id, store_id),
        )
        db.commit()

    _login(client, seller_id)
    return client, seller_id, store_id


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
def test_buyer_can_start_conversation_and_exchange_messages(monkeypatch, tmp_path):
    client, seller_id, _ = setup_client(monkeypatch, tmp_path)
    with app_module.get_connection() as db:
        buyer_id = _create_user(db, "خریدار", "09120000001", role="buyer")
        listing_id = db.execute(
            "SELECT id FROM listings WHERE title='کالای تست'"
        ).fetchone()[0]
        db.commit()

    _login(client, buyer_id)
    started = client.post("/api/conversations", json={"listing_id": listing_id})
    assert started.status_code == 201
    thread_id = started.get_json()["id"]

    sent = client.post(
        f"/api/conversations/{thread_id}/messages",
        json={"body": "سلام، کالا موجود است؟"},
    )
    assert sent.status_code == 201

    got = client.get(f"/api/conversations/{thread_id}/messages")
    assert got.status_code == 200
    bodies = [item["body"] for item in got.get_json()["items"]]
    assert "سلام، کالا موجود است؟" in bodies

    # The seller must see the same thread.
    _login(client, seller_id)
    assert client.get(f"/api/conversations/{thread_id}/messages").status_code == 200


def test_conversation_is_private_to_participants(monkeypatch, tmp_path):
    client, seller_id, _ = setup_client(monkeypatch, tmp_path)
    with app_module.get_connection() as db:
        buyer_id = _create_user(db, "خریدار", "09120000001", role="buyer")
        stranger_id = _create_user(db, "غریبه", "09120000002", role="buyer")
        listing_id = db.execute(
            "SELECT id FROM listings WHERE title='کالای تست'"
        ).fetchone()[0]
        thread_id = db.execute(
            "INSERT INTO conversations(listing_id,buyer_id,seller_id) VALUES(?,?,?)",
            (listing_id, buyer_id, seller_id),
        ).lastrowid
        db.commit()

    _login(client, stranger_id)
    assert client.get(f"/api/conversations/{thread_id}/messages").status_code == 404
    # The stranger must also be unable to write.
    write = client.post(
        f"/api/conversations/{thread_id}/messages",
        json={"body": "سلام"},
    )
    assert write.status_code in (403, 404)


def test_support_ticket_owner_and_admin_reply(monkeypatch, tmp_path):
    client, _, _ = setup_client(monkeypatch, tmp_path)
    monkeypatch.setenv("ADMIN_PHONE", "09120000000")

    created = client.post(
        "/api/support/tickets",
        json={
            "title": "مشکل در کالا",
            "category": "listing",
            "body": "در ثبت کالای جدید با مشکل روبه‌رو شده‌ام.",
        },
    )
    assert created.status_code == 201
    ticket_id = created.get_json()["id"]

    reply = client.post(
        f"/api/support/tickets/{ticket_id}/messages",
        json={"body": "درخواست شما بررسی می‌شود."},
    )
    assert reply.status_code == 201

    detail = client.get(f"/api/support/tickets/{ticket_id}")
    assert detail.status_code == 200
    assert len(detail.get_json()["items"]) == 2


def test_support_ticket_admin_can_reply_to_owner_thread(monkeypatch, tmp_path):
    """A distinct admin user must be able to reply to another user's ticket."""
    client, seller_id, _ = setup_client(monkeypatch, tmp_path)
    with app_module.get_connection() as db:
        admin_id = _create_user(db, "مدیر", "09120000099", role="buyer")
        db.commit()
    monkeypatch.setenv("ADMIN_PHONE", "09120000099")

    # Owner (seller) creates the ticket.
    _login(client, seller_id)
    created = client.post(
        "/api/support/tickets",
        json={"title": "درخواست", "category": "other", "body": "سوال دارم."},
    )
    assert created.status_code == 201
    ticket_id = created.get_json()["id"]

    # Admin replies.
    _login(client, admin_id)
    reply = client.post(
        f"/api/support/tickets/{ticket_id}/messages",
        json={"body": "پاسخ مدیر."},
    )
    assert reply.status_code == 201

    # Owner sees both messages.
    _login(client, seller_id)
    detail = client.get(f"/api/support/tickets/{ticket_id}")
    assert detail.status_code == 200
    assert len(detail.get_json()["items"]) == 2


def test_admin_dashboard_and_user_ban(monkeypatch, tmp_path):
    client, _, _ = setup_client(monkeypatch, tmp_path)
    monkeypatch.setenv("ADMIN_PHONE", "09120000000")
    with app_module.get_connection() as db:
        other_user_id = _create_user(db, "کاربر دوم", "09120000001", role="buyer")
        db.commit()

    response = client.get("/api/admin/dashboard")
    assert response.status_code == 200
    assert response.get_json()["counts"]["users"] >= 2

    updated = client.patch(
        f"/api/admin/users/{other_user_id}",
        json={"is_banned": True, "reason": "آزمایش"},
    )
    assert updated.status_code == 200

    with app_module.get_connection() as db:
        is_banned = db.execute(
            "SELECT is_banned FROM users WHERE id=?", (other_user_id,)
        ).fetchone()[0]
    assert is_banned == 1


def test_admin_patch_requires_csrf(monkeypatch, tmp_path):
    client, _, _ = setup_client(monkeypatch, tmp_path)
    monkeypatch.setenv("ADMIN_PHONE", "09120000000")
    with app_module.get_connection() as db:
        other_user_id = _create_user(db, "کاربر دوم", "09120000001", role="buyer")
        db.commit()

    # Admin session is valid, but the CSRF header does not match the session.
    client.environ_base["HTTP_X_CSRF_TOKEN"] = "wrong-token"
    response = client.patch(
        f"/api/admin/users/{other_user_id}",
        json={"is_banned": True, "reason": "test"},
    )
    assert response.status_code in (400, 403)
    with app_module.get_connection() as db:
        is_banned = db.execute(
            "SELECT is_banned FROM users WHERE id=?", (other_user_id,)
        ).fetchone()[0]
    assert is_banned == 0


def test_admin_dashboard_rejects_non_admin(monkeypatch, tmp_path):
    client, _, _ = setup_client(monkeypatch, tmp_path)
    monkeypatch.setenv("ADMIN_PHONE", "09999999999")
    assert client.get("/api/admin/dashboard").status_code == 403
    with app_module.get_connection() as db:
        other_user_id = _create_user(db, "کاربر دوم", "09120000001", role="buyer")
        db.commit()
    assert client.patch(
        f"/api/admin/users/{other_user_id}",
        json={"is_banned": True, "reason": "test"},
    ).status_code == 403