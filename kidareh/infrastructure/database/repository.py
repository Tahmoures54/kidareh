"""Small SQLAlchemy 2.x repository base for feature-owned data access."""
from __future__ import annotations
from typing import Any, Generic, TypeVar
from sqlalchemy import select
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class Repository(Generic[ModelT]):
    def __init__(self, session: Session, model: type[ModelT]):
        self.session = session
        self.model = model

    def get(self, entity_id: Any) -> ModelT | None:
        return self.session.get(self.model, entity_id)

    def add(self, entity: ModelT) -> ModelT:
        self.session.add(entity)
        self.session.flush()
        return entity

    def delete(self, entity: ModelT) -> None:
        self.session.delete(entity)

    def list(self, *, limit: int = 100, offset: int = 0) -> list[ModelT]:
        statement = select(self.model).limit(max(1, min(limit, 500))).offset(max(0, offset))
        return list(self.session.scalars(statement).all())
