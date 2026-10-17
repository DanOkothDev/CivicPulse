import io
import uuid

import pytest
from sqlalchemy import func

from app import jobs
from app.extensions import db
from app.jobs import process_new_report
from app.models import Area, Hotspot

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100
LIST_URL = '/api/v1/analytics/hotspots'
RECOMPUTE_URL = '/api/v1/analytics/hotspots/recompute'


@pytest.fixture
def who(client, make_user):
    def _who(role):
        email, pw = make_user(role)
        token = client.post('/api/v1/auth/login', json={'email': email, 'password': pw}).json['token']
        return {'Authorization': 'Bearer ' + token}
    return _who


def submit(client, headers, lat, lon):
    data = {'category_id': '1', 'lat': lat, 'lon': lon, 'photo': (io.BytesIO(JPEG), 'a.jpg')}
    return client.post('/api/v1/reports', data=data, headers=headers, content_type='multipart/form-data').json['id']


def test_who_can_do_what(client, who):
    assert client.get(LIST_URL).status_code == 401
    assert client.get(LIST_URL, headers=who('resident')).status_code == 403
    assert client.get(LIST_URL, headers=who('authority')).status_code == 200
    assert client.get(LIST_URL, headers=who('admin')).status_code == 200
    assert client.post(RECOMPUTE_URL).status_code == 401
    assert client.post(RECOMPUTE_URL, headers=who('resident')).status_code == 403
    assert client.post(RECOMPUTE_URL, headers=who('authority')).status_code == 403   # admin only


def test_recompute_validation(client, who):
    admin = who('admin')
    for body in ({'eps_m': 'abc'}, {'eps_m': 0}, {'eps_m': -5}, {'eps_m': 999999}, {'min_samples': 0},
                 {'min_samples': 'x'}, {'eps_m': float('nan')}, [1, 2]):
        r = client.post(RECOMPUTE_URL, json=body, headers=admin)
        assert r.status_code == 400 and r.json['error']['code'] == 'invalid_parameters', body


def test_area_filter_scopes_hotspots_and_summary(client, app, who):
    resident, admin, authority = who('resident'), who('admin'), who('authority')
    area = client.post('/api/v1/areas', json={
        'name': f'Hotspot area {uuid.uuid4().hex}',
        'boundary': {
            'type': 'Polygon',
            'coordinates': [[[39.9, 39.9], [40.1, 39.9], [40.1, 40.1],
                             [39.9, 40.1], [39.9, 39.9]]],
        },
    }, headers=admin)
    assert area.status_code == 201
    area_id = area.json['id']
    for lat, lon in (('40.0', '40.0'), ('40.0003', '40.0'), ('40.0006', '40.0'),
                     ('41.0', '41.0'), ('41.0003', '41.0'), ('41.0006', '41.0')):
        submit(client, resident, lat, lon)

    try:
        from app.models import Report
        with app.app_context():
            print("Eligible reports:", Report.query.filter(Report.duplicate_of.is_  (None)).count())
        response = client.post(RECOMPUTE_URL, json={'eps_m': 100, 'min_samples': 3}, headers=admin)
        assert response.status_code == 200
        scoped = client.get(f'{LIST_URL}?area_id={area_id}', headers=authority)
        summary = client.get(f'/api/v1/analytics/summary?area_id={area_id}', headers=authority)
        assert scoped.status_code == 200 and len(scoped.json) == 1
        assert summary.status_code == 200 and summary.json['hotspot_count'] == 1
        assert len(client.get(LIST_URL, headers=authority).json) == 2
        assert client.get(f'{LIST_URL}?area_id=not-a-number', headers=authority).status_code == 422
    finally:
        with app.app_context():
            for lat, lon in ((40.0, 40.0), (41.0, 41.0)):
                point = func.ST_GeogFromText(f'SRID=4326;POINT({lon} {lat})')
                Hotspot.query.filter(func.ST_DWithin(Hotspot.center, point, 5000)).delete(
                    synchronize_session=False
                )
            db.session.query(Area).filter(Area.id == area_id).delete()
            db.session.commit()


def test_recompute_and_list_match_the_contract(client, app, who):
    resident, admin, authority = who('resident'), who('admin'), who('authority')
    for offset in ('0.0', '0.0003', '0.0006'):                       # three potholes about 30 m apart
        submit(client, resident, lat=f'40.{offset[2:] or "0"}', lon='40.0')
    submit(client, resident, lat='41.0', lon='41.0')                 # a lone report: noise
    try:
        result = client.post(RECOMPUTE_URL, json={'eps_m': 100, 'min_samples': 3}, headers=admin)
        assert result.status_code == 200
        assert {'clusters_created', 'noise_reports', 'reports_considered', 'eps_m', 'min_samples'} <= set(result.json)

        found = [h for h in client.get(LIST_URL, headers=authority).json
                 if abs(h['center']['lat'] - 40.0) < 0.01 and abs(h['center']['lon'] - 40.0) < 0.01]
        assert len(found) == 1
        hotspot = found[0]
        assert set(hotspot) == {'id', 'center', 'radius_m', 'report_count', 'top_category_id',
                                'top_category', 'computed_at'}
        assert hotspot['report_count'] == 3 and hotspot['top_category'] == 'Pothole'
        assert hotspot['top_category_id'] == 1 and 0 < hotspot['radius_m'] < 100
        assert not any(abs(h['center']['lat'] - 41.0) < 0.01 for h in client.get(LIST_URL, headers=authority).json)
    finally:  # leave no test hotspots behind in the shared database
        with app.app_context():
            for lat, lon in ((40.0, 40.0), (41.0, 41.0)):
                point = func.ST_GeogFromText(f'SRID=4326;POINT({lon} {lat})')
                Hotspot.query.filter(func.ST_DWithin(Hotspot.center, point, 5000)).delete(synchronize_session=False)
            db.session.commit()


def test_hotspots_refresh_after_new_reports_but_not_every_time(client, app, who, monkeypatch):
    calls = []
    monkeypatch.setattr(jobs, 'recompute_hotspots', lambda: calls.append(1))
    monkeypatch.setattr(jobs, '_last_hotspot_run', None)
    app.config['HOTSPOT_REFRESH_MINUTES'] = 10
    resident = who('resident')
    ids = [submit(client, resident, '10.0', '10.0') for _ in range(3)]   # inline mode ran each job at submit time
    assert calls == [1]                                                  # ...but clustering ran only once
    with app.app_context():
        process_new_report(ids[0])
    assert calls == [1]
    monkeypatch.setattr(jobs, '_last_hotspot_run', None)                 # pretend 10 minutes have passed
    with app.app_context():
        process_new_report(ids[0])
    assert calls == [1, 1]


def test_a_clustering_failure_never_breaks_the_report_job(client, app, who, monkeypatch):
    def boom():
        raise RuntimeError('clustering exploded')
    monkeypatch.setattr(jobs, 'recompute_hotspots', boom)
    monkeypatch.setattr(jobs, '_last_hotspot_run', None)
    app.config['HOTSPOT_REFRESH_MINUTES'] = 10
    resident = who('resident')
    rid = submit(client, resident, '10.0', '10.0')
    assert client.get(f'/api/v1/reports/{rid}', headers=resident).status_code == 200
    with app.app_context():
        monkeypatch.setattr(jobs, '_last_hotspot_run', None)
        assert process_new_report(rid) == {'note': 'no AI functions configured'}


def test_refresh_can_be_switched_off(client, app, who, monkeypatch):
    calls = []
    monkeypatch.setattr(jobs, 'recompute_hotspots', lambda: calls.append(1))
    monkeypatch.setattr(jobs, '_last_hotspot_run', None)
    app.config['HOTSPOT_REFRESH_MINUTES'] = 0
    submit(client, who('resident'), '10.0', '10.0')
    assert calls == []
