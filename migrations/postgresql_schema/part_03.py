"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_index('idx_listing_tags_listing_status', 'listing_tags', ['listing_id', 'status', 'ends_at'], unique=False)
    op.create_index('idx_listing_tags_order', 'listing_tags', ['order_id'], unique=1)


def downgrade() -> None:
    pass
