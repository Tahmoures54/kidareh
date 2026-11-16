"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('monetization_orders', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('user_id', sa.INTEGER(), nullable=False), sa.Column('store_id', sa.INTEGER(), nullable=False), sa.Column('package_id', sa.TEXT(), nullable=False), sa.Column('listing_id', sa.INTEGER(), nullable=True), sa.Column('amount_toman', sa.INTEGER(), nullable=False), sa.Column('status', sa.TEXT(), server_default=sa.text("'pending'"), nullable=False), sa.Column('gateway_ref', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('gateway_code', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.Column('paid_at', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_monetization_gateway_ref', 'monetization_orders', ['gateway_ref'], unique=1, postgresql_where=sa.text("gateway_ref <> ''"))
    op.create_index('idx_monetization_orders_user', 'monetization_orders', ['user_id', 'id'], unique=False)


def downgrade() -> None:
    op.drop_table('monetization_orders')
