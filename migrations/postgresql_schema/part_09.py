"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('users', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('name', sa.TEXT(), nullable=False), sa.Column('phone', sa.TEXT(), nullable=False), sa.Column('password_hash', sa.TEXT(), nullable=False), sa.Column('role', sa.TEXT(), server_default=sa.text("'buyer'"), nullable=False), sa.Column('phone_verified_at', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('terms_accepted_at', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('is_banned', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.Column('ban_reason', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('city', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.PrimaryKeyConstraint('id'), sa.UniqueConstraint('phone'))
    op.create_index('idx_users_role', 'users', ['role'], unique=False)


def downgrade() -> None:
    op.drop_table('users')
