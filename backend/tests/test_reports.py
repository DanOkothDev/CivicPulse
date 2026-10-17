import io
import uuid
from urllib.parse import urlparse

import pytest

from app.extensions import db
from app.models import Area, Report, StatusEvent

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


@pytest.fixture
def auth(token_for):
    return {'Authorization': 'Bearer ' + token_for('resident')}


def post_report(client, headers, **over):
    data = {'category_id': '1', 'lat': '10.0', 'lon': '10.0', 'description': 'Deep hole',
            'photo': (io.BytesIO(JPEG), 'a.jpg')}
    data.update(over)
    data = {k: v for k, v in data.items() if v is not None}  # pass None to leave a field out
    return client.post('/api/v1/reports', data=data, headers=headers, content_type='multipart/form-data')


def test_create_report(client, app, auth):
    r = post_report(client, auth, lat='-1.2921', lon='36.8219',
                    address='Main Street', landmark='Library')
    assert r.status_code == 201
    j = r.json
    assert j['status'] == 'reported' and j['report_count'] == 1 and j['is_following'] is False
    assert j['location'] == {'lat': pytest.approx(-1.2921), 'lon': pytest.approx(36.8219)}
    assert j['category']['name'] == 'Pothole'
    assert j['address'] == 'Main Street' and j['landmark'] == 'Library'
    with app.app_context():  # the first status event is recorded
        assert StatusEvent.query.filter_by(report_id=j['id'], status='reported').count() == 1
    photo = client.get(urlparse(j['photo_url']).path)  # and the photo can be fetched back
    assert photo.status_code == 200 and photo.data.startswith(b'\xff\xd8\xff')


def test_create_requires_login(client):
    assert post_report(client, {}).status_code == 401


def test_create_validation(client, auth):
    r = post_report(client, auth, category_id='999', lat='95', lon=None, photo=None)
    assert r.status_code == 422
    assert set(r.json['error']['details']) == {'category_id', 'lat', 'lon', 'photo'}


def test_fake_image_is_rejected(client, auth):
    r = post_report(client, auth, photo=(io.BytesIO(b'just text'), 'virus.jpg'))
    assert r.status_code == 422 and 'photo' in r.json['error']['details']


def test_photo_too_big(client, auth):
    big = (io.BytesIO(b'\xff\xd8\xff' + b'0' * (6 * 1024 * 1024)), 'big.jpg')
    r = post_report(client, auth, photo=big)
    assert r.status_code == 413 and 'error' in r.json


def test_get_one_and_404(client, auth):
    rid = post_report(client, auth).json['id']
    assert client.get(f'/api/v1/reports/{rid}', headers=auth).json['id'] == rid
    missing = client.get('/api/v1/reports/99999999', headers=auth)
    assert missing.status_code == 404 and missing.json['error']['code'] == 'not_found'
    assert client.get(f'/api/v1/reports/{rid}').status_code == 401


def test_report_location_context_validation_and_search(client, auth):
    rid = post_report(client, auth, address='Civic Avenue', landmark='Central Library').json['id']
    report = client.get(f'/api/v1/reports/{rid}', headers=auth).json
    assert report['address'] == 'Civic Avenue'
    assert report['landmark'] == 'Central Library'
    assert client.get('/api/v1/reports?search=Central%20Library', headers=auth).json['total'] >= 1

    invalid = post_report(client, auth, address='a' * 256, landmark='l' * 121)
    assert invalid.status_code == 422
    assert {'address', 'landmark'} <= set(invalid.json['error']['details'])


def test_report_is_assigned_to_area_when_inside_configured_boundary(client, token_for, app):
    admin = {'Authorization': 'Bearer ' + token_for('admin')}
    resident = {'Authorization': 'Bearer ' + token_for('resident')}
    area = client.post('/api/v1/areas', json={
        'name': f'Report boundary {uuid.uuid4().hex}',
        'boundary': {
            'type': 'Polygon',
            'coordinates': [[[9.9, 9.9], [10.1, 9.9], [10.1, 10.1],
                             [9.9, 10.1], [9.9, 9.9]]],
        },
    }, headers=admin)
    assert area.status_code == 201

    response = post_report(client, resident, lat='10.0', lon='10.0')
    assert response.status_code == 201
    assert response.json['area_id'] == area.json['id']

    with app.app_context():
        db.session.delete(db.session.get(Area, area.json['id']))
        db.session.commit()


def test_report_processing_runs_inline_if_redis_enqueue_fails(client, app, auth, monkeypatch):
    from app.api import reports as reports_api

    calls = []
    app.config['QUEUE_MODE'] = 'redis'

    def queue_failure(*args):
        raise ConnectionError('Redis unavailable')

    monkeypatch.setattr(reports_api, 'enqueue', queue_failure)
    monkeypatch.setattr(reports_api, 'process_new_report', lambda report_id: calls.append(report_id))
    response = post_report(client, auth)

    assert response.status_code == 201
    assert calls == [response.json['id']]


def test_list_filters_and_pagination(client, app, auth):
    a = post_report(client, auth, lat='11.0', lon='11.0', category_id='1').json['id']
    b = post_report(client, auth, lat='12.0', lon='12.0', category_id='2').json['id']
    ids = lambda r: {i['id'] for i in r.json['items']}

    assert ids(client.get('/api/v1/reports?bbox=10.5,10.5,11.5,11.5', headers=auth)) == {a}
    assert ids(client.get('/api/v1/reports?mine=true&category_id=2', headers=auth)) == {b}
    assert client.get('/api/v1/reports?mine=true', headers=auth).json['total'] == 2
    page = client.get('/api/v1/reports?mine=true&per_page=1&page=2', headers=auth).json
    assert len(page['items']) == 1 and page['total'] == 2 and page['page'] == 2
    assert ids(client.get('/api/v1/reports?mine=true&status=reported', headers=auth)) == {a, b}
    assert ids(client.get('/api/v1/reports?mine=true&search=Deep', headers=auth)) == {a, b}
    assert ids(client.get(f'/api/v1/reports?mine=true&search={a}', headers=auth)) == {a}
    assert client.get('/api/v1/reports?status=bogus', headers=auth).status_code == 422
    assert client.get('/api/v1/reports?bbox=1,2,3', headers=auth).status_code == 422

    with app.app_context():  # mark b as a duplicate of a
        db.session.get(Report, b).duplicate_of = a
        db.session.commit()
    assert ids(client.get('/api/v1/reports?mine=true', headers=auth)) == {a}
    assert ids(client.get('/api/v1/reports?mine=true&include_duplicates=true', headers=auth)) == {a, b}


def test_follow_and_unfollow(client, auth):
    rid = post_report(client, auth).json['id']
    assert client.post(f'/api/v1/reports/{rid}/follow', headers=auth).status_code == 204
    assert client.post(f'/api/v1/reports/{rid}/follow', headers=auth).status_code == 204  # safe to repeat
    assert client.get(f'/api/v1/reports/{rid}', headers=auth).json['is_following'] is True
    listed = client.get('/api/v1/reports?following=true', headers=auth).json['items']
    assert [i['id'] for i in listed] == [rid]
    assert client.delete(f'/api/v1/reports/{rid}/follow', headers=auth).status_code == 204
    assert client.get(f'/api/v1/reports/{rid}', headers=auth).json['is_following'] is False
    assert client.post('/api/v1/reports/99999999/follow', headers=auth).status_code == 404
