"""Regression tests for the SQLite rate-limit transaction lock."""
from contextlib import contextmanager

from kidareh.services import rate_limits


class _Result:
    def fetchone(self):
        return None


class _Connection:
    def __init__(self, active=False):
        self.active = active
        self.statements = []

    def in_transaction(self):
        return self.active

    def execute(self, statement, parameters=()):
        self.statements.append(statement)
        if statement == "BEGIN IMMEDIATE":
            self.active = True
        return _Result()


def _run_consume(monkeypatch, connection):
    @contextmanager
    def fake_connection():
        yield connection

    monkeypatch.setattr(rate_limits, "get_connection", fake_connection)
    monkeypatch.setattr(rate_limits, "_prune", lambda *_args: None)
    return rate_limits.consume("test", "stable-key", limit=3, window_seconds=60)


def test_rate_limit_starts_immediate_transaction_when_connection_is_idle(monkeypatch):
    connection = _Connection(active=False)

    _run_consume(monkeypatch, connection)

    assert connection.statements[0] == "BEGIN IMMEDIATE"


def test_rate_limit_does_not_nest_immediate_transaction(monkeypatch):
    connection = _Connection(active=True)

    _run_consume(monkeypatch, connection)

    assert "BEGIN IMMEDIATE" not in connection.statements
