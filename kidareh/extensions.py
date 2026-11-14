"""Flask extension registry notes.

The application factory wires the SQLAlchemy database and the Kidareh cache
through ``app.extensions``. The cache key is ``kidareh_cache``.
"""
