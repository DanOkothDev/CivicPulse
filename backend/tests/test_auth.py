import uuid

DOMAIN = '@test.civicpulse'


def new_email():
    return f'{uuid.uuid4().hex[:10]}{DOMAIN}'


def register(client, **over):
    body = {'name': 'Dan', 'email': new_email(), 'password': 'password123'}
    body.update(over)
    return client.post('/api/v1/auth/register', json=body), body


def test_register_returns_token_and_resident(client):
    r, body = register(client)
    assert r.status_code == 201
    assert r.json['token']
    assert r.json['user']['email'] == body['email']
    assert r.json['user']['role'] == 'resident'
    assert 'password' not in r.json['user'] and 'password_hash' not in r.json['user']


def test_register_cannot_choose_role(client):
    r, _ = register(client, role='admin')
    assert r.json['user']['role'] == 'resident'


def test_register_duplicate_email(client):
    r, body = register(client)
    again, _ = register(client, email=body['email'].upper())
    assert again.status_code == 409
    assert again.json['error']['code'] == 'email_taken'


def test_register_validation(client):
    r, _ = register(client, password='short', email='not-an-email', name=' ')
    assert r.status_code == 422
    assert set(r.json['error']['details']) == {'name', 'email', 'password'}


def test_register_needs_json(client):
    assert client.post('/api/v1/auth/register', data='x').status_code == 422


def test_login_success_and_case_insensitive_email(client):
    _, body = register(client)
    r = client.post('/api/v1/auth/login', json={'email': body['email'].upper(), 'password': body['password']})
    assert r.status_code == 200 and r.json['token']


def test_login_wrong_password_and_unknown_email_look_the_same(client):
    _, body = register(client)
    wrong = client.post('/api/v1/auth/login', json={'email': body['email'], 'password': 'nope-nope'})
    unknown = client.post('/api/v1/auth/login', json={'email': new_email(), 'password': 'password123'})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json == unknown.json


def test_me_with_token(client):
    r, body = register(client)
    me = client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer ' + r.json['token']})
    assert me.status_code == 200 and me.json['email'] == body['email']


def test_me_without_or_bad_token(client):
    none = client.get('/api/v1/auth/me')
    bad = client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer garbage'})
    for r in (none, bad):
        assert r.status_code == 401
        assert 'code' in r.json['error'] and 'message' in r.json['error']


def test_roles_required(client, token_for):
    url = '/api/v1/_test/verifier-only'
    assert client.get(url).status_code == 401
    resident = client.get(url, headers={'Authorization': 'Bearer ' + token_for('resident')})
    assert resident.status_code == 403 and resident.json['error']['code'] == 'forbidden'
    for role in ('verifier', 'admin'):
        ok = client.get(url, headers={'Authorization': 'Bearer ' + token_for(role)})
        assert ok.status_code == 200
