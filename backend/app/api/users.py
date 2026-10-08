from flask import Blueprint, jsonify, request

from ..auth_utils import current_user, roles_required, serialize_user
from ..constants import ROLES
from ..errors import ApiError
from ..models import User

bp = Blueprint('users', __name__)


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@bp.get('/users')
@roles_required('verifier', 'authority', 'admin')
def list_users():
    """Admins can list any role. Verifiers and authorities can only list authority users
    (they need them for the 'assign to' dropdown) and don't see email addresses."""
    me = current_user()
    role = request.args.get('role')
    if role and role not in ROLES:
        raise ApiError('validation_error', 'Unknown role', 422, {'allowed': list(ROLES)})
    if me.role != 'admin':
        if role not in (None, 'authority'):
            raise ApiError('forbidden', 'Your role cannot list these users', 403)
        role = 'authority'

    page, per_page = _int(request.args.get('page', 1)), _int(request.args.get('per_page', 50))
    if page is None or per_page is None:
        raise ApiError('validation_error', 'page and per_page must be numbers', 422)
    page, per_page = max(page, 1), min(max(per_page, 1), 200)

    q = User.query
    if role:
        q = q.filter(User.role == role)
    users = q.order_by(User.name, User.id).offset((page - 1) * per_page).limit(per_page).all()
    items = [serialize_user(u) for u in users]
    if me.role != 'admin':
        for item in items:
            item.pop('email')
    return jsonify(items)
