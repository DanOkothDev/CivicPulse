import hashlib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest
from werkzeug.security import check_password_hash

from app.extensions import db
from app.models import PasswordResetToken, User


MESSAGE = 'If an account exists for that email address, password reset instructions will be sent.'


@pytest.fixture(autouse=True)
def permit_recovery_limiter(monkeypatch):
    monkeypatch.setattr('app.api.auth._rate_limit', lambda *args, **kwargs: 1)


def reset_token(app, email, raw='test-reset-token', *, expires=None, used=None):
    with app.app_context():
        user = User.query.filter_by(email=email).one()
        row = PasswordResetToken(
            user_id=user.id,
            token_hash=hashlib.sha256(raw.encode()).hexdigest(),
            expires_at=expires or datetime.now(timezone.utc) + timedelta(minutes=15),
            used_at=used,
        )
        db.session.add(row)
        db.session.commit()
        return row.id


def test_forgot_password_generic_and_email_hash_storage(app, client, make_user, monkeypatch):
    email, _ = make_user()
    delivered = []
    monkeypatch.setattr('app.api.auth.send_password_reset_email', lambda *args: delivered.append(args))
    active = client.post('/api/v1/auth/forgot-password', json={'email': f' {email.upper()} '})
    unknown = client.post('/api/v1/auth/forgot-password', json={'email': 'nobody@example.test'})
    assert active.status_code == unknown.status_code == 200
    assert active.json == unknown.json == {'message': MESSAGE}
    assert len(delivered) == 1
    assert f'http://localhost:5173/reset-password#token=' in delivered[0][2]
    raw = delivered[0][2].split('#token=', 1)[1]
    with app.app_context():
        row = PasswordResetToken.query.filter_by(user_id=User.query.filter_by(email=email).one().id).one()
        assert row.token_hash == hashlib.sha256(raw.encode()).hexdigest()
        assert raw not in row.token_hash
        assert row.expires_at - row.created_at <= timedelta(minutes=15, seconds=2)


def test_forgot_password_inactive_and_smtp_failure_are_generic(app, client, make_user, monkeypatch):
    email, _ = make_user()
    monkeypatch.setattr('app.api.auth.send_password_reset_email', lambda *args: (_ for _ in ()).throw(AssertionError()))
    # Inactive accounts never call email delivery.
    # The fixture-created account is changed to inactive before the request.
    with app.app_context():
        User.query.filter_by(email=email).update({'is_active': False})
        db.session.commit()
    response = client.post('/api/v1/auth/forgot-password', json={'email': email})
    assert response.status_code == 200 and response.json == {'message': MESSAGE}


@pytest.mark.parametrize('payload', [None, {}, {'email': 'bad-address'}, {'email': 12}])
def test_forgot_password_validates_json_and_email(client, payload):
    response = client.post('/api/v1/auth/forgot-password', json=payload) if payload is not None else client.post('/api/v1/auth/forgot-password', data='x')
    assert response.status_code == 422


def test_failed_email_delivery_keeps_public_response_generic(client, make_user, monkeypatch):
    email, _ = make_user()
    monkeypatch.setattr('app.api.auth.send_password_reset_email', lambda *args: (_ for _ in ()).throw(RuntimeError('private detail')))
    response = client.post('/api/v1/auth/forgot-password', json={'email': email})
    assert response.status_code == 200 and response.json == {'message': MESSAGE}


def test_new_reset_request_invalidates_previous_open_token(app, client, make_user, monkeypatch):
    email, _ = make_user()
    reset_token(app, email, 'older-token')
    monkeypatch.setattr('app.api.auth.send_password_reset_email', lambda *args: None)
    assert client.post('/api/v1/auth/forgot-password', json={'email': email}).status_code == 200
    previous = client.post('/api/v1/auth/reset-password', json={'token': 'older-token', 'new_password': 'NewPassword123!'})
    assert previous.status_code == 400


def test_rate_limit_covers_ip_and_hashed_email(client, make_user, monkeypatch):
    observed = []
    monkeypatch.setattr('app.api.auth._rate_limit', lambda keys, limits: observed.append((keys, limits)) or 1)
    email, _ = make_user()
    response = client.post('/api/v1/auth/forgot-password', json={'email': email})
    assert response.status_code == 200
    keys, limits = observed[0]
    assert len(keys) == 2 and limits == [10, 3]
    assert email not in ' '.join(keys)
    assert all(key.startswith('civicpulse:password-reset:') for key in keys)


def test_reset_attempts_are_limited_by_ip_and_token(client, monkeypatch):
    observed = []
    monkeypatch.setattr('app.api.auth._rate_limit', lambda keys, limits: observed.append((keys, limits)) or 1)
    response = client.post('/api/v1/auth/reset-password', json={
        'token': 'guess-token', 'new_password': 'NewPassword123!',
    })
    assert response.status_code == 400
    assert observed[0][1] == [30, 10]
    assert len(observed[0][0]) == 2


def test_reset_is_single_use_and_revokes_existing_jwt(app, client, make_user):
    email, old_password = make_user()
    login = client.post('/api/v1/auth/login', json={'email': email, 'password': old_password})
    old_jwt = login.json['token']
    reset_token(app, email, 'known-token')
    response = client.post('/api/v1/auth/reset-password', json={'token': 'known-token', 'new_password': 'NewPassword123!'})
    assert response.status_code == 200
    assert 'token' not in response.json
    assert client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {old_jwt}'}).status_code == 401
    with app.app_context():
        user = User.query.filter_by(email=email).one()
        assert check_password_hash(user.password_hash, 'NewPassword123!')
    assert client.post('/api/v1/auth/reset-password', json={'token': 'known-token', 'new_password': 'OtherPassword123!'}).status_code == 400
    fresh = client.post('/api/v1/auth/login', json={'email': email, 'password': 'NewPassword123!'})
    assert fresh.status_code == 200
    assert client.get('/api/v1/auth/me', headers={'Authorization': f"Bearer {fresh.json['token']}"}).status_code == 200


def test_temporary_password_first_login_change_remains_supported(app, client, make_user):
    email, temporary_password = make_user()
    with app.app_context():
        User.query.filter_by(email=email).update({
            'must_change_password': True,
            'temporary_password_email_status': 'sent',
        })
        db.session.commit()
    signed_in = client.post('/api/v1/auth/login', json={'email': email, 'password': temporary_password})
    assert signed_in.status_code == 200
    old_token = signed_in.json['token']
    denied = client.get('/api/v1/_test/verifier-only', headers={'Authorization': f'Bearer {old_token}'})
    assert denied.status_code == 403
    changed = client.post('/api/v1/auth/change-password', json={'new_password': 'FirstLoginPassword123!'},
                          headers={'Authorization': f'Bearer {old_token}'})
    assert changed.status_code == 200
    assert client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {old_token}'}).status_code == 401
    assert client.post('/api/v1/auth/login', json={'email': email, 'password': 'FirstLoginPassword123!'}).status_code == 200


@pytest.mark.parametrize('raw,expires,used', [
    ('unknown', None, None),
    ('expired', datetime.now(timezone.utc) - timedelta(seconds=1), None),
    ('consumed', None, datetime.now(timezone.utc)),
])
def test_reset_rejects_invalid_expired_or_consumed_token(app, client, make_user, raw, expires, used):
    email, _ = make_user()
    if raw != 'unknown':
        reset_token(app, email, raw, expires=expires, used=used)
    response = client.post('/api/v1/auth/reset-password', json={'token': raw, 'new_password': 'NewPassword123!'})
    assert response.status_code == 400
    assert response.json['error']['code'] == 'invalid_reset_token'


def test_reset_rejects_weak_or_missing_inputs(client):
    assert client.post('/api/v1/auth/reset-password', json={'token': 'x', 'new_password': 'short'}).status_code == 422
    assert client.post('/api/v1/auth/reset-password', json={'new_password': 'longpassword'}).status_code == 422


def test_concurrent_reset_consumption_succeeds_only_once(app, make_user):
    email, _ = make_user()
    reset_token(app, email, 'concurrent-token')

    def consume():
        with app.test_client() as thread_client:
            return thread_client.post('/api/v1/auth/reset-password', json={
                'token': 'concurrent-token', 'new_password': 'NewPassword123!',
            }).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(lambda _: consume(), range(2)))
    assert sorted(statuses) == [200, 400]


def test_inactive_user_cannot_reset_password(app, client, make_user):
    email, password = make_user()
    reset_token(app, email, 'inactive-token')
    with app.app_context():
        User.query.filter_by(email=email).update({'is_active': False})
        db.session.commit()
    response = client.post('/api/v1/auth/reset-password', json={'token': 'inactive-token', 'new_password': 'NewPassword123!'})
    assert response.status_code == 400
    assert client.post('/api/v1/auth/login', json={'email': email, 'password': password}).status_code == 401


def test_password_change_revokes_token_and_temporary_flow_still_works(app, client, make_user):
    email, password = make_user()
    first = client.post('/api/v1/auth/login', json={'email': email, 'password': password}).json['token']
    changed = client.post('/api/v1/auth/change-password', json={'new_password': 'UpdatedPassword123!'}, headers={'Authorization': f'Bearer {first}'})
    assert changed.status_code == 200
    assert client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {first}'}).status_code == 401
    assert client.post('/api/v1/auth/login', json={'email': email, 'password': 'UpdatedPassword123!'}).status_code == 200


def test_rate_limiter_failure_fails_closed(client, monkeypatch):
    monkeypatch.setattr('app.api.auth._rate_limit', lambda *args, **kwargs: (_ for _ in ()).throw(ConnectionError()))
    response = client.post('/api/v1/auth/forgot-password', json={'email': 'nobody@example.test'})
    assert response.status_code == 503
    assert 'nobody' not in response.get_data(as_text=True)


def test_rate_limited_response_is_generic(client, monkeypatch):
    monkeypatch.setattr('app.api.auth._rate_limit', lambda *args, **kwargs: 0)
    response = client.post('/api/v1/auth/forgot-password', json={'email': 'unknown@example.test'})
    assert response.status_code == 429
    assert 'unknown@example.test' not in response.get_data(as_text=True)
