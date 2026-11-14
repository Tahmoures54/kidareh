"""Tests for PostgreSQL legacy SQL placeholder translation."""
import pytest

from kidareh.infrastructure.database.postgres_compat import qmark_to_format


def test_translates_positional_placeholders():
    sql, params = qmark_to_format(
        "SELECT id FROM listings WHERE city=? AND price>=? ORDER BY id",
        ["تهران", 100],
    )
    assert sql == "SELECT id FROM listings WHERE city=%s AND price>=%s ORDER BY id"
    assert params == ("تهران", 100)


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("SELECT '?' AS literal, id FROM t WHERE id=?", "SELECT '?' AS literal, id FROM t WHERE id=%s"),
        ('SELECT "?" FROM t WHERE id=?', 'SELECT "?" FROM t WHERE id=%s'),
        ("SELECT `?` FROM t WHERE id=?", "SELECT `?` FROM t WHERE id=%s"),
        ("SELECT [?] FROM t WHERE id=?", "SELECT [?] FROM t WHERE id=%s"),
        ("SELECT 1 -- ? ignored\nWHERE id=?", "SELECT 1 -- ? ignored\nWHERE id=%s"),
        ("SELECT 1 /* ? ignored */ WHERE id=?", "SELECT 1 /* ? ignored */ WHERE id=%s"),
        ("SELECT $$ ? $$, id FROM t WHERE id=?", "SELECT $$ ? $$, id FROM t WHERE id=%s"),
        ("SELECT $body$ ? $body$, id FROM t WHERE id=?", "SELECT $body$ ? $body$, id FROM t WHERE id=%s"),
        ("SELECT 'it''s ?' FROM t WHERE id=?", "SELECT 'it''s ?' FROM t WHERE id=%s"),
    ],
)
def test_ignores_question_marks_outside_bind_positions(source, expected):
    translated, params = qmark_to_format(source, (7,))
    assert translated == expected
    assert params == (7,)


def test_preserves_sql_without_parameters():
    assert qmark_to_format("SELECT 1", ()) == ("SELECT 1", ())


def test_rejects_placeholder_parameter_count_mismatch():
    with pytest.raises(ValueError, match="1 positional placeholders"):
        qmark_to_format("SELECT * FROM t WHERE id=?", ())


def test_rejects_string_as_parameter_container():
    with pytest.raises(TypeError, match="positional sequence"):
        qmark_to_format("SELECT ?", "not-a-parameter-list")


def test_rejects_non_string_sql():
    with pytest.raises(TypeError, match="sql must be a string"):
        qmark_to_format(None, ())
