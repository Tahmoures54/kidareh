"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('saved_products', sa.Column('user_id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('listing_id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'), sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'), sa.PrimaryKeyConstraint('user_id', 'listing_id'))
    op.create_index('idx_saved_products_user', 'saved_products', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('saved_products')
