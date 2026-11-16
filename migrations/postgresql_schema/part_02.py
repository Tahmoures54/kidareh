"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('conversations', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('listing_id', sa.INTEGER(), nullable=False), sa.Column('buyer_id', sa.INTEGER(), nullable=False), sa.Column('seller_id', sa.INTEGER(), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.Column('updated_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.CheckConstraint('buyer_id <> seller_id'), sa.PrimaryKeyConstraint('id'), sa.UniqueConstraint('listing_id', 'buyer_id'))
    op.create_index('idx_conversations_buyer', 'conversations', ['buyer_id', 'updated_at'], unique=False)
    op.create_index('idx_conversations_seller', 'conversations', ['seller_id', 'updated_at'], unique=False)
    op.create_table('listing_tags', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('listing_id', sa.INTEGER(), nullable=False), sa.Column('user_id', sa.INTEGER(), nullable=False), sa.Column('tag_type', sa.TEXT(), nullable=False), sa.Column('starts_at', sa.TEXT(), nullable=False), sa.Column('ends_at', sa.TEXT(), nullable=False), sa.Column('status', sa.TEXT(), server_default=sa.text("'active'"), nullable=False), sa.Column('order_id', sa.INTEGER(), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.PrimaryKeyConstraint('id'))


def downgrade() -> None:
    op.drop_table('listing_tags')
    op.drop_table('conversations')
