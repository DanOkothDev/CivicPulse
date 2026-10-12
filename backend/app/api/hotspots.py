
import math

from flask import Blueprint, jsonify, request
from geoalchemy2 import Geometry
from sqlalchemy import cast, func

from ..auth_utils import roles_required
from ..extensions import db
from ..models import Category, Hotspot
from ..hotspot_service import recompute_hotspots

bp = Blueprint("hotspots", __name__)


@bp.get("/hotspots")
def list_hotspots():
    lon = func.ST_X(cast(Hotspot.center, Geometry)).label("lon")
    lat = func.ST_Y(cast(Hotspot.center, Geometry)).label("lat")

    rows = (
        db.session.query(Hotspot, lon, lat, Category.name)
        .outerjoin(Category, Category.id == Hotspot.top_category_id)
        .order_by(Hotspot.report_count.desc())
        .all()
    )

    return jsonify([
        {
            "id": hotspot.id,
            "center": {"lat": latitude, "lon": longitude},
            "radius_m": hotspot.radius_m,
            "report_count": hotspot.report_count,
            "top_category_id": hotspot.top_category_id,
            "top_category": category_name,
            "computed_at": hotspot.computed_at.isoformat(),
        }
        for hotspot, longitude, latitude, category_name in rows
    ])


@bp.post("/hotspots/recompute")
@roles_required("verifier", "admin")
def recompute():
    payload = request.get_json(silent=True) or {}

    try:
        eps_m = float(payload.get("eps_m", 250))
        min_samples = int(payload.get("min_samples", 3))
    except (TypeError, ValueError):
        return jsonify(error={
            "code": "invalid_parameters",
            "message": "eps_m must be numeric and min_samples must be an integer",
        }), 400

    if not math.isfinite(eps_m) or eps_m <= 0 or min_samples < 1:
        return jsonify(error={
            "code": "invalid_parameters",
            "message": "eps_m must be positive and min_samples at least 1",
        }), 400

    try:
        result = recompute_hotspots(eps_m=eps_m, min_samples=min_samples)
    except ValueError as exc:
        return jsonify(error={
            "code": "invalid_parameters",
            "message": str(exc),
        }), 400

    return jsonify(result), 200
