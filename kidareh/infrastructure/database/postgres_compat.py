"""PostgreSQL helpers for incremental legacy-SQL migration.

Not wired into the live adapter yet. This translates positional placeholders
only; it does not make SQLite-specific SQL portable.
"""
from __future__ import annotations

from collections.abc import Sequence


def qmark_to_format(sql: str, parameters: Sequence[object]) -> tuple[str, tuple[object, ...]]:
    """Translate positional ? binds to psycopg %s binds without changing quoted text."""
    if not isinstance(sql, str):
        raise TypeError("sql must be a string")
    if isinstance(parameters, (str, bytes, bytearray)):
        raise TypeError("parameters must be a positional sequence")
    values = tuple(parameters)
    output: list[str] = []
    i = 0
    bind_count = 0
    state = "normal"
    dollar_tag: str | None = None

    while i < len(sql):
        char = sql[i]
        nxt = sql[i + 1] if i + 1 < len(sql) else ""

        if state == "normal":
            if char == "'":
                state = "single"
                output.append(char)
            elif char == '"':
                state = "double"
                output.append(char)
            elif char == "`":
                state = "backtick"
                output.append(char)
            elif char == "[":
                state = "bracket"
                output.append(char)
            elif char == "-" and nxt == "-":
                state = "line_comment"
                output.extend((char, nxt))
                i += 1
            elif char == "/" and nxt == "*":
                state = "block_comment"
                output.extend((char, nxt))
                i += 1
            elif char == "$":
                end = sql.find("$", i + 1)
                if end != -1:
                    tag_body = sql[i + 1:end]
                    if all(c.isalnum() or c == "_" for c in tag_body) and (not tag_body or not tag_body[0].isdigit()):
                        dollar_tag = sql[i:end + 1]
                        state = "dollar"
                        output.append(dollar_tag)
                        i = end
                    else:
                        output.append(char)
                else:
                    output.append(char)
            elif char == "?":
                output.append("%s")
                bind_count += 1
            else:
                output.append(char)
        elif state == "single":
            output.append(char)
            if char == "'" and nxt == "'":
                output.append(nxt)
                i += 1
            elif char == "'":
                state = "normal"
            elif char == "\\" and nxt:
                output.append(nxt)
                i += 1
        elif state == "double":
            output.append(char)
            if char == '"' and nxt == '"':
                output.append(nxt)
                i += 1
            elif char == '"':
                state = "normal"
        elif state == "backtick":
            output.append(char)
            if char == "`" and nxt == "`":
                output.append(nxt)
                i += 1
            elif char == "`":
                state = "normal"
        elif state == "bracket":
            output.append(char)
            if char == "]" and nxt == "]":
                output.append(nxt)
                i += 1
            elif char == "]":
                state = "normal"
        elif state == "line_comment":
            output.append(char)
            if char == "\n":
                state = "normal"
        elif state == "block_comment":
            output.append(char)
            if char == "*" and nxt == "/":
                output.append(nxt)
                i += 1
                state = "normal"
        elif state == "dollar":
            assert dollar_tag is not None
            if sql.startswith(dollar_tag, i):
                output.append(dollar_tag)
                i += len(dollar_tag) - 1
                state = "normal"
                dollar_tag = None
            else:
                output.append(char)
        i += 1

    if bind_count != len(values):
        raise ValueError(f"SQL has {bind_count} positional placeholders but {len(values)} parameter values were supplied")
    return "".join(output), values
