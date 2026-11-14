"""Adopt the existing Kidareh schema without modifying user data.

Revision ID: 0001_adopt_existing_schema
Revises:
Create Date: 2026-11-14
"""
from alembic import op

revision = "0001_adopt_existing_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Existing installations are initialized by Kidareh's idempotent bootstrap.
    # This baseline only establishes Alembic's revision history; it deliberately
    # does not recreate, drop, or rewrite existing tables/data.
    pass


def downgrade():
    # The baseline owns no schema objects and is intentionally irreversible.
    pass
