"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('store_follows', sa.Column('user_id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('store_id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='CASCADE'), sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'), sa.PrimaryKeyConstraint('user_id', 'store_id'))
    op.create_index('idx_store_follows_store', 'store_follows', ['store_id', 'user_id'], unique=False)
    op.create_table('support_messages', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('ticket_id', sa.INTEGER(), nullable=False), sa.Column('sender_id', sa.INTEGER(), nullable=False), sa.Column('body', sa.TEXT(), nullable=False), sa.Column('is_admin_reply', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.ForeignKeyConstraint(['sender_id'], ['users.id']), sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_support_messages_ticket', 'support_messages', ['ticket_id', 'id'], unique=False)


def downgrade() -> None:
    op.drop_table('support_messages')
    op.drop_table('store_follows')
