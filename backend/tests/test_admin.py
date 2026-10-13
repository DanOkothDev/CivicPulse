import uuid

from app.extensions import db
from app.models import Area, Category, User


def test_admin_can_create_categories(client, app, token_for):
    headers = {'Authorization': 'Bearer ' + token_for('admin')}
    name = f'Test category {uuid.uuid4().hex}'
    forbidden_headers = {'Authorization': 'Bearer ' + token_for('resident')}

    assert client.post('/api/v1/categories', json={'name': name}).status_code == 401
    assert client.post('/api/v1/categories', json={'name': name},
                       headers=forbidden_headers).status_code == 403

    created = client.post('/api/v1/categories', json={'name': name, 'icon': 'test-icon'},
                          headers=headers)
    assert created.status_code == 201
    assert created.json['name'] == name
    assert created.json['icon'] == 'test-icon'
    assert any(category['id'] == created.json['id']
               for category in client.get('/api/v1/categories').json)

    duplicate = client.post('/api/v1/categories', json={'name': name}, headers=headers)
    invalid = client.post('/api/v1/categories', json={'name': ' '}, headers=headers)
    assert duplicate.status_code == 409
    assert invalid.status_code == 422

    with app.app_context():
        db.session.delete(db.session.get(Category, created.json['id']))
        db.session.commit()


def test_admin_can_create_areas(client, app, token_for):
    headers = {'Authorization': 'Bearer ' + token_for('admin')}
    name = f'Test area {uuid.uuid4().hex}'
    forbidden_headers = {'Authorization': 'Bearer ' + token_for('resident')}

    assert client.post('/api/v1/areas', json={'name': name}).status_code == 401
    assert client.post('/api/v1/areas', json={'name': name},
                       headers=forbidden_headers).status_code == 403

    created = client.post('/api/v1/areas', json={'name': name}, headers=headers)
    assert created.status_code == 201
    assert created.json['name'] == name
    assert any(area['id'] == created.json['id'] for area in client.get('/api/v1/areas').json)

    duplicate = client.post('/api/v1/areas', json={'name': name}, headers=headers)
    invalid = client.post('/api/v1/areas', json={'name': ' '}, headers=headers)
    assert duplicate.status_code == 409
    assert invalid.status_code == 422

    with app.app_context():
        db.session.delete(db.session.get(Area, created.json['id']))
        db.session.commit()


def test_admin_can_change_user_role(client, app, token_for, make_user):
    email, _ = make_user('resident')
    with app.app_context():
        user_id = User.query.filter_by(email=email).one().id

    headers = {'Authorization': 'Bearer ' + token_for('admin')}
    resident_headers = {'Authorization': 'Bearer ' + token_for('resident')}
    path = f'/api/v1/users/{user_id}/role'

    assert client.patch(path, json={'role': 'verifier'}).status_code == 401
    assert client.patch(path, json={'role': 'verifier'},
                        headers=resident_headers).status_code == 403

    updated = client.patch(path, json={'role': 'authority'}, headers=headers)
    assert updated.status_code == 200
    assert updated.json['role'] == 'authority'

    invalid = client.patch(path, json={'role': 'owner'}, headers=headers)
    missing = client.patch('/api/v1/users/99999999/role', json={'role': 'resident'}, headers=headers)
    assert invalid.status_code == 422
    assert missing.status_code == 404
