import io
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import County, DuplicateSuggestion, Report

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


def _login(client, make_user, role, county_id=None):
    email, password = make_user(role, county_id=county_id)
    token = client.post('/api/v1/auth/login', json={'email': email, 'password': password}).json['token']
    return {'Authorization': f'Bearer {token}'}


def _report(client, headers):
    response = client.post('/api/v1/reports', data={
        'category_id': '1', 'lat': '10.0', 'lon': '10.0',
        'photo': (io.BytesIO(JPEG), 'report.jpg'),
    }, headers=headers, content_type='multipart/form-data')
    assert response.status_code == 201
    return response.json['id']


def _set_report(app, report_id, **fields):
    with app.app_context():
        report = db.session.get(Report, report_id)
        for key, value in fields.items():
            setattr(report, key, value)
        db.session.commit()


def test_endpoint_scopes_exclusions_scoring_order_and_pagination(client, app, make_user):
    with app.app_context():
        county_id = County.query.order_by(County.id).first().id
    admin = _login(client, make_user, 'admin', county_id=county_id)
    resident = _login(client, make_user, 'resident')
    ids = [_report(client, resident) for _ in range(4)]
    now = datetime.now(timezone.utc)
    _set_report(app, ids[0], created_at=now - timedelta(days=30), report_count=1)
    _set_report(app, ids[1], created_at=now - timedelta(days=30), report_count=2)
    _set_report(app, ids[2], status='resolved')
    _set_report(app, ids[3], duplicate_of=ids[1])
    with app.app_context():
        db.session.add(DuplicateSuggestion(
            report_id=ids[0], candidate_id=ids[1], score=0.99,
            reasons={'location': 1.0},
        ))
        db.session.commit()

    first = client.get('/api/v1/prioritization/reports?per_page=1', headers=admin)
    assert first.status_code == 200
    assert first.json['total'] == 2
    assert first.json['pages'] == 2
    assert first.json['items'][0]['id'] == ids[1]
    rec = first.json['items'][0]['recommendation']
    assert rec['score'] == 70 and rec['level'] == 'High'
    assert rec['confirmed_report_count'] == 2
    assert rec['age_contribution'] == 60
    assert rec['frequency_contribution'] == 10
    assert len(rec['limitations']) == 3

    second = client.get('/api/v1/prioritization/reports?page=2&per_page=1', headers=admin)
    assert second.json['items'][0]['id'] == ids[0]
    assert second.json['items'][0]['recommendation']['confirmed_report_count'] == 1
    assert second.json['items'][0]['recommendation']['frequency_contribution'] == 0
    assert second.json['summary'] == {'High': 1, 'Medium': 1, 'Low': 0}
    assert client.get('/api/v1/prioritization/reports?level=Medium', headers=admin).json['total'] == 1
    assert client.get('/api/v1/prioritization/reports?status=reported', headers=admin).json['total'] == 2


def test_access_is_county_admin_only_and_county_scoped(client, make_user):
    with client.application.app_context():
        county_id = County.query.order_by(County.id).first().id
    county_admin = _login(client, make_user, 'admin', county_id=county_id)
    national_admin = _login(client, make_user, 'admin', county_id=None)
    resident = _login(client, make_user, 'resident')
    verifier = _login(client, make_user, 'verifier')
    authority = _login(client, make_user, 'authority')
    assert client.get('/api/v1/prioritization/reports', headers=county_admin).status_code == 200
    for headers in (national_admin, resident, verifier, authority, {}):
        response = client.get('/api/v1/prioritization/reports', headers=headers)
        assert response.status_code in (401, 403)

    with client.application.app_context():
        other_county = County.query.order_by(County.id.desc()).first()
        other_county_id = other_county.id
    other_admin = _login(client, make_user, 'admin', county_id=other_county_id)
    assert client.get('/api/v1/prioritization/reports', headers=other_admin).json['total'] == 0


def test_invalid_pagination_and_filters_are_rejected(client, make_user):
    with client.application.app_context():
        county_id = County.query.order_by(County.id).first().id
    admin = _login(client, make_user, 'admin', county_id=county_id)
    assert client.get('/api/v1/prioritization/reports?page=x', headers=admin).status_code == 422
    assert client.get('/api/v1/prioritization/reports?level=urgent', headers=admin).status_code == 422
    assert client.get('/api/v1/prioritization/reports?status=resolved', headers=admin).status_code == 422