from .analytics import bp as analytics_bp
from .auth import bp as auth_bp
from .duplicates import bp as duplicates_bp
from .health import bp as health_bp
from .hotspots import bp as hotspots_bp
from .media import bp as media_bp
from .notifications import bp as notifications_bp
from .reference import bp as reference_bp
from .reports import bp as reports_bp
from .users import bp as users_bp
from .workflow import bp as workflow_bp

API_PREFIX = '/api/v1'


def register_blueprints(app):
    for bp in (
        health_bp,
        reference_bp,
        auth_bp,
        reports_bp,
        workflow_bp,
        users_bp,
        duplicates_bp,
        notifications_bp,
        analytics_bp,
        hotspots_bp,
    ):
        app.register_blueprint(bp, url_prefix=API_PREFIX)
    app.register_blueprint(media_bp)  # photos served outside /api/v1