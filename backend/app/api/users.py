import re
import secrets

from flask import Blueprint, current_app, jsonify, request

from ..auth_utils import current_user, login_required, roles_required, serialize_user
from ..constants import ROLES
from ..errors import ApiError
from ..extensions import db
from ..jobqueue import enqueue_background
from ..jobs import send_staff_temporary_password
from ..models import County, Department, User, now
from werkzeug.security import generate_password_hash

bp = Blueprint('users', __name__)
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


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

    q = User.query.filter(User.is_active.is_(True))
    if me.role == 'admin' and me.county_id is not None:
        q = q.filter(User.county_id == me.county_id)
    elif me.role in {'verifier', 'authority'}:
        if me.county_id is None:
            q = q.filter(User.id == -1)
        else:
            q = q.filter(User.county_id == me.county_id)
    if role:
        q = q.filter(User.role == role)
    users = q.order_by(User.name, User.id).offset((page - 1) * per_page).limit(per_page).all()
    items = [serialize_user(u) for u in users]
    if me.role != 'admin':
        for item in items:
            item.pop('email')
    return jsonify(items)


@bp.post('/users/staff')
@roles_required('admin')
def create_staff_user():
    """National admins create county-scoped staff accounts directly."""
    if current_user().county_id is not None:
        raise ApiError('forbidden', 'Only national admins can create staff accounts', 403)
    data = request.get_json(silent=True)
    allowed = {'name', 'email', 'role', 'county_id', 'department_id'}
    if not isinstance(data, dict) or set(data) - allowed:
        raise ApiError('validation_error', 'Send valid staff account details', 422)

    name, email = data.get('name'), data.get('email')
    role, county_id = data.get('role'), data.get('county_id')
    department_id = data.get('department_id')
    errors = {}
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 120:
        errors['name'] = 'Enter a name of 1 to 120 characters'
    if not isinstance(email, str) or len(email.strip()) > 255 or not EMAIL_RE.fullmatch(email.strip()):
        errors['email'] = 'Enter a valid email address'
    if role not in ('admin', 'verifier', 'authority'):
        errors['role'] = 'Choose admin, verifier, or authority'
    if not isinstance(county_id, int) or isinstance(county_id, bool) or db.session.get(County, county_id) is None:
        errors['county_id'] = 'Choose a valid county'

    department = None
    if role == 'authority':
        if not isinstance(department_id, int) or isinstance(department_id, bool):
            errors['department_id'] = 'Choose a department for the authority'
        else:
            department = db.session.get(Department, department_id)
            if department is None or department.county_id != county_id:
                errors['department_id'] = 'Choose a department in the selected county'
    elif department_id is not None:
        errors['department_id'] = 'Only authority accounts can have a department'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)

    email = email.strip().lower()
    if User.query.filter_by(email=email).first():
        raise ApiError('email_taken', 'An account with this email already exists', 409)
    temporary_password = secrets.token_urlsafe(18)
    user = User(name=name.strip(), email=email, password_hash=generate_password_hash(temporary_password),
                role=role, county_id=county_id,
                department_id=department.id if department else None,
                must_change_password=True, temporary_password_email_status='pending')
    db.session.add(user)
    db.session.commit()
    user_id = user.id
    try:
        enqueue_background(send_staff_temporary_password, user_id, temporary_password)
    except Exception as error:
        db.session.rollback()
        user = db.session.get(User, user_id)
        user.temporary_password_email_status = 'failed'
        db.session.commit()
        current_app.logger.warning('Could not queue staff onboarding email for user_id=%s (%s)', user_id, type(error).__name__)
    return jsonify(serialize_user(user)), 201


@bp.post('/users/<int:user_id>/staff-email/retry')
@roles_required('admin')
def retry_staff_email(user_id):
    if current_user().county_id is not None:
        raise ApiError('forbidden', 'Only national admins can retry staff onboarding emails', 403)
    user = db.session.get(User, user_id)
    if user is None or user.role not in {'admin', 'verifier', 'authority'} or user.county_id is None:
        raise ApiError('not_found', 'County staff account not found', 404)
    if not user.is_active:
        raise ApiError('validation_error', 'Revoked accounts cannot receive onboarding emails', 422)
    if user.temporary_password_email_status != 'failed':
        raise ApiError('validation_error', 'Only failed onboarding emails can be retried', 422)

    temporary_password = secrets.token_urlsafe(18)
    user.password_hash = generate_password_hash(temporary_password)
    user.must_change_password = True
    user.temporary_password_email_status = 'pending'
    db.session.commit()
    user_id = user.id
    try:
        enqueue_background(send_staff_temporary_password, user_id, temporary_password)
    except Exception as error:
        db.session.rollback()
        user = db.session.get(User, user_id)
        user.temporary_password_email_status = 'failed'
        db.session.commit()
        current_app.logger.warning('Could not queue staff onboarding email for user_id=%s (%s)', user_id, type(error).__name__)
    return jsonify(serialize_user(user)), 202


@bp.delete('/users/<int:user_id>/staff')
@roles_required('admin')
def revoke_staff_user(user_id):
    admin = current_user()
    if admin.county_id is not None:
        raise ApiError('forbidden', 'Only national admins can revoke staff accounts', 403)
    user = db.session.get(User, user_id)
    if user is None:
        raise ApiError('not_found', 'Staff account not found', 404)
    if user.id == admin.id or user.role not in {'admin', 'verifier', 'authority'} or user.county_id is None:
        raise ApiError('validation_error', 'Only county staff accounts can be revoked', 422)
    user.is_active = False
    db.session.commit()
    return jsonify(serialize_user(user))


@bp.get('/users/me/preferences')
@login_required
def get_my_preferences():
    return jsonify(_onboarding_preferences(current_user()))


@bp.patch('/users/me/profile')
@login_required
def update_my_profile():
    user = current_user()
    if user.role != 'resident':
        raise ApiError('forbidden', 'Only residents can update their registered county', 403)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON body', 422)
    if set(data) != {'county_id'}:
        raise ApiError('validation_error', 'Only county_id can be updated', 422, {
            'allowed': ['county_id'],
        })

    county_id = data['county_id']
    if (not isinstance(county_id, int) or isinstance(county_id, bool)
            or db.session.get(County, county_id) is None):
        raise ApiError('validation_error', 'Choose a valid county', 422, {
            'county_id': 'Choose a valid county',
        })

    user.county_id = county_id
    db.session.commit()
    return jsonify(serialize_user(user))


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
    admin = current_user()
    if admin.county_id is not None and admin.county_id != user.county_id:
        raise ApiError('forbidden', 'You can only manage users in your county', 403)
    if isinstance(data, dict) and set(data) - {'role', 'county_id'}:
        raise ApiError('validation_error', 'Only role and county_id can be updated', 422, {
            'allowed': ['role', 'county_id'],
        })
    county_id = data.get('county_id', user.county_id) if isinstance(data, dict) else user.county_id
    if admin.county_id is not None and county_id != admin.county_id:
        raise ApiError('forbidden', 'You can only assign users in your county', 403)
    if county_id is not None and (
        not isinstance(county_id, int) or isinstance(county_id, bool)
        or db.session.get(County, county_id) is None
    ):
        raise ApiError('validation_error', 'Choose a valid county', 422, {
            'county_id': 'Choose a valid county',
        })
    if role in {'admin', 'verifier', 'authority'} and county_id is None:
        raise ApiError('validation_error', 'Staff accounts must be assigned to a county', 422, {
            'county_id': 'Choose a county for this staff role',
        })
    if user.county_id != county_id:
        user.department_id = None
    user.county_id = county_id
    user.role = role
    if role != 'authority':
        user.department_id = None
    db.session.commit()
    return jsonify(serialize_user(user))


@bp.patch('/users/<int:user_id>/department')
@roles_required('admin')
def update_user_department(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        raise ApiError('not_found', 'User not found', 404)

    admin = current_user()
    if admin.county_id is not None and admin.county_id != user.county_id:
        raise ApiError('forbidden', 'You can only manage users in your county', 403)
    if user.role != 'authority':
        raise ApiError('validation_error', 'Only authority users can be assigned a department', 422, {
            'department_id': 'The user must have the authority role',
        })

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) != {'department_id'}:
        raise ApiError('validation_error', 'Send only department_id', 422, {
            'allowed': ['department_id'],
        })
    department_id = data['department_id']
    if department_id is None:
        user.department_id = None
    elif not isinstance(department_id, int) or isinstance(department_id, bool):
        raise ApiError('validation_error', 'Choose a valid department or null', 422, {
            'department_id': 'Choose a valid department or null',
        })
    else:
        department = db.session.get(Department, department_id)
        if department is None:
            raise ApiError('validation_error', 'Choose a valid department', 422, {
                'department_id': 'Unknown department',
            })
        if user.county_id is None or department.county_id != user.county_id:
            raise ApiError('validation_error', 'Department must belong to the authority user county', 422, {
                'department_id': 'Department must belong to the authority user county',
            })
        user.department_id = department.id

    db.session.commit()
    return jsonify(serialize_user(user))
