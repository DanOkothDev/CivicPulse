from flask import Blueprint, jsonify

from ..models import Area, Category

bp = Blueprint('reference', __name__)


@bp.get('/categories')
def categories():
    rows = Category.query.order_by(Category.id).all()
    return jsonify([{'id': c.id, 'name': c.name, 'icon': c.icon} for c in rows])


@bp.get('/areas')
def areas():
    rows = Area.query.order_by(Area.name).all()
    return jsonify([{'id': a.id, 'name': a.name} for a in rows])
