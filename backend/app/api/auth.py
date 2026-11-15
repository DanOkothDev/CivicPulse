import re
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from ..auth_utils import current_user, password_change_access, serialize_user
from ..errors import ApiError
from ..extensions import db
from ..models import Area, County, PasswordResetToken, User
from ..jobqueue import get_redis
from ..email_service import send_password_reset_email

bp = Blueprint('auth', __name__)
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON body', 422)
    return data


def _auth_response(user, status):
    # JWT identity must be text, so the id is converted with str().
    token = create_access_token(identity=str(user.id), additional_claims={'token_version': user.token_version})
    return jsonify(token=token, user=serialize_user(user, include_onboarding=True)), status


@bp.post('/auth/register')
def register():
    data = _json()
    name = str(data.get('name') or '').strip()
    email = str(data.get('email') or '').strip().lower()
    password = data.get('password')
    area_id = data.get('area_id')
    county_id = data.get('county_id')

    errors = {}
    if not name:
        errors['name'] = 'Name is required'
    elif len(name) > 120:
        errors['name'] = 'Name must be 120 characters or fewer'
    if not EMAIL_RE.match(email):
        errors['email'] = 'Enter a valid email address'
    if len(email) > 255:
        errors['email'] = 'Email must be 255 characters or fewer'
    if not isinstance(password, str) or len(password) < 8:
        errors['password'] = 'Use at least 8 characters'
    if area_id is not None and (not isinstance(area_id, int) or not db.session.get(Area, area_id)):
        errors['area_id'] = 'Unknown area'
    if county_id is not None and (not isinstance(county_id, int) or not db.session.get(County, county_id)):
        errors['county_id'] = 'Unknown county'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)

    if User.query.filter_by(email=email).first():
        raise ApiError('email_taken', 'An account with this email already exists', 409)

    # Anyone who registers is a resident. Other roles are given by an admin (or `flask create-user`).
    user = User(name=name, email=email, role='resident', area_id=area_id, county_id=county_id,
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
    if not user or not user.is_active or not isinstance(password, str) or not check_password_hash(user.password_hash, password):
        raise ApiError('invalid_credentials', 'Email or password is wrong', 401)
    if user.must_change_password and user.temporary_password_email_status != 'sent':
        raise ApiError('account_setup_pending', 'Your temporary password email is still being prepared. Contact your administrator if this continues.', 403)
    return _auth_response(user, 200)


@bp.get('/auth/me')
@password_change_access
def me():
    return jsonify(serialize_user(current_user(), include_onboarding=True))


@bp.post('/auth/change-password')
@password_change_access
def change_password():
    data = _json()
    if set(data) != {'new_password'}:
        raise ApiError('validation_error', 'Send only new_password', 422, {
            'allowed': ['new_password'],
        })
    new_password = data.get('new_password')
    if not isinstance(new_password, str) or len(new_password) < 10:
        raise ApiError('validation_error', 'Use a password with at least 10 characters', 422, {
            'new_password': 'Use at least 10 characters',
        })

    user = current_user()
    if check_password_hash(user.password_hash, new_password):
        raise ApiError('validation_error', 'Choose a password different from the temporary password', 422, {
            'new_password': 'Choose a new password',
        })
    user.password_hash = generate_password_hash(new_password)
    user.must_change_password = False
    user.token_version += 1
    db.session.commit()
    return jsonify(serialize_user(user, include_onboarding=True))


GENERIC_RESET_MESSAGE = 'If an account exists for that email address, password reset instructions will be sent.'
RESET_TOKEN_MESSAGE = 'This password reset link is invalid or has expired. Request a new one and try again.'
MAX_PASSWORD_LENGTH = 128


def _rate_limit(keys, limits, window=900):
    """Increment related counters together; do not trust forwarded IP headers."""
    script = """
    local values = {}
    for i, key in ipairs(KEYS) do
      values[i] = tonumber(redis.call('GET', key) or '0')
      if values[i] >= tonumber(ARGV[i]) then return 0 end
    end
    for i, key in ipairs(KEYS) do
      local value = redis.call('INCR', key)
      if value == 1 then redis.call('EXPIRE', key, tonumber(ARGV[#KEYS + 1])) end
    end
    return 1
    """
    return get_redis().eval(script, len(keys), *keys, *limits, window)


def _rate_key(kind, value):
    secret = str(current_app.config['SECRET_KEY']).encode()
    digest = hmac.new(secret, value.encode(), hashlib.sha256).hexdigest()
    return f'civicpulse:password-reset:{kind}:{digest}'


def _client_ip():
    return request.remote_addr or 'unknown'


def _require_rate(keys, limits):
    try:
        allowed = _rate_limit(keys, limits)
    except Exception:
        current_app.logger.error('Password recovery rate limiter unavailable')
        raise ApiError('service_unavailable', 'Password recovery is temporarily unavailable. Please try again later.', 503)
    if not allowed:
        raise ApiError('rate_limited', 'Too many attempts. Please try again later.', 429)


@bp.post('/auth/forgot-password')
def forgot_password():
    data = _json()
    if set(data) != {'email'}:
        raise ApiError('validation_error', 'Send only email', 422, {'allowed': ['email']})
    email = data.get('email')
    if not isinstance(email, str):
        raise ApiError('validation_error', 'Enter a valid email address', 422)
    email = email.strip().lower()
    if len(email) > 255 or not EMAIL_RE.fullmatch(email):
        raise ApiError('validation_error', 'Enter a valid email address', 422)
    _require_rate([_rate_key('ip', _client_ip()), _rate_key('email', email)], [10, 3])
    user = User.query.filter_by(email=email).first()
    if user and user.is_active:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        now = datetime.now(timezone.utc)
        try:
            locked_user = User.query.filter_by(id=user.id).populate_existing().with_for_update().one()
            if not locked_user.is_active:
                db.session.rollback()
                return jsonify(message=GENERIC_RESET_MESSAGE)
            PasswordResetToken.query.filter_by(user_id=locked_user.id, used_at=None).update(
                {'used_at': now}, synchronize_session=False
            )
            db.session.add(PasswordResetToken(user_id=locked_user.id, token_hash=token_hash,
                                               expires_at=now + timedelta(minutes=15)))
            db.session.commit()
        except Exception:
            db.session.rollback()
            current_app.logger.error('Password reset request could not be recorded')
            return jsonify(message=GENERIC_RESET_MESSAGE)
        reset_url = f"{current_app.config['FRONTEND_BASE_URL'].rstrip('/')}/reset-password#token={raw_token}"
        try:
            send_password_reset_email(user.email, user.name, reset_url)
        except Exception:
            current_app.logger.error('Password reset email delivery failed')
    return jsonify(message=GENERIC_RESET_MESSAGE)


@bp.post('/auth/reset-password')
def reset_password():
    data = _json()
    if set(data) != {'token', 'new_password'}:
        raise ApiError('validation_error', 'Send token and new_password', 422,
                       {'allowed': ['token', 'new_password']})
    token = data.get('token')
    new_password = data.get('new_password')
    if not isinstance(token, str) or not token or len(token) > 256:
        raise ApiError('validation_error', 'Provide a valid reset token', 422)
    if not isinstance(new_password, str) or not 10 <= len(new_password) <= MAX_PASSWORD_LENGTH:
        raise ApiError('validation_error', f'Use a password between 10 and {MAX_PASSWORD_LENGTH} characters', 422)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    _require_rate([_rate_key('ip', _client_ip()), _rate_key('token', token_hash)], [30, 10])
    candidate = PasswordResetToken.query.filter_by(token_hash=token_hash).first()
    if not candidate:
        raise ApiError('invalid_reset_token', RESET_TOKEN_MESSAGE, 400)
    now = datetime.now(timezone.utc)
    try:
        # All reset issuance/consumption paths lock user first, preventing duplicate use.
        user = User.query.filter_by(id=candidate.user_id).populate_existing().with_for_update().one_or_none()
        reset = PasswordResetToken.query.filter_by(id=candidate.id).populate_existing().with_for_update().one_or_none()
        if (user is None or not user.is_active or reset is None or reset.used_at is not None
                or reset.expires_at <= now):
            raise ValueError('invalid reset')
        reset.used_at = now
        PasswordResetToken.query.filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.id != reset.id,
            PasswordResetToken.used_at.is_(None),
        ).update({'used_at': now}, synchronize_session=False)
        user.password_hash = generate_password_hash(new_password)
        user.must_change_password = False
        user.token_version += 1
        db.session.commit()
    except ValueError:
        db.session.rollback()
        raise ApiError('invalid_reset_token', RESET_TOKEN_MESSAGE, 400)
    except Exception:
        db.session.rollback()
        current_app.logger.error('Password reset could not be completed')
        raise ApiError('service_unavailable', 'Password reset is temporarily unavailable. Please try again later.', 503)
    return jsonify(message='Your password has been reset. Please sign in with your new password.'), 200
