import uuid


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
