"""Preserve SQLite binary64 precision in PostgreSQL numeric columns.

Revision ID: 0004_double_precision_epoch_columns
Revises: 0003_listings_search_vector

PostgreSQL REAL is binary32. Unix epoch timestamps stored in REAL lose enough
precision to break OTP cooldown and rate-limit comparisons. SQLite REAL is
binary64, so these columns must be DOUBLE PRECISION in PostgreSQL.
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_double_precision_epoch_columns"
down_revision = "0003_listings_search_vector"
branch_labels = None
depends_on = None

_COLUMNS = {
    "auth_flows": ("expires_at", "created_at", "updated_at"),
    "listings": ("latitude", "longitude"),
    "otp_challenges": ("expires_at", "consumed_at", "created_at"),
    "otp_rate_limits": ("last_sent_at", "window_started_at"),
    "rate_limits": ("last_request_at", "window_started_at"),
    "stores": ("latitude", "longitude"),
}


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        raise RuntimeError("Kidareh precision migration requires PostgreSQL.")

    inspector = sa.inspect(bind)
    for table_name, column_names in _COLUMNS.items():
        if not inspector.has_table(table_name):
            raise RuntimeError(
                f"Required PostgreSQL table is missing during precision migration: {table_name}"
            )
        existing = {
            column["name"]: column["type"]
            for column in inspector.get_columns(table_name)
        }
        for column_name in column_names:
            if column_name not in existing:
                raise RuntimeError(
                    f"Required PostgreSQL column is missing: {table_name}.{column_name}"
                )
            current_type = str(existing[column_name]).upper()
            if current_type == "REAL":
                op.alter_column(
                    table_name,
                    column_name,
                    existing_type=sa.REAL(),
                    type_=sa.DOUBLE_PRECISION(),
                    postgresql_using=f'"{column_name}"::DOUBLE PRECISION',
                )
            elif current_type != "DOUBLE PRECISION":
                raise RuntimeError(
                    f"Unexpected type for {table_name}.{column_name}: {current_type}"
                )


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade would discard floating-point precision. Restore a verified "
        "backup instead of converting DOUBLE PRECISION back to REAL."
    )
