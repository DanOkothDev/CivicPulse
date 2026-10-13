from flask import Blueprint, jsonify, request
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


@bp.get('/categories')
def categories():
    rows = Category.query.order_by(Category.id).all()
    return jsonify([{'id': c.id, 'name': c.name, 'icon': c.icon} for c in rows])


@bp.get('/areas')
def areas():
    rows = Area.query.order_by(Area.name).all()
    return jsonify([{'id': a.id, 'name': a.name} for a in rows])


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

    area = Area(name=name)
    db.session.add(area)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError('area_exists', 'An area with this name already exists', 409)
    return jsonify(id=area.id, name=area.name), 201
