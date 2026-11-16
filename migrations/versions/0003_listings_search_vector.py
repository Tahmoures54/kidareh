"""Add PostgreSQL full-text search index for listings.

Revision ID: 0003_listings_search_vector
Revises: 0002_postgresql_bootstrap
"""
from alembic import op

revision = "0003_listings_search_vector"
down_revision = "0002_postgresql_bootstrap"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        raise RuntimeError("Kidareh migrations require PostgreSQL.")
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_listings_search_vector
        ON listings USING GIN (
            to_tsvector(
                'simple',
                coalesce(title, '') || ' ' ||
                coalesce(description, '') || ' ' ||
                coalesce(city, '')
            )
        )
        """
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        raise RuntimeError("Kidareh migrations require PostgreSQL.")
    op.execute("DROP INDEX IF EXISTS idx_listings_search_vector")
