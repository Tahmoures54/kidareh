"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('otp_challenges', sa.Column('id', sa.TEXT(), nullable=False), sa.Column('phone', sa.TEXT(), nullable=False), sa.Column('otp_hash', sa.TEXT(), nullable=False), sa.Column('expires_at', sa.DOUBLE_PRECISION(), nullable=False), sa.Column('attempts', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.Column('terms_accepted_at', sa.TEXT(), nullable=False), sa.Column('existing_user', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.Column('consumed_at', sa.DOUBLE_PRECISION(), nullable=True), sa.Column('created_at', sa.DOUBLE_PRECISION(), nullable=False), sa.PrimaryKeyConstraint('id'))
    op.create_index('idx_otp_challenges_phone_created', 'otp_challenges', ['phone', 'created_at'], unique=False)
    op.create_table('otp_rate_limits', sa.Column('scope', sa.TEXT(), nullable=False), sa.Column('key_hash', sa.TEXT(), nullable=False), sa.Column('last_sent_at', sa.DOUBLE_PRECISION(), server_default=sa.text('0'), nullable=False), sa.Column('window_started_at', sa.DOUBLE_PRECISION(), server_default=sa.text('0'), nullable=False), sa.Column('request_count', sa.INTEGER(), server_default=sa.text('0'), nullable=False), sa.PrimaryKeyConstraint('scope', 'key_hash'))
    op.create_index('idx_otp_rate_limits_window', 'otp_rate_limits', ['window_started_at'], unique=False)


def downgrade() -> None:
    op.drop_table('otp_rate_limits')
    op.drop_table('otp_challenges')
