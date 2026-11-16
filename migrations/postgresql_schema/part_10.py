"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('conversation_messages', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('conversation_id', sa.INTEGER(), nullable=False), sa.Column('sender_id', sa.INTEGER(), nullable=False), sa.Column('body', sa.TEXT(), nullable=False), sa.Column('read_at', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id']), sa.ForeignKeyConstraint(['sender_id'], ['users.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_conversation_messages_thread', 'conversation_messages', ['conversation_id', 'id'], unique=False)
    op.create_table('in_app_notifications', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('user_id', sa.INTEGER(), nullable=False), sa.Column('kind', sa.TEXT(), nullable=False), sa.Column('title', sa.TEXT(), nullable=False), sa.Column('body', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('target_url', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.Column('read_at', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.ForeignKeyConstraint(['user_id'], ['users.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_notifications_user_unread', 'in_app_notifications', ['user_id', 'read_at', 'id'], unique=False)


def downgrade() -> None:
    op.drop_table('in_app_notifications')
    op.drop_table('conversation_messages')
