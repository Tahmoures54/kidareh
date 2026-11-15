"""Tests for PostgreSQL connection URL normalization."""
import pytest

from kidareh.infrastructure.database.session import normalize_database_url


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        (
            "postgres://user:secret@host.example/db?sslmode=require",
            "postgresql+psycopg://user:secret@host.example/db?sslmode=require",
        ),
        (
            "postgresql://user:secret@host.example/db",
            "postgresql+psycopg://user:secret@host.example/db",
        ),
        (
            "postgresql+psycopg://user:secret@host.example/db",
            "postgresql+psycopg://user:secret@host.example/db",
        ),
    ],
)
def test_normalize_postgres_urls(source, expected):
    assert normalize_database_url(source) == expected


@pytest.mark.parametrize("source", ["", "   "])
def test_rejects_empty_database_url(source):
    with pytest.raises(ValueError, match="must not be empty"):
        normalize_database_url(source)


@pytest.mark.parametrize("source", ["sqlite:///app.db", "mysql://host/db", "https://host/db"])
def test_rejects_non_postgres_database_url(source):
    with pytest.raises(ValueError, match="must use postgres"):
        normalize_database_url(source)
