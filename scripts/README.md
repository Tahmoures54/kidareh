# Maintenance scripts

Database maintenance and schema changes are managed through PostgreSQL and Alembic.
SQLite backup/restore utilities have been removed because Kidareh no longer supports a
file-based application database.

- `python scripts/check_production.py`: validate deployment configuration.
- `python scripts/check_production.py --runtime`: verify PostgreSQL connectivity and core tables.
- `python -m alembic upgrade head`: apply versioned PostgreSQL schema migrations.
