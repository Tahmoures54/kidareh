"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('rate_limits', sa.Column('scope', sa.TEXT(), nullable=False), sa.Column('key_hash', sa.TEXT(), nullable=False), sa.Column('last_request_at', sa.REAL(), server_default=sa.text('0'), nullable=False), sa.Column('window_started_at', sa.REAL(), server_default=sa.text('0'), nullable=False), sa.Column('request_count', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.PrimaryKeyConstraint('scope', 'key_hash'))
    op.create_index('idx_rate_limits_window', 'rate_limits', ['window_started_at'], unique=False)
    op.create_table('schema_migrations', sa.Column('version', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('applied_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.PrimaryKeyConstraint('version'))
    op.create_table('store_promotions', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('store_id', sa.INTEGER(), nullable=False), sa.Column('user_id', sa.INTEGER(), nullable=False), sa.Column('package_id', sa.TEXT(), nullable=False), sa.Column('starts_at', sa.TEXT(), nullable=False), sa.Column('ends_at', sa.TEXT(), nullable=False), sa.Column('status', sa.TEXT(), server_default=sa.text("'active'"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.PrimaryKeyConstraint('id'))


def downgrade() -> None:
    op.drop_table('store_promotions')
    op.drop_table('schema_migrations')
    op.drop_table('rate_limits')
