"""Create Kidareh domain schema with PostgreSQL-native DDL.

Revision ID: 0002_postgresql_bootstrap
Revises: 0001_adopt_existing_schema

Static Alembic operations only: no Flask imports, temporary database files,
or runtime schema reflection. Existing databases already at this revision are not rerun.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_postgresql_bootstrap"
down_revision = "0001_adopt_existing_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        raise RuntimeError("Kidareh schema migrations require PostgreSQL.")
    op.create_table('auth_flows',
    sa.Column('id', sa.TEXT(), nullable=False),
    sa.Column('phone', sa.TEXT(), nullable=False),
    sa.Column('state', sa.TEXT(), nullable=False),
    sa.Column('challenge_id', sa.TEXT(), nullable=False),
    sa.Column('terms_accepted_at', sa.TEXT(), nullable=False),
    sa.Column('expires_at', sa.REAL(), nullable=False),
    sa.Column('created_at', sa.REAL(), nullable=False),
    sa.Column('updated_at', sa.REAL(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_auth_flows_state_expiry', 'auth_flows', ['state', 'expires_at'], unique=False)
    op.create_table('content_reports',
    sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('reporter_id', sa.INTEGER(), nullable=False),
    sa.Column('target_type', sa.TEXT(), nullable=False),
    sa.Column('target_id', sa.INTEGER(), nullable=False),
    sa.Column('reason', sa.TEXT(), nullable=False),
    sa.Column('details', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('status', sa.TEXT(), server_default=sa.text("'open'"), nullable=False),
    sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('reviewed_at', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.CheckConstraint("target_type IN ('listing'...[truncated]    sa.Column('starts_at', sa.TEXT(), nullable=False),
    sa.Column('ends_at', sa.TEXT(), nullable=False),
    sa.Column('status', sa.TEXT(), server_default=sa.text("'active'"), nullable=False),
    sa.Column('order_id', sa.INTEGER(), nullable=False),
    sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_listing_tags_listing_status', 'listing_tags', ['listing_id', 'status', 'ends_at'], unique=False)
    op.create_index('idx_listing_tags_order', 'listing_tags', ['order_id'], unique=1)
    op.create_table('listings',
    sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('title', sa.TEXT(), nullable=False),
    sa.Column('category', sa.TEXT(), nullable=False),
    sa.Column('city', sa.TEXT(), nullable=False),
    sa.Column('price', sa.INTEGER(), server_default=sa.text('0'), nullable=False),
    sa.Column('description', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('emoji', sa.TEXT(), server_default=sa.text("'🛍️'"), nullable=False),
    sa.Column('featured', sa.INTEGER(), server_default=sa.text('0'), nullable=False),
    sa.Column('image_path', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('seller_phone', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('owner_id', sa.INTEGER(), nullable=True),
    sa.Column('store_id', sa.INTEGER(), nullable=True),
    sa.Column('latitude', sa.REAL(), nullable=True),
    sa.Column('longitude', sa.REAL(), nullable=True),
    sa.Column('availability_status', sa.TEXT(), server_default=sa.text("'ask'"), nullable=False),
    sa.Column('price_updated_at', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('featured_until', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.PrimaryKeyConstraint('id...[truncated]    )
    op.create_index('idx_otp_challenges_phone_created', 'otp_challenges', ['phone', 'created_at'], unique=False)
    op.create_table('otp_rate_limits',
    sa.Column('scope', sa.TEXT(), nullable=False),
    sa.Column('key_hash', sa.TEXT(), nullable=False),
    sa.Column('last_sent_at', sa.REAL(), server_default=sa.text('0'), nullable=False),
    sa.Column('window_started_at', sa.REAL(), server_default=sa.text('0'), nullable=False),
    sa.Column('request_count', sa.INTEGER(), server_default=sa.text('0'), nullable=False),
    sa.PrimaryKeyConstraint('scope', 'key_hash')
    )
    op.create_index('idx_otp_rate_limits_window', 'otp_rate_limits', ['window_started_at'], unique=False)
    op.create_table('rate_limits',
    sa.Column('scope', sa.TEXT(), nullable=False),
    sa.Column('key_hash', sa.TEXT(), nullable=False),
    sa.Column('last_request_at', sa.REAL(), server_default=sa.text('0'), nullable=False),
    sa.Column('window_started_at', sa.REAL(), server_default=sa.text('0'), nullable=False),
    sa.Column('request_count', sa.INTEGER(), server_default=sa.text('0'), nullable=False),
    sa.PrimaryKeyConstraint('scope', 'key_hash')
    )
    op.create_index('idx_rate_limits_window', 'rate_limits', ['window_started_at'], unique=False)
    op.create_table('schema_migrations',
    sa.Column('version', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('applied_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('version')
    )
    op.create_table('store_promotions',
    sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('store_id', sa.INTEGER(), nullable=False),
    sa.Column('user_id', sa.INTEGER(), nullable=False),
    sa.Column('package_id', sa.TEXT(), nullable=False),
    sa.Column('starts_at', sa.TEXT(), nullable=False),
    sa.Column('ends_at', sa.TEXT(), nullable=False),
    sa.Column('status', sa.TEXT(), server_default=sa.text("'active'"), nullable=False),
    sa.Colu...[truncated]    sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('user_id', sa.INTEGER(), nullable=False),
    sa.Column('kind', sa.TEXT(), nullable=False),
    sa.Column('title', sa.TEXT(), nullable=False),
    sa.Column('body', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('target_url', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('read_at', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_notifications_user_unread', 'in_app_notifications', ['user_id', 'read_at', 'id'], unique=False)
    op.create_table('saved_products',
    sa.Column('user_id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('listing_id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id', 'listing_id')
    )
    op.create_index('idx_saved_products_user', 'saved_products', ['user_id', 'created_at'], unique=False)
    op.create_table('stores',
    sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('owner_id', sa.INTEGER(), nullable=True),
    sa.Column('name', sa.TEXT(), nullable=False),
    sa.Column('city', sa.TEXT(), nullable=False),
    sa.Column('description', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('category', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('contact_name', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa.Column('address', sa.TEXT(), server_default=sa.text("''"), nullable=False),
    sa....[truncated]    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id', 'store_id')
    )
    op.create_index('idx_store_follows_store', 'store_follows', ['store_id', 'user_id'], unique=False)
    op.create_table('support_messages',
    sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False),
    sa.Column('ticket_id', sa.INTEGER(), nullable=False),
    sa.Column('sender_id', sa.INTEGER(), nullable=False),
    sa.Column('body', sa.TEXT(), nullable=False),
    sa.Column('is_admin_reply', sa.INTEGER(), server_default=sa.text('0'), nullable=False),
    sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_support_messages_ticket', 'support_messages', ['ticket_id', 'id'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        raise RuntimeError("Kidareh schema migrations require PostgreSQL.")
    op.drop_table('support_messages')
    op.drop_table('store_follows')
    op.drop_table('support_tickets')
    op.drop_table('stores')
    op.drop_table('saved_products')
    op.drop_table('in_app_notifications')
    op.drop_table('conversation_messages')
    op.drop_table('users')
    op.drop_table('store_promotions')
    op.drop_table('schema_migrations')
    op.drop_table('rate_limits')
    op.drop_table('otp_rate_limits')
    op.drop_table('otp_challenges')
    op.drop_table('monetization_orders')
    op.drop_table('listings')
    op.drop_table('listing_tags')
    op.drop_table('conversations')
    op.drop_table('content_reports')
    op.drop_table('auth_flows')
