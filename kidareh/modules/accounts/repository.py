"""SQLAlchemy 2.x account repository."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from kidareh.infrastructure.database.repository import Repository
from .models import User


class UserRepository(Repository):
    def __init__(self, session: Session):
        super().__init__(session, User())

    def by_id(self, user_id: int):
        return self.get(user_id)

    def by_phone(self, phone: str):
        return self.session.scalar(select(self.model).where(self.model.phone == phone))

    def by_role(self, role: str, *, limit: int = 100):
        statement = select(self.model).where(self.model.role == role).limit(min(limit, 500))
        return list(self.session.scalars(statement).all())
