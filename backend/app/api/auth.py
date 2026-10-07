import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from ..auth_utils import current_user, login_required, serialize_user
from ..errors import ApiError
from ..extensions import db
from ..models import Area, User

bp = Blueprint('auth', __name__)
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON body', 422)
    return data


def _auth_response(user, status):
    # JWT identity must be text, so the id is converted with str().
    token = create_access_token(identity=str(user.id))
    return jsonify(token=token, user=serialize_user(user)), status


@bp.post('/auth/register')
def register():
    data = _json()
    name = str(data.get('name') or '').strip()
    email = str(data.get('email') or '').strip().lower()
    password = data.get('password')
    area_id = data.get('area_id')

    errors = {}
    if not name:
        errors['name'] = 'Name is required'
    if not EMAIL_RE.match(email):
        errors['email'] = 'Enter a valid email address'
    if not isinstance(password, str) or len(password) < 8:
        errors['password'] = 'Use at least 8 characters'
    if area_id is not None and (not isinstance(area_id, int) or not db.session.get(Area, area_id)):
        errors['area_id'] = 'Unknown area'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)

    if User.query.filter_by(email=email).first():
        raise ApiError('email_taken', 'An account with this email already exists', 409)

    # Anyone who registers is a resident. Other roles are given by an admin (or `flask create-user`).
    user = User(name=name, email=email, role='resident', area_id=area_id,
                password_hash=generate_password_hash(password))
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:  # two sign-ups with the same email at the same moment
        db.session.rollback()
        raise ApiError('email_taken', 'An account with this email already exists', 409)
    return _auth_response(user, 201)


@bp.post('/auth/login')
def login():
    data = _json()
    email = str(data.get('email') or '').strip().lower()
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    # Same message for "no such email" and "wrong password" so nobody can probe which emails exist.
    if not user or not isinstance(password, str) or not check_password_hash(user.password_hash, password):
        raise ApiError('invalid_credentials', 'Email or password is wrong', 401)
    return _auth_response(user, 200)


@bp.get('/auth/me')
@login_required
def me():
    return jsonify(serialize_user(current_user()))
