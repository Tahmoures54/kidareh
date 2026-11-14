"""SQLAlchemy 2.x store repository."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from kidareh.infrastructure.database.repository import Repository
from .models import Store


class StoreRepository(Repository):
    def __init__(self, session: Session):
        super().__init__(session, Store())

    def by_city(self, city: str, *, limit: int = 100):
        statement = select(self.model).where(self.model.city == city).order_by(
            self.model.id.desc()
        ).limit(min(max(limit, 1), 200))
        return list(self.session.scalars(statement).all())
