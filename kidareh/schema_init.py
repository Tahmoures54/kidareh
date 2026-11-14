"""Coordinate feature-owned database schema setup during application initialization.

Schema definitions remain beside their owning feature for this incremental
refactor, but production startup prepares them before serving requests. The
initializers are intentionally idempotent so existing deployments can be
upgraded safely.

.. warning::
    The ``ensure_tables`` helpers currently live inside the route modules
    (``kidareh.routes.<feature>``). Importing them therefore pulls in Flask
    blueprints, decorators, and any import-time configuration reads. That is a
    layer inversion — schema setup belongs to the data layer, not the HTTP
    layer — and it makes ``initialize_database()`` fragile: an import error in
    any route module (a missing dependency, a typo in a decorator, a circular
    import) aborts the whole worker with a traceback that points at a route
    file, not at the schema.

    This module keeps the current layout working by importing lazily and by
    reporting the failing feature explicitly. The next refactor should move
    every ``ensure_tables`` into ``kidareh/schema/<feature>.py`` and leave a
    thin re-export behind in ``routes/<feature>.py`` for backward
    compatibility. At that point the warning above stops applying and the
    imports below become pure data-layer imports.
"""
import logging

logger = logging.getLogger(__name__)


def initialize_feature_schemas() -> None:
    """Initialize every feature-owned table before requests are served.

    Every initializer is idempotent, so this runs on each startup: databases
    that are already at the latest schema version still pick up tables added by
    a feature module after their last migration.

    Each feature is initialized in turn. Order is currently *not* load-bearing
    — no feature schema references another feature's tables through a foreign
    key, a view, or a trigger — but the list is kept explicit so that adding
    such a dependency later only requires moving the entry instead of
    reworking the loop. ``rate_limits`` comes first because it is the only
    ledger every other feature's write paths depend on at runtime, and
    ``monetization`` last because it also ``ALTER``s the ``stores`` and
    ``listings`` tables created by the baseline migration.

    A failure is logged with the feature name and re-raised. A broken schema is
    not something the application can recover from by ignoring it; retrying on
    the next request would leave the worker serving 500s until someone reads
    the logs. Failing fast lets the platform restart the worker cleanly and
    lets the operator act on a single, well-labelled error instead of a
    cascade of downstream ``no such table`` failures.
    """
    # Import lazily: importing ``kidareh.routes.*`` at module level would create
    # an import cycle (every route imports ``kidareh.core`` for ``get_connection``,
    # ``current_user`` and friends, while ``core`` imports this module during
    # ``initialize_database()``). The follow-up refactor removes this constraint
    # by moving the schema helpers out of the route modules entirely.
    from .services import rate_limits
    from .routes.auth import ensure_tables as initialize_auth
    from .routes.communications import ensure_tables as initialize_communications
    from .routes.moderation import ensure_tables as initialize_moderation
    from .routes.monetization import ensure_tables as initialize_monetization

    features = (
        ("rate_limits", rate_limits.ensure_tables),
        ("auth", initialize_auth),
        ("communications", initialize_communications),
        ("moderation", initialize_moderation),
        ("monetization", initialize_monetization),
    )

    for name, initializer in features:
        try:
            initializer()
        except Exception:
            # ``logger.exception`` writes the traceback *and* the feature name
            # at ERROR level, so it survives the default log level in
            # production. The bare ``raise`` lets the worker exit with the
            # original traceback so the operator has both the feature name and
            # the underlying SQL failure in one place.
            logger.exception("Feature schema initialization failed: %s", name)
            raise
        logger.debug("Feature schema ready: %s", name)