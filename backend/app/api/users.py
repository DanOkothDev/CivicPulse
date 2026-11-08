from flask import Blueprint, jsonify, request

from ..auth_utils import current_user, login_required, roles_required, serialize_user
from ..constants import ROLES
from ..errors import ApiError
from ..extensions import db
from ..models import User, now

bp = Blueprint('users', __name__)


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _onboarding_preferences(user):
    return {
        'onboarding_completed': bool(user.onboarding_completed),
        'product_tour_enabled': bool(user.product_tour_enabled),
        'feature_tips_enabled': bool(user.feature_tips_enabled),
        'onboarding_completed_at': (
            user.onboarding_completed_at.isoformat() if user.onboarding_completed_at else None
        ),
    }


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


@bp.get('/users/me/preferences')
@login_required
def get_my_preferences():
    return jsonify(_onboarding_preferences(current_user()))


@bp.patch('/users/me/preferences')
@login_required
def update_my_preferences():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON body', 422)
    if not data:
        raise ApiError('validation_error', 'Send at least one onboarding preference', 422)

    user = current_user()
    allowed = {
        'onboarding_completed',
        'product_tour_enabled',
        'feature_tips_enabled',
    }
    unknown = sorted(set(data) - allowed)
    if unknown:
        raise ApiError('validation_error', 'Unknown onboarding preference', 422, {'allowed': sorted(allowed)})

    for key in allowed.intersection(data):
        if not isinstance(data[key], bool):
            raise ApiError('validation_error', f'{key} must be a boolean', 422)

    if 'onboarding_completed' in data:
        user.onboarding_completed = data['onboarding_completed']
        if data['onboarding_completed']:
            user.onboarding_completed_at = now()
        else:
            user.onboarding_completed_at = None

    if 'product_tour_enabled' in data:
        user.product_tour_enabled = data['product_tour_enabled']

    if 'feature_tips_enabled' in data:
        user.feature_tips_enabled = data['feature_tips_enabled']

    db.session.commit()
    return jsonify(_onboarding_preferences(user))


@bp.patch('/users/<int:user_id>/role')
@roles_required('admin')
def update_user_role(user_id):
    data = request.get_json(silent=True)
    role = data.get('role') if isinstance(data, dict) else None
    if role not in ROLES:
        raise ApiError('validation_error', 'Choose a valid role', 422, {
            'role': f'Allowed roles: {", ".join(ROLES)}',
        })

    user = db.session.get(User, user_id)
    if user is None:
        raise ApiError('not_found', 'User not found', 404)
    user.role = role
    db.session.commit()
    return jsonify(serialize_user(user))
