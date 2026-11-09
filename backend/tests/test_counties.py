import io

from geoalchemy2.elements import WKTElement

from app.extensions import db
from app.models import County, Department, Report, User

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


def _polygon(min_lon, min_lat, max_lon, max_lat):
    return WKTElement(
        f'POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))',
        srid=4326,
    )


def make_county(app, name, code, box):
    with app.app_context():
        county = County(name=name, code=code, boundary=_polygon(*box))
        db.session.add(county)
        db.session.commit()
        return county.id


def make_department(app, county_id, name):
    with app.app_context():
        department = Department.query.filter_by(county_id=county_id, name=name).first()
        if department is None:
            department = Department(county_id=county_id, name=name, code=name.lower().replace('&', 'and').replace(' ', '-'))
            db.session.add(department)
            db.session.commit()
        return department.id


def make_logged_in_user(client, make_user, app, role='resident', county_id=None, department_id=None):
    email, password = make_user(role)
    with app.app_context():
        user = User.query.filter_by(email=email).one()
        user.county_id = county_id
        user.department_id = department_id
        db.session.commit()
        user_id = user.id
    token = client.post('/api/v1/auth/login', json={'email': email, 'password': password}).json['token']
    return {'Authorization': 'Bearer ' + token}, user_id


def who(client, make_user):
    def _who(role):
        email, password = make_user(role)
        token = client.post('/api/v1/auth/login', json={'email': email, 'password': password}).json['token']
        headers = {'Authorization': 'Bearer ' + token}
        user_id = client.get('/api/v1/auth/me', headers=headers).json['id']
        return headers, user_id
    return _who


def create_report(client, headers, lat, lon, category_id=1):
    data = {'category_id': str(category_id), 'lat': str(lat), 'lon': str(lon), 'photo': (io.BytesIO(JPEG), 'a.jpg')}
    return client.post('/api/v1/reports', data=data, headers=headers, content_type='multipart/form-data')


def test_registration_accepts_county_selection(client, app):
    county_id = make_county(app, 'County A', 'county-a', (0, 0, 2, 2))
    r = client.post('/api/v1/auth/register', json={
        'name': 'Ada',
        'email': 'ada@example.com',
        'password': 'password123',
        'county_id': county_id,
    })
    assert r.status_code == 201
    assert r.json['user']['county_id'] == county_id
    assert r.json['user']['county']['name'] == 'County A'
    me = client.get('/api/v1/auth/me', headers={
        'Authorization': 'Bearer ' + r.json['token'],
    })
    assert me.status_code == 200
    assert me.json['county']['id'] == county_id


def test_counties_endpoint_returns_all_seeded_counties(client):
    response = client.get('/api/v1/counties')
    assert response.status_code == 200
    assert len(response.json) == 47
    assert all({'id', 'name', 'code'} <= set(county) for county in response.json)


def test_resident_can_update_county_but_not_role_or_department(client, app):
    county_a = make_county(app, 'County A', 'county-a', (0, 0, 2, 2))
    county_b = make_county(app, 'County B', 'county-b', (10, 10, 12, 12))
    registered = client.post('/api/v1/auth/register', json={
        'name': 'Ada',
        'email': 'profile-county@example.com',
        'password': 'password123',
        'county_id': county_a,
    })
    headers = {'Authorization': 'Bearer ' + registered.json['token']}

    updated = client.patch('/api/v1/users/me/profile', json={'county_id': county_b}, headers=headers)
    assert updated.status_code == 200
    assert updated.json['county_id'] == county_b
    assert updated.json['county']['name'] == 'County B'
    assert client.get('/api/v1/auth/me', headers=headers).json['county_id'] == county_b

    forbidden_fields = client.patch(
        '/api/v1/users/me/profile',
        json={'county_id': county_a, 'role': 'admin', 'department_id': 1},
        headers=headers,
    )
    assert forbidden_fields.status_code == 422
    invalid_county = client.patch(
        '/api/v1/users/me/profile',
        json={'county_id': 999999},
        headers=headers,
    )
    assert invalid_county.status_code == 422


def test_geographical_county_resolution_and_unresolved_location(client, app, make_user):
    county_a = make_county(app, 'County A', 'county-a', (0, 0, 2, 2))
    make_county(app, 'County B', 'county-b', (10, 10, 12, 12))
    headers, _ = make_logged_in_user(client, make_user, app, role='resident')

    inside = create_report(client, headers, 1.0, 1.0)
    assert inside.status_code == 201
    assert inside.json['id']
    with app.app_context():
        report = db.session.get(Report, inside.json['id'])
        assert report.county_id == county_a

    outside = create_report(client, headers, 20.0, 20.0)
    assert outside.status_code == 422
    assert outside.json['error']['code'] == 'unresolved_location'


def test_verifier_and_authority_are_isolated_by_county(client, app, make_user):
    county_a = make_county(app, 'County A', 'county-a', (0, 0, 2, 2))
    county_b = make_county(app, 'County B', 'county-b', (10, 10, 12, 12))
    resident_headers, resident_id = make_logged_in_user(client, make_user, app, role='resident')
    with app.app_context():
        user = db.session.get(User, resident_id)
        user.county_id = county_a
        db.session.commit()
    create_report(client, resident_headers, 1.0, 1.0)
    with app.app_context():
        report = Report.query.order_by(Report.id.desc()).first()
        report_id = report.id

    verifier_headers, _ = make_logged_in_user(client, make_user, app, role='verifier', county_id=county_b)
    authority_headers, _ = make_logged_in_user(client, make_user, app, role='authority', county_id=county_b)

    report_page = client.get(f'/api/v1/reports/{report_id}', headers=verifier_headers)
    assert report_page.status_code == 403
    report_page = client.get(f'/api/v1/reports/{report_id}', headers=authority_headers)
    assert report_page.status_code == 403


def test_departmental_authority_permissions_and_routing(client, app, make_user):
    county_id = make_county(app, 'County A', 'county-a', (0, 0, 2, 2))
    roads = make_department(app, county_id, 'Roads & Public Works')
    water = make_department(app, county_id, 'Water Services')
    resident_headers, _ = make_logged_in_user(client, make_user, app, role='resident', county_id=county_id)
    authority_headers, _ = make_logged_in_user(client, make_user, app, role='authority', county_id=county_id, department_id=roads)
    wrong_authority_headers, _ = make_logged_in_user(client, make_user, app, role='authority', county_id=county_id, department_id=water)

    created = create_report(client, resident_headers, 1.0, 1.0, category_id=1)
    other_department_report = create_report(client, resident_headers, 1.0, 1.0, category_id=3)
    assert created.status_code == 201
    assert other_department_report.status_code == 201

    with app.app_context():
        report = db.session.get(Report, created.json['id'])
        assert report.department_id == roads
        assert db.session.get(Report, other_department_report.json['id']).department_id == water

    forbidden = client.get(f"/api/v1/reports/{created.json['id']}", headers=wrong_authority_headers)
    assert forbidden.status_code == 403

    allowed = client.get(f"/api/v1/reports/{created.json['id']}", headers=authority_headers)
    assert allowed.status_code == 200
    listed = client.get('/api/v1/reports?include_duplicates=true', headers=authority_headers)
    assert {item['id'] for item in listed.json['items']} == {created.json['id']}


def test_authority_without_department_has_no_report_access(client, app, make_user):
    county_id = make_county(app, 'Unassigned authority county', 'unassigned-authority', (0, 0, 2, 2))
    resident_headers, _ = make_logged_in_user(
        client, make_user, app, role='resident', county_id=county_id,
    )
    authority_headers, _ = make_logged_in_user(
        client, make_user, app, role='authority', county_id=county_id,
    )
    report = create_report(client, resident_headers, 1.0, 1.0)
    assert report.status_code == 201

    details = client.get(f"/api/v1/reports/{report.json['id']}", headers=authority_headers)
    listed = client.get('/api/v1/reports', headers=authority_headers)
    assert details.status_code == 403
    assert listed.status_code == 200 and listed.json['items'] == []


def test_county_admin_cannot_read_other_county_reports(client, app, make_user):
    home_county = make_county(app, 'Admin county', 'admin-county', (0, 0, 2, 2))
    report_county = make_county(app, 'Other report county', 'other-report-county', (10, 10, 12, 12))
    resident_headers, _ = make_logged_in_user(
        client, make_user, app, role='resident', county_id=home_county,
    )
    admin_headers, _ = make_logged_in_user(
        client, make_user, app, role='admin', county_id=home_county,
    )
    report = create_report(client, resident_headers, 11.0, 11.0)
    assert report.status_code == 201
    assert report.json['county_id'] == report_county
    assert client.get(
        f"/api/v1/reports/{report.json['id']}",
        headers=admin_headers,
    ).status_code == 403
    assert client.get('/api/v1/reports', headers=admin_headers).json['items'] == []


def test_report_assignment_uses_report_county_not_resident_county(client, app, make_user):
    resident_county = make_county(app, 'Resident County', 'resident-county', (0, 0, 2, 2))
    report_county = make_county(app, 'Report County', 'report-county', (10, 10, 12, 12))
    department_id = make_department(app, report_county, 'Roads & Public Works')
    headers, _ = make_logged_in_user(
        client, make_user, app, role='resident', county_id=resident_county,
    )

    created = create_report(client, headers, 11.0, 11.0, category_id=1)
    assert created.status_code == 201
    assert created.json['county_id'] == report_county
    assert created.json['county']['name'] == 'Report County'
    assert created.json['department_id'] == department_id
    assert created.json['department']['county_id'] == report_county
    assert created.json['department']['name'] == 'Roads & Public Works'


def test_county_performance_rankings_and_analytics(client, app, make_user):
    county_a = make_county(app, 'County A', 'county-a', (0, 0, 2, 2))
    county_b = make_county(app, 'County B', 'county-b', (10, 10, 12, 12))
    admin_headers, admin_id = who(client, make_user)('admin')

    with app.app_context():
        for county_id, status in ((county_a, 'resolved'), (county_a, 'resolved'), (county_a, 'reported'), (county_b, 'resolved')):
            report = Report(
                category_id=1,
                description='analytics case',
                location=WKTElement('POINT(0 0)', srid=4326),
                county_id=county_id,
                status=status,
                photo_path='test.jpg',
                created_by=admin_id,
            )
            db.session.add(report)
        db.session.commit()

    response = client.get('/api/v1/analytics/summary', headers=admin_headers).json
    county_rows = {item['county_name']: item for item in response['by_county']}
    assert county_rows['County A']['total_reports'] == 3
    assert county_rows['County A']['resolved_reports'] == 2
    assert county_rows['County A']['resolution_rate'] == 66.67
    assert county_rows['County B']['total_reports'] == 1
    assert county_rows['County B']['resolved_reports'] == 1
    assert response['by_county'][0]['county_name'] == 'County A'


def test_legacy_records_keep_county_fields_nullable(app):
    with app.app_context():
        user = User(name='Legacy user', email='legacy-user@test.civicpulse', password_hash='hashed', role='resident')
        db.session.add(user)
        db.session.commit()
        assert user.county_id is None
        assert user.department_id is None
