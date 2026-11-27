"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('listings', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('title', sa.TEXT(), nullable=False), sa.Column('category', sa.TEXT(), nullable=False), sa.Column('city', sa.TEXT(), nullable=False), sa.Column('price', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.Column('description', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('emoji', sa.TEXT(), server_default=sa.text("'🛍️'"), nullable=False), sa.Column('featured', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.Column('image_path', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('seller_phone', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('owner_id', sa.INTEGER(), nullable=True), sa.Column('store_id', sa.INTEGER(), nullable=True), sa.Column('latitude', sa.DOUBLE_PRECISION(), nullable=True), sa.Column('longitude', sa.DOUBLE_PRECISION(), nullable=True), sa.Column('availability_status', sa.TEXT(), server_default=sa.text("'ask'"), nullable=False), sa.Column('price_updated_at', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.Column('featured_until', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_listings_category_featured_id', 'listings', ['category', 'featured', 'id'], unique=False)


def downgrade() -> None:
    op.drop_table('listings')
