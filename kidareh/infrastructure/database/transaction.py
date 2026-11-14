"""Transaction helpers backed by SQLAlchemy 2.x sessions."""
from contextlib import contextmanager
from typing import Iterator
from sqlalchemy.orm import Session
from .session import session_scope


@contextmanager
def transaction(session: Session | None = None) -> Iterator[Session]:
    """Open an owned transaction, or use a caller-owned session transaction."""
    if session is None:
        with session_scope() as owned:
            with owned.begin():
                yield owned
        return
    with session.begin_nested():
        yield session
