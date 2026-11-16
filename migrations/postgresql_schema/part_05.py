"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_index('idx_listings_city_category_featured_id', 'listings', ['city', 'category', 'featured', 'id'], unique=False)
    op.create_index('idx_listings_city_featured_id', 'listings', ['city', 'featured', 'id'], unique=False)
    op.create_index('idx_listings_featured_expiry', 'listings', ['featured_until'], unique=False, postgresql_where=sa.text("featured_until <> ''"))
    op.create_index('idx_listings_featured_id', 'listings', ['featured', 'id'], unique=False)
    op.create_index('idx_listings_geo', 'listings', ['latitude', 'longitude'], unique=False, postgresql_where=sa.text('latitude IS NOT NULL AND longitude IS NOT NULL'))
    op.create_index('idx_listings_owner_id', 'listings', ['owner_id', 'id'], unique=False)
    op.create_index('idx_listings_store_id', 'listings', ['store_id', 'id'], unique=False)


def downgrade() -> None:
    pass
