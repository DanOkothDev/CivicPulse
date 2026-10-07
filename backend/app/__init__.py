import os

from flask import Flask

from .api import register_blueprints
from .cli import register_cli
from .config import Config
from .errors import register_errors
from .extensions import cors, db, jwt, migrate


def create_app(config=None):
    """App factory: builds a configured app, so tests can create their own."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': app.config['CORS_ORIGINS']}})

    from . import models  # noqa: F401  (registers tables with SQLAlchemy)
    register_errors(app)
    register_blueprints(app)
    register_cli(app)
    return app
