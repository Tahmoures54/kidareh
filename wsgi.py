"""WSGI entry point compatible with the existing application bootstrap.

The current main module loads environment settings, configures logging,
creates the Flask application, and initializes the current SQLite schema.
This module only exposes the same application object to WSGI servers.
"""
from main import app

__all__ = ["app"]
