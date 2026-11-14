"""Store ORM model accessors (mapped from the deployed stores table)."""
from kidareh.infrastructure.database.session import get_database


def Store():
    return get_database().models["stores"]
