"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_index('idx_stores_name', 'stores', ['name'], unique=False)
    op.create_table('support_tickets', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('user_id', sa.INTEGER(), nullable=False), sa.Column('title', sa.TEXT(), nullable=False), sa.Column('category', sa.TEXT(), server_default=sa.text("'general'"), nullable=False), sa.Column('status', sa.TEXT(), server_default=sa.text("'open'"), nullable=False), sa.Column('priority', sa.TEXT(), server_default=sa.text("'normal'"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.Column('updated_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.CheckConstraint("priority IN ('low','normal','high')"), sa.CheckConstraint("status IN ('open','in_progress','answered','closed')"), sa.ForeignKeyConstraint(['user_id'], ['users.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_support_tickets_status', 'support_tickets', ['status', 'updated_at'], unique=False)
    op.create_index('idx_support_tickets_user', 'support_tickets', ['user_id', 'id'], unique=False)


def downgrade() -> None:
    op.drop_table('support_tickets')
