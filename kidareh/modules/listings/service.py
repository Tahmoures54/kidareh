"""Application services for read-only listing queries."""
from __future__ import annotations

from sqlalchemy.orm import Session

from .repository import ListingRepository


class ListingService:
    """Transaction-bound listing query service used by non-HTTP callers."""

    def __init__(self, session: Session):
        self.listings = ListingRepository(session)

    def list_by_city(self, city: str, *, limit: int = 50):
        return self.listings.by_city(city, limit=limit)

    def list_by_owner(self, owner_id: int, *, limit: int = 100):
        return self.listings.by_owner(owner_id, limit=limit)
