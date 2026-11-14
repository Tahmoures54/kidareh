"""Shared SQLAlchemy type helpers and conventions."""
from sqlalchemy import BigInteger, Integer

# SQLite autoincrement requires the exact INTEGER primary-key type.
PK_TYPE = BigInteger().with_variant(Integer, "sqlite")

__all__ = ["PK_TYPE"]
