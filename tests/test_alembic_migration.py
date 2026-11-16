"""Static safeguards for the PostgreSQL-native Alembic schema."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = [ROOT / "migrations" / "versions" / "0002_postgresql_bootstrap.py"]
MIGRATIONS.extend(sorted((ROOT / "migrations" / "postgresql_schema").glob("part_*.py")))


def test_initial_schema_migration_is_static_postgresql_ddl():
    source = "\n".join(path.read_text(encoding="utf-8") for path in MIGRATIONS)
    forbidden = (
        "sqlite3",
        "sqlite://",
        "tempfile",
        "TemporaryDirectory",
        "create_app",
        "MetaData.reflect",
    )
    assert not [token for token in forbidden if token in source]
    assert source.count("op.create_table(") == 19
    assert "sa.Identity()" in source
    assert "postgresql_where=" in source
    assert "_require_postgresql" in source
