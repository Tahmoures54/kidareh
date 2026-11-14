# Database layer — SQLAlchemy 2.x

Kidareh now has an application-scoped SQLAlchemy 2.x engine, `DeclarativeBase`,
transaction-scoped `Session` factory, SQLite connection pragmas, and ORM mappings
for the initialized domain tables. `get_database()` returns the Flask extension;
`session_scope()` provides commit/rollback/close semantics.

```python
from kidareh.infrastructure.database import get_database

with get_database().session_scope() as session:
    User = get_database().models["users"]
    user = session.get(User, 1)
```

The account, listing, and store domains now include SQLAlchemy 2.x repository
implementations (`UserRepository`, `ListingRepository`, `StoreRepository`) using
`select()` and `Session`. The current HTTP route handlers still contain legacy
`sqlite3` statements; they are deliberately kept operational during this
compatibility phase while route/service behavior is migrated and regression-tested. The reflected mappings
adopt the real deployed schema after the existing idempotent bootstrap, avoiding
an unsafe table recreation or data copy. FTS5 virtual-table internals are excluded.

## Alembic

Alembic is configured in the repository root. The initial revision is a
non-destructive baseline because existing installations already have tables
managed by the application bootstrap. After changing ORM/domain schema, create a
reviewed revision with `alembic revision --autogenerate -m "describe change"`,
then apply with `alembic upgrade head`. Always back up production SQLite data
before schema changes.

`DATABASE_URL` is reserved and intentionally not activated. Both the ORM and
legacy adapter must point to the exact same SQLite file until all route SQL and
schema ownership have migrated. PostgreSQL is not supported by this release;
activating a second database URL prematurely could split reads and writes.
