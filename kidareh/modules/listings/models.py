"""Listing ORM model accessors (mapped from the deployed listings table)."""
from kidareh.infrastructure.database.session import get_database


def Listing():
    return get_database().models["listings"]
