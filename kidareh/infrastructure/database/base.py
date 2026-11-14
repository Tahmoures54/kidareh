"""SQLAlchemy 2.x declarative foundation for Kidareh's database layer."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base metadata shared by every ORM model."""


# Tables are reflected after the legacy, idempotent schema bootstrap has run.
# This lets the ORM adopt existing installations without rewriting their data.
