import io
import uuid
from datetime import timedelta

import pytest

from app.constants import STATUSES
from app.extensions import db
from app.models import Area, Report, StatusEvent

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100
URLS = ['/api/v1/analytics/summary', '/api/v1/analytics/categories',
        '/api/v1/analytics/statuses', '/api/v1/analytics/trends']


@pytest.fixture
def who(client, make_user):
    def _who(role):
        email, pw = make_user(role)
        token = client.post('/api/v1/auth/login', json={'email': email, 'password': pw}).json['token']
        headers = {'Authorization': 'Bearer ' + token}
        return headers, client.get('/api/v1/auth/me', headers=headers).json['id']
    return _who


@pytest.fixture
def area(app):
    """A private area, so the numbers in a test are never mixed with real or seeded reports."""
    with app.app_context():
        record = Area(name=f'Test area {uuid.uuid4().hex[:8]}')
        db.session.add(record)
        db.session.commit()
        area_id, name = record.id, record.name
    yield area_id, name
    with app.app_context():
        Area.query.filter_by(id=area_id).delete()
        db.session.commit()


def new_report(client, headers):
    data = {'category_id': '1', 'lat': '10.0', 'lon': '10.0', 'photo': (io.BytesIO(JPEG), 'a.jpg')}
    return client.post('/api/v1/reports', data=data, headers=headers, content_type='multipart/form-data').json['id']


def test_only_staff_can_see_analytics(client, who):
    resident, _ = who('resident')
    for url in URLS:
        assert client.get(url).status_code == 401
        assert client.get(url, headers=resident).status_code == 403
        for role in ('authority', 'admin'):
            assert client.get(url, headers=who(role)[0]).status_code == 200


def test_summary_counts_cases_not_duplicates(client, app, who, area):
    area_id, area_name = area
    resident, uid = who('resident')
    staff, _ = who('authority')
    a, b, c, d = (new_report(client, resident) for _ in range(4))
    with app.app_context():
        for rid in (a, b, c, d):
            db.session.get(Report, rid).area_id = area_id
        db.session.get(Report, b).status, db.session.get(Report, b).category_id = 'verified', 2
        resolved = db.session.get(Report, c)
        resolved.status = 'resolved'
        db.session.add(StatusEvent(report_id=c, status='resolved', changed_by=uid,
                                   created_at=resolved.created_at + timedelta(days=2)))
        db.session.get(Report, d).duplicate_of = a                    # d is the same problem as a
        db.session.commit()

    s = client.get(f'/api/v1/analytics/summary?area_id={area_id}', headers=staff).json
    assert s['total_reports'] == 3 and s['open_reports'] == 2 and s['resolved_reports'] == 1
    assert s['by_status'] == {status: {'reported': 1, 'verified': 1, 'resolved': 1}.get(status, 0)
                              for status in STATUSES}
    assert s['by_category']['Pothole'] == 2 and s['by_category']['Streetlight'] == 1
    assert len(s['by_category']) == 6                                  # every category, even with 0
    assert s['open_by_area'] == [{'area_id': area_id, 'area': area_name, 'open': 2}]
    assert s['avg_days_to_resolve'] == 2.0
    assert isinstance(s['hotspot_count'], int)

    cats = client.get(f'/api/v1/analytics/categories?area_id={area_id}', headers=staff).json
    assert {c['category']: c['count'] for c in cats}['Pothole'] == 2
    stats = client.get(f'/api/v1/analytics/statuses?area_id={area_id}', headers=staff).json
    assert {s_['status']: s_['count'] for s_ in stats} == {'reported': 1, 'verified': 1, 'resolved': 1}


def test_empty_area(client, who, area):
    staff, _ = who('admin')
    s = client.get(f'/api/v1/analytics/summary?area_id={area[0]}', headers=staff).json
    assert s['total_reports'] == 0 and s['open_by_area'] == [] and s['avg_days_to_resolve'] is None
    assert set(s['by_status']) == set(STATUSES)


def test_bad_area_id(client, who):
    staff, _ = who('admin')
    for url in URLS[:3]:
        r = client.get(url + '?area_id=abc', headers=staff)
        assert r.status_code == 422 and r.json['error']['code'] == 'validation_error'


def test_trends(client, app, who):
    resident, _ = who('resident')
    staff, _ = who('admin')

    def today():
        return client.get('/api/v1/analytics/trends?days=7', headers=staff).json['daily_reports'][-1]['count']

    before = today()
    first = new_report(client, resident)
    new_report(client, resident)
    with app.app_context():
        db.session.get(Report, first).duplicate_of = None
        db.session.commit()
    dup = new_report(client, resident)
    with app.app_context():
        db.session.get(Report, dup).duplicate_of = first
        db.session.commit()
    assert today() == before + 3                                       # trends count every submission

    data = client.get('/api/v1/analytics/trends?days=7', headers=staff).json
    assert data['days'] == 7 and len(data['daily_reports']) == 7
    assert data['daily_reports'][0]['date'] < data['daily_reports'][-1]['date']


def test_trends_validation(client, who):
    staff, _ = who('admin')
    for days in ('0', '366', 'abc'):
        r = client.get(f'/api/v1/analytics/trends?days={days}', headers=staff)
        assert r.status_code == 400 and r.json['error']['code'] == 'invalid_days'


def test_leaderboard_counts_only_verified_unique_contributions(client, app, who):
    resident, uid = who('resident')
    staff, _ = who('verifier')
    first, duplicate, rejected, unresolved = (new_report(client, resident) for _ in range(4))
    with app.app_context():
        db.session.get(Report, first).status = 'resolved'
        db.session.get(Report, duplicate).status = 'verified'
        db.session.get(Report, duplicate).duplicate_of = first
        db.session.get(Report, rejected).status = 'rejected'
        db.session.commit()
    assert client.get('/api/v1/leaderboard').status_code == 401
    assert client.get('/api/v1/leaderboard', headers=staff).status_code == 403
    result = client.get('/api/v1/leaderboard?period=all_time', headers=resident).json
    assert result['my_stats'] == {'verified_contributions': 1, 'points': 10, 'rank': 1}
    assert result['entries'][0]['verified_contributions'] == 1
    assert result['entries'][0]['points'] == 10
    assert 'email' not in result['entries'][0]
    assert result['scoring']
    assert client.get('/api/v1/leaderboard?period=bad', headers=resident).status_code == 422


def test_public_analytics_are_aggregate_and_role_limited(client, who):
    resident, _ = who('resident')
    admin, _ = who('admin')
    assert client.get('/api/v1/analytics/public').status_code == 401
    assert client.get('/api/v1/analytics/public', headers=admin).status_code == 403
    result = client.get('/api/v1/analytics/public', headers=resident).json
    assert result['total_reports'] == 0
    assert result['resolved_reports'] == 0
    assert result['unresolved_reports'] == 0
    assert 'email' not in str(result).lower()
    assert 'location' not in result


def test_admin_summary_includes_workload_metrics(client, who):
    admin, _ = who('admin')
    resident, _ = who('resident')
    new_report(client, resident)
    summary = client.get('/api/v1/analytics/summary', headers=admin).json
    assert summary['awaiting_verification'] == 1
    assert summary['awaiting_assignment'] == 0
    assert summary['overdue_reports'] == 0
    assert isinstance(summary['by_department'], list)
    reporting_county = next(row for row in summary['by_county'] if row['total_reports'] == 1)
    assert reporting_county['open_reports'] == 1
    assert reporting_county['overdue_reports'] == 0
    assert reporting_county['avg_days_to_resolve'] is None
