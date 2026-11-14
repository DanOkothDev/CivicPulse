import uuid

from werkzeug.security import check_password_hash

from app import jobs
from app.extensions import db
from app.models import County, User


def register(client):
    response = client.post('/api/v1/auth/register', json={
        'name': 'Ada',
        'email': f'{uuid.uuid4().hex[:10]}@test.civicpulse',
        'password': 'password123',
    })
    assert response.status_code == 201
    return response.json


def headers(auth):
    return {'Authorization': f"Bearer {auth['token']}"}


def test_registration_and_me_include_onboarding_defaults(client):
    auth = register(client)
    expected = {
        'onboarding_completed': False,
        'product_tour_enabled': True,
        'feature_tips_enabled': True,
        'onboarding_completed_at': None,
    }
    assert {key: auth['user'][key] for key in expected} == expected

    me = client.get('/api/v1/auth/me', headers=headers(auth))
    assert me.status_code == 200
    assert {key: me.json[key] for key in expected} == expected


def test_preferences_are_persisted_and_completion_timestamp_is_server_controlled(client):
    auth = register(client)
    response = client.patch(
        '/api/v1/users/me/preferences',
        headers=headers(auth),
        json={
            'product_tour_enabled': False,
            'feature_tips_enabled': False,
            'onboarding_completed': True,
        },
    )
    assert response.status_code == 200
    assert response.json['product_tour_enabled'] is False
    assert response.json['feature_tips_enabled'] is False
    assert response.json['onboarding_completed'] is True
    assert response.json['onboarding_completed_at'] is not None

    persisted = client.get('/api/v1/users/me/preferences', headers=headers(auth))
    assert persisted.status_code == 200
    assert persisted.json == {
        'onboarding_completed': True,
        'product_tour_enabled': False,
        'feature_tips_enabled': False,
        'onboarding_completed_at': response.json['onboarding_completed_at'],
    }

    replay = client.patch(
        '/api/v1/users/me/preferences',
        headers=headers(auth),
        json={'onboarding_completed': False},
    )
    assert replay.status_code == 200
    assert replay.json['onboarding_completed'] is False
    assert replay.json['onboarding_completed_at'] is None


def test_completion_timestamp_cannot_be_set_by_client(client):
    auth = register(client)
    for value in ('2026-01-01T00:00:00Z', 123, [], {}, None):
        response = client.patch(
            '/api/v1/users/me/preferences',
            headers=headers(auth),
            json={'onboarding_completed_at': value},
        )
        assert response.status_code == 422


def test_preference_values_must_be_booleans(client):
    auth = register(client)
    for key in ('onboarding_completed', 'product_tour_enabled', 'feature_tips_enabled'):
        for value in ('true', 1, None):
            response = client.patch(
                '/api/v1/users/me/preferences',
                headers=headers(auth),
                json={key: value},
            )
            assert response.status_code == 422


def test_preferences_are_scoped_to_the_authenticated_user(client):
    first = register(client)
    second = register(client)

    update = client.patch(
        '/api/v1/users/me/preferences',
        headers=headers(first),
        json={'feature_tips_enabled': False},
    )
    assert update.status_code == 200

    first_preferences = client.get('/api/v1/users/me/preferences', headers=headers(first))
    second_preferences = client.get('/api/v1/users/me/preferences', headers=headers(second))
    assert first_preferences.json['feature_tips_enabled'] is False
    assert second_preferences.json['feature_tips_enabled'] is True

    forged_target = client.patch(
        '/api/v1/users/me/preferences',
        headers=headers(first),
        json={'user_id': second['user']['id'], 'product_tour_enabled': False},
    )
    assert forged_target.status_code == 422
    assert client.get('/api/v1/users/me/preferences', headers=headers(second)).json[
        'product_tour_enabled'
    ] is True


def test_user_list_does_not_expose_onboarding_preferences(client, token_for):
    auth = {'Authorization': f'Bearer {token_for("admin")}'}
    response = client.get('/api/v1/users', headers=auth)
    assert response.status_code == 200
    assert response.json
    assert all(
        not {
            'onboarding_completed',
            'product_tour_enabled',
            'feature_tips_enabled',
            'onboarding_completed_at',
        }.intersection(user)
        for user in response.json
    )


def test_preferences_require_authentication(client):
    assert client.get('/api/v1/users/me/preferences').status_code == 401
    assert client.patch('/api/v1/users/me/preferences', json={
        'product_tour_enabled': False,
    }).status_code == 401


def test_preference_update_requires_at_least_one_setting(client):
    auth = register(client)
    response = client.patch(
        '/api/v1/users/me/preferences',
        headers=headers(auth),
        json={},
    )
    assert response.status_code == 422


def _create_staff(client, token_for, monkeypatch, enqueue=None):
    captured = {}
    monkeypatch.setattr(
        'app.api.users.enqueue_background',
        enqueue or (lambda fn, *args: captured.update(fn=fn, args=args)),
    )
    with client.application.app_context():
        county_id = County.query.order_by(County.id).first().id
    response = client.post('/api/v1/users/staff', headers={
        'Authorization': f'Bearer {token_for("admin")}',
    }, json={
        'name': 'New Verifier', 'email': f'{uuid.uuid4().hex}@test.civicpulse',
        'role': 'verifier', 'county_id': county_id,
    })
    return response, captured


def test_staff_creation_is_pending_then_background_delivery_marks_sent(client, token_for, app, monkeypatch):
    response, captured = _create_staff(client, token_for, monkeypatch)
    assert response.status_code == 201
    assert response.json['temporary_password_email_status'] == 'pending'
    user_id, password = captured['args']
    delivered = []
    monkeypatch.setattr(jobs, 'send_temporary_password', lambda *args: delivered.append(args))
    with app.app_context():
        assert captured['fn'](user_id, password) == {'status': 'sent'}
        user = db.session.get(User, user_id)
        assert user.temporary_password_email_status == 'sent'
        assert check_password_hash(user.password_hash, password)
    assert delivered and delivered[0][-1] == password


def test_redis_enqueue_failure_is_reported_as_failed(client, token_for, app, monkeypatch):
    def unavailable(*args):
        raise ConnectionError('redis credential detail')

    response, _ = _create_staff(client, token_for, monkeypatch, enqueue=unavailable)
    assert response.status_code == 201
    assert response.json['temporary_password_email_status'] == 'failed'
    assert 'redis credential detail' not in response.get_data(as_text=True)


def test_final_rq_failure_callback_marks_email_failed(client, token_for, app, monkeypatch):
    response, captured = _create_staff(client, token_for, monkeypatch)
    user_id = captured['args'][0]
    class Job:
        args = (user_id, captured['args'][1])
    with app.app_context():
        jobs.mark_staff_temporary_password_failed(Job(), None, RuntimeError, RuntimeError(), None)
        assert db.session.get(User, user_id).temporary_password_email_status == 'failed'


def test_failed_background_attempt_stays_pending_until_retries_are_exhausted(
    client, token_for, app, monkeypatch,
):
    _, captured = _create_staff(client, token_for, monkeypatch)
    user_id, password = captured['args']
    monkeypatch.setattr(jobs, 'send_temporary_password', lambda *args: (_ for _ in ()).throw(
        RuntimeError('sensitive SMTP detail')
    ))
    with app.app_context():
        try:
            jobs.send_staff_temporary_password(user_id, password)
        except RuntimeError as error:
            assert 'sensitive SMTP detail' in str(error)
        else:
            raise AssertionError('the failed SMTP attempt must be retried by RQ')
        assert db.session.get(User, user_id).temporary_password_email_status == 'pending'
        class Job:
            args = (user_id, password)
        jobs.mark_staff_temporary_password_failed(Job(), None, RuntimeError, RuntimeError(), None)
        assert db.session.get(User, user_id).temporary_password_email_status == 'failed'


def test_retry_rotates_password_and_revoked_user_cannot_receive_email(client, token_for, app, monkeypatch):
    created, captured = _create_staff(client, token_for, monkeypatch)
    user_id, old_password = captured['args']
    with app.app_context():
        user = db.session.get(User, user_id)
        user.temporary_password_email_status = 'failed'
        db.session.commit()
    retried, retry_job = _create_retry(client, token_for, monkeypatch, user_id)
    assert retried.status_code == 202
    assert retried.json['temporary_password_email_status'] == 'pending'
    new_password = retry_job['args'][1]
    assert new_password != old_password
    with app.app_context():
        user = db.session.get(User, user_id)
        assert not check_password_hash(user.password_hash, old_password)
        assert check_password_hash(user.password_hash, new_password)
        user.is_active = False
        db.session.commit()
        assert jobs.send_staff_temporary_password(user_id, new_password) == {'skipped': 'account unavailable'}


def _create_retry(client, token_for, monkeypatch, user_id):
    captured = {}
    monkeypatch.setattr(
        'app.api.users.enqueue_background',
        lambda fn, *args: captured.update(fn=fn, args=args),
    )
    response = client.post(
        f'/api/v1/users/{user_id}/staff-email/retry',
        headers={'Authorization': f'Bearer {token_for("admin")}'},
    )
    return response, captured
