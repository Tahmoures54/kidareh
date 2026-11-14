"""Application services for account reads and access decisions."""
from __future__ import annotations

from sqlalchemy.orm import Session

from .repository import UserRepository


class AccountService:
    """Small transaction-bound account service; HTTP concerns stay in routes."""

    def __init__(self, session: Session):
        self.users = UserRepository(session)

    def get_user(self, user_id: int):
        return self.users.by_id(user_id)

    def get_user_by_phone(self, phone: str):
        return self.users.by_phone(phone)

    def list_users_by_role(self, role: str, *, limit: int = 100):
        return self.users.by_role(role, limit=limit)
