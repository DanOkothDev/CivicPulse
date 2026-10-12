import math

from flask import Blueprint, jsonify, request
from geoalchemy2 import Geometry
from sqlalchemy import cast, func

from ..auth_utils import roles_required
from ..errors import ApiError
from ..extensions import db
from ..hotspot_service import recompute_hotspots
from ..models import Category, Hotspot

bp = Blueprint('hotspots', __name__)
MAX_EPS_M = 20000


@bp.get('/analytics/hotspots')
@roles_required('authority', 'admin')
def list_hotspots():
    lon = func.ST_X(cast(Hotspot.center, Geometry)).label('lon')
    lat = func.ST_Y(cast(Hotspot.center, Geometry)).label('lat')
    rows = (db.session.query(Hotspot, lon, lat, Category.name)
            .outerjoin(Category, Category.id == Hotspot.top_category_id)
            .order_by(Hotspot.report_count.desc(), Hotspot.id).all())
    return jsonify([
        {'id': hotspot.id, 'center': {'lat': latitude, 'lon': longitude},
         'radius_m': hotspot.radius_m, 'report_count': hotspot.report_count,
         'top_category_id': hotspot.top_category_id, 'top_category': category_name,
         'computed_at': hotspot.computed_at.isoformat()}
        for hotspot, longitude, latitude, category_name in rows])


@bp.post('/analytics/hotspots/recompute')
@roles_required('admin')
def recompute():
    """Re-run the clustering now. It also refreshes by itself after new reports (see app/jobs.py)."""
    payload = request.get_json(silent=True)
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ApiError('invalid_parameters', 'Send a JSON object', 400)
    try:
        eps_m = float(payload.get('eps_m', 250))
        min_samples = int(payload.get('min_samples', 3))
    except (TypeError, ValueError):
        raise ApiError('invalid_parameters', 'eps_m must be numeric and min_samples must be an integer', 400)
    if not math.isfinite(eps_m) or not 0 < eps_m <= MAX_EPS_M or not 1 <= min_samples <= 1000:
        raise ApiError('invalid_parameters',
                       f'eps_m must be between 0 and {MAX_EPS_M} metres and min_samples between 1 and 1000', 400)
    return jsonify(recompute_hotspots(eps_m=eps_m, min_samples=min_samples))