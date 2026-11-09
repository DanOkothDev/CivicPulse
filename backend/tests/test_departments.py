import uuid

from geoalchemy2.elements import WKTElement

from app.extensions import db
from app.models import Category, County, Department, Report, User


def _headers(client, make_user, app, role, county_id=None):
    email, password = make_user(role)
    with app.app_context():
        user = User.query.filter_by(email=email).one()
        user.county_id = county_id
        if role == 'authority':
            user.department_id = None
        db.session.commit()
        user_id = user.id
    token = client.post(
        '/api/v1/auth/login',
        json={'email': email, 'password': password},
    ).json['token']
    return {'Authorization': f'Bearer {token}'}, user_id


def _new_county(app):
    with app.app_context():
        county = County(
            name=f'Department county {uuid.uuid4().hex[:8]}',
            code=f'department-{uuid.uuid4().hex[:8]}',
        )
        db.session.add(county)
        db.session.commit()
        return county.id


def test_department_crud_validation_and_references(client, app, make_user):
    county_id = _new_county(app)
    admin, admin_id = _headers(client, make_user, app, 'admin', county_id=None)

    created = client.post(
        f'/api/v1/counties/{county_id}/departments',
        json={'name': 'Roads and Works', 'code': 'roads-works'},
        headers=admin,
    )
    assert created.status_code == 201
    department_id = created.json['id']
    assert created.json['county_id'] == county_id
    assert client.get(f'/api/v1/counties/{county_id}/departments').json[0]['id'] == department_id

    duplicate = client.post(
        f'/api/v1/counties/{county_id}/departments',
        json={'name': ' roads AND works ', 'code': 'roads-works-2'},
        headers=admin,
    )
    invalid_code = client.post(
        f'/api/v1/counties/{county_id}/departments',
        json={'name': 'Sanitation', 'code': 'bad code'},
        headers=admin,
    )
    assert duplicate.status_code == 409
    assert invalid_code.status_code == 422
    assert client.patch(
        f'/api/v1/departments/{department_id}',
        json={},
        headers=admin,
    ).status_code == 422

    updated = client.patch(
        f'/api/v1/departments/{department_id}',
        json={'name': 'Road Maintenance', 'code': 'road-maintenance'},
        headers=admin,
    )
    assert updated.status_code == 200
    assert updated.json['name'] == 'Road Maintenance'
    assert updated.json['code'] == 'road-maintenance'

    with app.app_context():
        user = db.session.get(User, admin_id)
        user.department_id = department_id
        db.session.commit()
    blocked = client.delete(f'/api/v1/departments/{department_id}', headers=admin)
    assert blocked.status_code == 409
    assert blocked.json['error']['code'] == 'department_in_use'

    with app.app_context():
        db.session.get(User, admin_id).department_id = None
        db.session.commit()
    deleted = client.delete(f'/api/v1/departments/{department_id}', headers=admin)
    assert deleted.status_code == 204
    assert client.delete(f'/api/v1/departments/{department_id}', headers=admin).status_code == 404


def test_department_county_authorization_and_role_assignment(client, app, make_user):
    county_ids = [row['id'] for row in client.get('/api/v1/counties').json[:2]]
    county_admin, _ = _headers(client, make_user, app, 'admin', county_id=county_ids[0])
    global_admin, _ = _headers(client, make_user, app, 'admin', county_id=None)
    resident, _ = _headers(client, make_user, app, 'resident', county_id=county_ids[0])

    other_department = client.post(
        f'/api/v1/counties/{county_ids[1]}/departments',
        json={'name': 'County B Department'},
        headers=global_admin,
    )
    assert other_department.status_code == 201
    other_id = other_department.json['id']
    assert client.patch(
        f'/api/v1/departments/{other_id}',
        json={'name': 'Attempted cross-county edit'},
        headers=county_admin,
    ).status_code == 403
    assert client.delete(f'/api/v1/departments/{other_id}', headers=county_admin).status_code == 403
    assert client.post(
        f'/api/v1/counties/{county_ids[0]}/departments',
        json={'name': 'Resident attempt'},
        headers=resident,
    ).status_code == 403

    authority, authority_id = _headers(
        client, make_user, app, 'authority', county_id=county_ids[0],
    )
    own_department = client.get(
        f'/api/v1/counties/{county_ids[0]}/departments',
    ).json[0]
    assigned = client.patch(
        f'/api/v1/users/{authority_id}/department',
        json={'department_id': own_department['id']},
        headers=global_admin,
    )
    assert assigned.status_code == 200
    assert assigned.json['department_id'] == own_department['id']
    cross_county = client.patch(
        f'/api/v1/users/{authority_id}/department',
        json={'department_id': other_id},
        headers=global_admin,
    )
    assert cross_county.status_code == 422
    assert client.patch(
        f'/api/v1/users/{authority_id}/department',
        json={'department_id': own_department['id']},
        headers=county_admin,
    ).status_code == 200


def test_department_delete_rejects_report_references(client, app, make_user):
    county_id = _new_county(app)
    admin, admin_id = _headers(client, make_user, app, 'admin', county_id=None)
    department = client.post(
        f'/api/v1/counties/{county_id}/departments',
        json={'name': 'Referenced department'},
        headers=admin,
    ).json
    with app.app_context():
        report = Report(
            category_id=Category.query.first().id,
            location=WKTElement('POINT(10 10)', srid=4326),
            county_id=county_id,
            department_id=department['id'],
            photo_path='test.jpg',
            created_by=admin_id,
        )
        db.session.add(report)
        db.session.commit()
    response = client.delete(
        f"/api/v1/departments/{department['id']}",
        headers=admin,
    )
    assert response.status_code == 409
    assert response.json['error']['code'] == 'department_in_use'
