from .auth import bp as auth_bp
from .health import bp as health_bp
from .reference import bp as reference_bp

API_PREFIX = '/api/v1'


def register_blueprints(app):
    # Add new blueprints here (reports, notifications, analytics, admin...).
    for bp in (health_bp, reference_bp, auth_bp):
        app.register_blueprint(bp, url_prefix=API_PREFIX)