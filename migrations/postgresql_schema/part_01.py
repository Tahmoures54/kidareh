"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('auth_flows', sa.Column('id', sa.TEXT(), nullable=False), sa.Column('phone', sa.TEXT(), nullable=False), sa.Column('state', sa.TEXT(), nullable=False), sa.Column('challenge_id', sa.TEXT(), nullable=False), sa.Column('terms_accepted_at', sa.TEXT(), nullable=False), sa.Column('expires_at', sa.REAL(), nullable=False), sa.Column('created_at', sa.REAL(), nullable=False), sa.Column('updated_at', sa.REAL(), nullable=False), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_auth_flows_state_expiry', 'auth_flows', ['state', 'expires_at'], unique=False)
    op.create_table('content_reports', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('reporter_id', sa.INTEGER(), nullable=False), sa.Column('target_type', sa.TEXT(), nullable=False), sa.Column('target_id', sa.INTEGER(), nullable=False), sa.Column('reason', sa.TEXT(), nullable=False), sa.Column('details', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('status', sa.TEXT(), server_default=sa.text("'open'"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.Column('reviewed_at', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.CheckConstraint("target_type IN ('listing','store')"), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_content_reports_status', 'content_reports', ['status', 'id'], unique=False)


def downgrade() -> None:
    op.drop_table('content_reports')
    op.drop_table('auth_flows')
