# Database migrations

Alembic is not activated yet. The live schema is currently initialized by `kidareh/core.py`, `kidareh/schema_init.py`, and feature route initializers. Do not run Alembic against production until models, baseline revision, SQLite/PostgreSQL compatibility tests, and a tested backup/restore plan exist.
