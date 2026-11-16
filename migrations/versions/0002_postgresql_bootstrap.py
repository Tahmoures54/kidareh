"""PostgreSQL-native Kidareh schema migration.

Revision ID: 0002_postgresql_bootstrap
Revises: 0001_adopt_existing_schema
"""
from alembic import op
from migrations.postgresql_schema import (
    part_01,
    part_02,
    part_03,
    part_04,
    part_05,
    part_06,
    part_07,
    part_08,
    part_09,
    part_10,
    part_11,
    part_12,
    part_13,
    part_14,
)

revision = "0002_postgresql_bootstrap"
down_revision = "0001_adopt_existing_schema"
branch_labels = None
depends_on = None

_PARTS = (
    part_01,
    part_02,
    part_03,
    part_04,
    part_05,
    part_06,
    part_07,
    part_08,
    part_09,
    part_10,
    part_11,
    part_12,
    part_13,
    part_14,
)


def _require_postgresql() -> None:
    if op.get_bind().dialect.name != "postgresql":
        raise RuntimeError("Kidareh schema migrations require PostgreSQL.")


def upgrade() -> None:
    _require_postgresql()
    for part in _PARTS:
        part.upgrade()


def downgrade() -> None:
    _require_postgresql()
    for part in reversed(_PARTS):
        part.downgrade()
