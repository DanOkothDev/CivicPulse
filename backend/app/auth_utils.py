from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from .errors import ApiError
from .extensions import db
from .models import User


def serialize_user(u):
    return {'id': u.id, 'name': u.name, 'email': u.email, 'role': u.role, 'area_id': u.area_id}


def current_user():
    """The logged-in User. Only call inside a route protected by the decorators below."""
    return g.user


def _load_user():
    # The token stores the id as text (a JWT rule), so convert it back to a number.
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        raise ApiError('unauthorized', 'This account no longer exists', 401)
    g.user = user


def login_required(fn):
    """Route needs a valid token. Any role is fine."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        _load_user()
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
