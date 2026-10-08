from flask import Blueprint, jsonify
from sqlalchemy import text

from ..extensions import db
from ..jobqueue import queue_info

bp = Blueprint('health', __name__)


@bp.get('/health')
def health():
    """Checks the app, the database and the PostGIS extension are all alive."""
    postgis = db.session.execute(text('SELECT PostGIS_Version()')).scalar()
    return jsonify(status='ok', postgis=postgis, queue=queue_info())