"""Account ORM model accessors (mapped from the deployed users table)."""
from kidareh.infrastructure.database.session import get_database


def User():
    """Return the SQLAlchemy mapped User class after database initialization."""
    return get_database().models["users"]
