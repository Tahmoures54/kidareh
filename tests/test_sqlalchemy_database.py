"""SQLAlchemy 2.x integration tests for the reflected production schema."""
from sqlalchemy import select

from kidareh import create_app
from kidareh.core import initialize_database
from kidareh.infrastructure.database.session import get_database
from kidareh.modules.accounts.repository import UserRepository
from kidareh.modules.listings.repository import ListingRepository


def test_sqlalchemy_maps_existing_schema_and_reads_existing_rows(tmp_path):
    database_path = tmp_path / "kidareh-test.sqlite3"
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-only-secret",
        "DATABASE_PATH": str(database_path),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })

    with app.app_context():
        initialize_database()
        database = get_database()
        assert "users" in database.models
        assert "listings" in database.models
        assert "stores" in database.models

        with database.session_scope() as session:
            users = session.scalars(select(database.models["users"])).all()
            assert isinstance(users, list)

            # Repository APIs must use SQLAlchemy 2.x select/session semantics.
            assert UserRepository(session).list(limit=10) is not None
            assert ListingRepository(session).list(limit=10) is not None

        database.dispose()


def test_reflection_excludes_fts_shadow_tables(tmp_path):
    database_path = tmp_path / "kidareh-test.sqlite3"
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-only-secret",
        "DATABASE_PATH": str(database_path),
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
    })
    with app.app_context():
        initialize_database()
        models = get_database().models
        assert "listings" in models
        assert "listings_fts" not in models
        assert "listings_fts_data" not in models
        get_database().dispose()


def test_legacy_route_adapter_executes_through_sqlalchemy(tmp_path):
    from sqlalchemy import create_engine
    from kidareh.infrastructure.database.legacy_adapter import SQLAlchemyConnectionAdapter

    engine = create_engine(f"sqlite:///{tmp_path / 'adapter.sqlite3'}")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE sample (id INTEGER PRIMARY KEY, label TEXT NOT NULL)"
        )

    connection = SQLAlchemyConnectionAdapter(engine.connect())
    try:
        inserted = connection.execute(
            "INSERT INTO sample(label) VALUES (?)", ("adapter-ok",)
        )
        assert inserted.lastrowid == 1
        connection.commit()
        row = connection.execute("SELECT id, label FROM sample").fetchone()
        assert row[0] == 1
        assert row["label"] == "adapter-ok"
        assert dict(row) == {"id": 1, "label": "adapter-ok"}
    finally:
        connection.close()
        engine.dispose()


def test_legacy_route_adapter_supports_executemany(tmp_path):
    from sqlalchemy import create_engine
    from kidareh.infrastructure.database.legacy_adapter import SQLAlchemyConnectionAdapter

    engine = create_engine(f"sqlite:///{tmp_path / 'executemany.sqlite3'}")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE sample (id INTEGER PRIMARY KEY, label TEXT NOT NULL)"
        )

    connection = SQLAlchemyConnectionAdapter(engine.connect())
    try:
        result = connection.executemany(
            "INSERT INTO sample(label) VALUES (?)",
            [("first",), ("second",), ("third",)],
        )
        assert result.rowcount == 3
        connection.commit()
        rows = connection.execute(
            "SELECT label FROM sample ORDER BY id"
        ).fetchall()
        assert [row["label"] for row in rows] == ["first", "second", "third"]
    finally:
        connection.close()
        engine.dispose()


def test_legacy_route_adapter_accepts_flat_list_parameters(tmp_path):
    """A flat list is one sqlite-style parameter set, not executemany."""
    from sqlalchemy import create_engine
    from kidareh.infrastructure.database.legacy_adapter import SQLAlchemyConnectionAdapter

    engine = create_engine(f"sqlite:///{tmp_path / 'flat-params.sqlite3'}")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE sample (id INTEGER PRIMARY KEY, city TEXT, title TEXT)"
        )
        connection.exec_driver_sql(
            "INSERT INTO sample(city, title) VALUES (?, ?)", ("تهران", "کالای نمونه")
        )

    connection = SQLAlchemyConnectionAdapter(engine.connect())
    try:
        # This is the parameter shape passed by the legacy /api/listings route.
        rows = connection.execute(
            "SELECT id, title FROM sample WHERE city=? AND title LIKE ?",
            ["تهران", "%نمونه%"],
        ).fetchall()
        assert len(rows) == 1
        assert rows[0]["title"] == "کالای نمونه"
    finally:
        connection.close()
        engine.dispose()
