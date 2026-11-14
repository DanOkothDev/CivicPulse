from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from .errors import ApiError
from .extensions import db
from .models import Report, User


def serialize_user(u, include_onboarding=False):
    user = {
        'id': u.id,
        'name': u.name,
        'email': u.email,
        'role': u.role,
        'is_active': bool(u.is_active),
        'must_change_password': bool(u.must_change_password),
        'temporary_password_email_status': u.temporary_password_email_status,
        'area_id': u.area_id,
        'county_id': u.county_id,
        'county': (
            {'id': u.county.id, 'name': u.county.name, 'code': u.county.code}
            if u.county else None
        ),
        'department_id': u.department_id,
        'department': (
            {'id': u.department.id, 'county_id': u.department.county_id,
             'name': u.department.name, 'code': u.department.code}
            if u.department else None
        ),
    }
    if include_onboarding:
        user.update({
            'onboarding_completed': bool(u.onboarding_completed),
            'product_tour_enabled': bool(u.product_tour_enabled),
            'feature_tips_enabled': bool(u.feature_tips_enabled),
            'onboarding_completed_at': (
                u.onboarding_completed_at.isoformat() if u.onboarding_completed_at else None
            ),
        })
    return user


def current_user():
    """The logged-in User. Only call inside a route protected by the decorators below."""
    return g.user


def user_can_access_county(user, county_id):
    if user.role == 'admin':
        return user.county_id is None or user.county_id == county_id
    if county_id is None:
        return False
    if user.county_id is None:
        return False
    return user.county_id == county_id


def user_can_access_report(user, report):
    if user.role == 'admin':
        return user.county_id is not None and user.county_id == report.county_id
    if user.role == 'resident':
        return report.created_by == user.id
    if user.role in {'verifier', 'authority'}:
        if user.county_id is None:
            return False
        if report.county_id is None:
            return False
        if report.county_id != user.county_id:
            return False
        if user.role == 'authority':
            return (
                user.department_id is not None
                and report.department_id == user.department_id
            )
        return True
    return False


def _load_user(allow_password_change=False):
    # The token stores the id as text (a JWT rule), so convert it back to a number.
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        raise ApiError('unauthorized', 'This account no longer exists', 401)
    if user.must_change_password and user.temporary_password_email_status != 'sent':
        raise ApiError('account_setup_pending', 'Your temporary password email is still being prepared. Contact your administrator if this continues.', 403)
    if user.must_change_password and not allow_password_change:
        raise ApiError('password_change_required', 'Change your temporary password before continuing', 403)
    g.user = user


def login_required(fn):
    """Route needs a valid token. Any role is fine."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        _load_user()
        return fn(*args, **kwargs)
    return wrapper


def password_change_access(fn):
    """Allow the temporary-account session to read its user and set a new password."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        _load_user(allow_password_change=True)
        return fn(*args, **kwargs)
    return wrapper


def roles_required(*roles):
    """Route needs a valid token AND one of these roles, e.g. @roles_required('verifier', 'admin').
    The role is read from the database each time, so role changes apply immediately."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            _load_user()
            if g.user.role not in roles:
                raise ApiError('forbidden', 'Your role cannot do this', 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
