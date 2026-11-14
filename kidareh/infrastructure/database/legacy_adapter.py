"""SQLAlchemy-backed compatibility adapter for the existing route SQL.

The application is migrated off sqlite3 connections without forcing a risky,
all-at-once rewrite of its 100+ parameterized statements. Route SQL is executed
through SQLAlchemy 2.x Engine/Connection (exec_driver_sql); the small row/result
adapter preserves the sqlite3.Row behaviours used by the current code.
New feature code should use ORM sessions and repositories instead.
"""
from __future__ import annotations

from typing import Any, Iterable

from sqlalchemy.engine import Connection, CursorResult


class CompatibleRow(dict):
    """Mapping row supporting both row['column'] and row[0] access."""

    def __init__(self, keys: Iterable[str], values: Iterable[Any]):
        self._ordered_keys = tuple(keys)
        super().__init__(zip(self._ordered_keys, values))

    def __getitem__(self, key):
        if isinstance(key, int):
            key = self._ordered_keys[key]
        return super().__getitem__(key)


class CompatibleResult:
    """Subset of sqlite cursor result methods used by Kidareh routes."""

    def __init__(self, result: CursorResult):
        self._result = result
        self.lastrowid = result.lastrowid
        self.rowcount = result.rowcount
        self._keys = tuple(result.keys()) if result.returns_rows else ()

    def _wrap(self, row):
        return None if row is None else CompatibleRow(self._keys, row)

    def fetchone(self):
        return self._wrap(self._result.fetchone())

    def fetchall(self):
        return [self._wrap(row) for row in self._result.fetchall()]

    def fetchmany(self, size: int | None = None):
        rows = self._result.fetchmany(size) if size is not None else self._result.fetchmany()
        return [self._wrap(row) for row in rows]

    def __iter__(self):
        for row in self._result:
            yield self._wrap(row)


class SQLAlchemyConnectionAdapter:
    """Keep the legacy execute API while using a pooled SQLAlchemy connection."""

    def __init__(self, connection: Connection):
        self._connection = connection

    def execute(self, statement: str, parameters: Any = ()) -> CompatibleResult:
        if not isinstance(statement, str):
            # Allow SQLAlchemy expressions in new code during the transition.
            result = self._connection.execute(statement, parameters or {})
        else:
            # sqlite3 accepts a flat list as one positional parameter set.
            # SQLAlchemy 2.x interprets a list as executemany input, which
            # rejects scalar members (the /api/listings route passes a list).
            # Normalize flat positional lists while preserving mappings and
            # explicit sequences of parameter sets for callers that need them.
            if isinstance(parameters, list) and (
                not parameters or not isinstance(parameters[0], (tuple, dict))
            ):
                parameters = tuple(parameters)
            result = self._connection.exec_driver_sql(statement, parameters or ())
        return CompatibleResult(result)

    def executemany(
        self, statement: str, parameters: Iterable[Iterable[Any]]
    ) -> CompatibleResult:
        """Execute one driver-level statement for multiple parameter sets.

        SQLAlchemy 2.x Connection intentionally has no ``executemany`` method;
        ``exec_driver_sql`` selects DB-API executemany when given a sequence of
        parameter sets. Keep this method for the legacy sqlite3 call sites.
        """
        if not isinstance(statement, str):
            raise TypeError("executemany requires a driver SQL string")
        parameter_sets = list(parameters)
        if not parameter_sets:
            # Match sqlite3.executemany: an empty parameter sequence is a no-op.
            result = self._connection.exec_driver_sql("SELECT 1 WHERE 0")
        else:
            result = self._connection.exec_driver_sql(statement, parameter_sets)
        return CompatibleResult(result)

    def commit(self) -> None:
        if self._connection.in_transaction():
            self._connection.commit()

    def rollback(self) -> None:
        if self._connection.in_transaction():
            self._connection.rollback()

    def close(self) -> None:
        self._connection.close()

    def __getattr__(self, name: str):
        return getattr(self._connection, name)
