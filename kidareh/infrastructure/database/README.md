# Database layer — PostgreSQL + SQLAlchemy 2.x

PostgreSQL/Neon is the only supported application database. The application requires
`DATABASE_URL` and fails closed if a deployment attempts to select SQLite.

The data layer uses an application-scoped SQLAlchemy 2.x engine, declarative metadata,
transaction-scoped Session factory, ORM mappings, and Alembic schema revisions.
`get_database()` returns the Flask extension; `session_scope()` provides
commit/rollback/close semantics.

```python
from kidareh.infrastructure.database import get_database

with get_database().session_scope() as session:
    User = get_database().models["users"]
    user = session.get(User, 1)
```

The account, listing, and store domains include repository implementations using
`select()` and `Session`. Legacy HTTP routes temporarily use a SQLAlchemy-backed
connection adapter while service/repository extraction continues. This adapter does
not open a local database file.

## Alembic

Alembic owns the PostgreSQL schema lifecycle. Apply revisions with:

```bash
python -m alembic upgrade head
```

The bootstrap revision provisions a fresh empty PostgreSQL schema from the
version-controlled PostgreSQL schema modules. No user or business records are
copied from a file database. The downgrade of the initial schema is intentionally
blocked because dropping domain tables is destructive.

## Runtime rules

- Configure `DATABASE_URL` in every deployed environment.
- Use the Neon pooled URL for application traffic; use a separate direct URL for
  migrations only when the platform requires it.
- Never log or commit connection credentials.
- SQLite remains only as a temporary test fixture for legacy route tests and is
  rejected by non-test application startup.
