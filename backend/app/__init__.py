import os
import tempfile

from flask import Flask

from .api import register_blueprints
from .cli import register_cli
from .config import Config, validate_config
from .errors import register_errors
from .extensions import cors, db, jwt, migrate
from .models import Area, Category, County


def _production_upload_folder_is_writable(folder):
    """Probe write access without touching any existing upload."""
    probe_path = None
    try:
        descriptor, probe_path = tempfile.mkstemp(prefix='.civicpulse-write-test-', dir=folder)
        os.close(descriptor)
        os.remove(probe_path)
        probe_path = None
        return True
    except OSError:
        if probe_path is not None:
            try:
                os.remove(probe_path)
            except OSError:
                pass
        return False


def create_app(config=None):
    """App factory: builds a configured app, so tests can create their own."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)
    validate_config(app.config)
    folder = app.config['UPLOAD_FOLDER']
    if not os.path.isabs(folder):  # keep uploads inside the backend folder, wherever you run from
        app.config['UPLOAD_FOLDER'] = os.path.abspath(os.path.join(app.root_path, '..', folder))
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except OSError:
        if str(app.config.get('CIVICPULSE_ENV', '')).strip().lower() == 'production':
            raise ValueError(
                'Invalid production configuration: UPLOAD_FOLDER must be a writable directory.'
            ) from None
        raise
    if str(app.config.get('CIVICPULSE_ENV', '')).strip().lower() == 'production':
        try:
            upload_folder_is_directory = os.path.isdir(app.config['UPLOAD_FOLDER'])
        except OSError:
            upload_folder_is_directory = False
        if (not upload_folder_is_directory
                or not _production_upload_folder_is_writable(app.config['UPLOAD_FOLDER'])):
            raise ValueError('Invalid production configuration: UPLOAD_FOLDER must be a writable directory.') from None

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': app.config['CORS_ORIGINS']}})

    from . import models  # noqa: F401  (registers tables with SQLAlchemy)
    register_errors(app)
    register_blueprints(app)
    register_cli(app)
    return app
