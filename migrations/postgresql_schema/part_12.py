"""PostgreSQL schema DDL component."""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table('stores', sa.Column('id', sa.INTEGER(), sa.Identity(), nullable=False), sa.Column('owner_id', sa.INTEGER(), nullable=True), sa.Column('name', sa.TEXT(), nullable=False), sa.Column('city', sa.TEXT(), nullable=False), sa.Column('description', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('category', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('contact_name', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('address', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('hours', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('social_url', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.Column('in_person', sa.INTEGER(), server_default=sa.text('1'), nullable=False), sa.Column('created_at', sa.TEXT(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False), sa.Column('latitude', sa.DOUBLE_PRECISION(), nullable=True), sa.Column('longitude', sa.DOUBLE_PRECISION(), nullable=True), sa.Column('badge_until', sa.TEXT(), server_default=sa.text("''"), nullable=False), sa.ForeignKeyConstraint(['owner_id'], ['users.id']), sa.PrimaryKeyConstraint('id'), sa.UniqueConstraint('owner_id'))
    op.create_index('idx_stores_city_id', 'stores', ['city', 'id'], unique=False)
    op.create_index('idx_stores_geo', 'stores', ['latitude', 'longitude'], unique=False, postgresql_where=sa.text('latitude IS NOT NULL AND longitude IS NOT NULL'))


def downgrade() -> None:
    op.drop_table('stores')
