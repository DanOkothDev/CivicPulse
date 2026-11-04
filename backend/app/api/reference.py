import json
import math

from flask import Blueprint, jsonify, request
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import cast, func, text
from sqlalchemy.exc import IntegrityError

from ..auth_utils import roles_required
from ..errors import ApiError
from ..extensions import db
from ..models import Area, Category

bp = Blueprint('reference', __name__)


def _json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON object', 422)
    return data


def _area_json(area):
    boundary = db.session.query(func.ST_AsGeoJSON(cast(Area.boundary, Geometry))).filter(
        Area.id == area.id
    ).scalar()
    return {'id': area.id, 'name': area.name, 'boundary': json.loads(boundary) if boundary else None}


def _polygon_wkt(value):
    if (not isinstance(value, dict) or value.get('type') != 'Polygon'
            or not isinstance(value.get('coordinates'), list) or not value['coordinates']):
        raise ApiError('validation_error', 'Boundary must be a GeoJSON Polygon', 422, {
            'boundary': 'Provide a GeoJSON Polygon',
        })

    rings = []
    for ring in value['coordinates']:
        if not isinstance(ring, list) or len(ring) < 4:
            raise ApiError('validation_error', 'Polygon rings need at least four coordinates', 422, {
                'boundary': 'Each ring must have at least four coordinates',
            })
        points = []
        for point in ring:
            if (not isinstance(point, list) or len(point) != 2
                    or any(isinstance(coord, bool) or not isinstance(coord, (int, float))
                           for coord in point)):
                raise ApiError('validation_error', 'Boundary coordinates must be valid [longitude, latitude] pairs',
                               422, {'boundary': 'Coordinates must be finite longitude/latitude pairs'})
            try:
                lon, lat = map(float, point)
            except OverflowError:
                lon, lat = math.inf, math.inf
            if not math.isfinite(lon) or not math.isfinite(lat) or not -180 <= lon <= 180 or not -90 <= lat <= 90:
                raise ApiError('validation_error', 'Boundary coordinates must be valid [longitude, latitude] pairs',
                               422, {'boundary': 'Coordinates must be finite longitude/latitude pairs'})
            points.append(f'{lon} {lat}')
        if ring[0] != ring[-1]:
            raise ApiError('validation_error', 'Polygon rings must be closed', 422, {
                'boundary': 'Close each ring by repeating its first coordinate',
            })
        rings.append(f'({", ".join(points)})')

    return f'POLYGON({", ".join(rings)})'


def _validated_boundary(value):
    if value is None:
        return None
    wkt = _polygon_wkt(value)
    valid, reason = db.session.execute(
        text('SELECT ST_IsValid(ST_GeomFromText(:wkt, 4326)), '
             'ST_IsValidReason(ST_GeomFromText(:wkt, 4326))'),
        {'wkt': wkt},
    ).one()
    if not valid:
        raise ApiError('validation_error', 'Boundary polygon is invalid', 422, {'boundary': reason})
    return WKTElement(wkt, srid=4326)


@bp.get('/categories')
def categories():
    rows = Category.query.order_by(Category.id).all()
    return jsonify([{'id': c.id, 'name': c.name, 'icon': c.icon} for c in rows])


@bp.get('/areas')
def areas():
    rows = Area.query.order_by(Area.name).all()
    return jsonify([_area_json(area) for area in rows])


@bp.post('/categories')
@roles_required('admin')
def create_category():
    data = _json_object()
    name = str(data.get('name') or '').strip()
    icon = str(data.get('icon') or '').strip() or None
    errors = {}
    if not name:
        errors['name'] = 'Name is required'
    elif len(name) > 60:
        errors['name'] = 'Name must be 60 characters or fewer'
    if icon and len(icon) > 40:
        errors['icon'] = 'Icon must be 40 characters or fewer'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)
    if Category.query.filter_by(name=name).first():
        raise ApiError('category_exists', 'A category with this name already exists', 409)

    category = Category(name=name, icon=icon)
    db.session.add(category)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError('category_exists', 'A category with this name already exists', 409)
    return jsonify(id=category.id, name=category.name, icon=category.icon), 201


@bp.post('/areas')
@roles_required('admin')
def create_area():
    data = _json_object()
    name = str(data.get('name') or '').strip()
    if not name or len(name) > 120:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, {
            'name': 'Name is required and must be 120 characters or fewer',
        })
    if Area.query.filter_by(name=name).first():
        raise ApiError('area_exists', 'An area with this name already exists', 409)

    boundary = _validated_boundary(data.get('boundary'))
    area = Area(name=name, boundary=boundary)
    db.session.add(area)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError('area_exists', 'An area with this name already exists', 409)
    return jsonify(_area_json(area)), 201


@bp.patch('/areas/<int:area_id>')
@roles_required('admin')
def update_area(area_id):
    area = db.session.get(Area, area_id)
    if area is None:
        raise ApiError('not_found', 'Area not found', 404)
    data = _json_object()
    if 'boundary' not in data:
        raise ApiError('validation_error', 'Send a boundary (GeoJSON Polygon or null)', 422, {
            'boundary': 'Boundary is required',
        })
    area.boundary = _validated_boundary(data['boundary'])
    db.session.commit()
    return jsonify(_area_json(area))
