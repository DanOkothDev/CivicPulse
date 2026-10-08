import io
from datetime import date, timedelta

import pytest

from app.extensions import db
from app.models import Report

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


@pytest.fixture
def who(client, make_user):
    """who('verifier') -> (auth headers, user id)"""
    def _who(role):
        email, pw = make_user(role)
        token = client.post('/api/v1/auth/login', json={'email': email, 'password': pw}).json['token']
        headers = {'Authorization': 'Bearer ' + token}
        return headers, client.get('/api/v1/auth/me', headers=headers).json['id']
    return _who


@pytest.fixture
def report_id(client, who):
    headers, _ = who('resident')
    data = {'category_id': '1', 'lat': '10.0', 'lon': '10.0', 'photo': (io.BytesIO(JPEG), 'a.jpg')}
    return client.post('/api/v1/reports', data=data, headers=headers, content_type='multipart/form-data').json['id']


def status(client, headers, rid, new, **extra):
    return client.patch(f'/api/v1/reports/{rid}/status', json={'status': new, **extra}, headers=headers)


def assign(client, headers, rid, **body):
    return client.post(f'/api/v1/reports/{rid}/assign', json=body, headers=headers)


def history(client, headers, rid):
    return client.get(f'/api/v1/reports/{rid}/history', headers=headers).json


def test_full_lifecycle(client, who, report_id):
    verifier, vid = who('verifier')
    authority, aid = who('authority')
    due = (date.today() + timedelta(days=7)).isoformat()

    assert status(client, verifier, report_id, 'verified').status_code == 200
    r = assign(client, verifier, report_id, assignee_id=aid, due_date=due)
    assert r.status_code == 200
    assert r.json['status'] == 'assigned' and r.json['assigned_to'] == aid and r.json['due_date'] == due
    assert status(client, authority, report_id, 'in_progress').status_code == 200
    assert status(client, authority, report_id, 'resolved', note='Fixed').json['status'] == 'resolved'

    events = history(client, verifier, report_id)
    assert [e['status'] for e in events] == ['reported', 'verified', 'assigned', 'in_progress', 'resolved']
    assert events[2]['changed_by'] == vid and events[2]['note'].startswith('Assigned to ')


def test_only_verified_reports_can_be_assigned(client, who, report_id):
    verifier, _ = who('verifier')
    _, aid = who('authority')
    r = assign(client, verifier, report_id, assignee_id=aid)
    assert r.status_code == 409 and r.json['error']['code'] == 'invalid_transition'


def test_assignee_must_be_an_authority(client, who, report_id):
    verifier, _ = who('verifier')
    _, resident_id = who('resident')
    status(client, verifier, report_id, 'verified')
    for bad in (resident_id, 99999999, 'abc', None):
        r = assign(client, verifier, report_id, assignee_id=bad)
        assert r.status_code == 422 and 'assignee_id' in r.json['error']['details']


def test_due_date_validation(client, who, report_id):
    verifier, _ = who('verifier')
    _, aid = who('authority')
    status(client, verifier, report_id, 'verified')
    past = (date.today() - timedelta(days=1)).isoformat()
    assert assign(client, verifier, report_id, assignee_id=aid, due_date=past).status_code == 422
    assert assign(client, verifier, report_id, assignee_id=aid, due_date='next friday').status_code == 422
    assert assign(client, verifier, report_id, assignee_id=aid, due_date=date.today().isoformat()).status_code == 200


def test_permissions_and_missing_things(client, who, report_id):
    verifier, _ = who('verifier')
    resident, _ = who('resident')
    _, aid = who('authority')
    status(client, verifier, report_id, 'verified')
    assert assign(client, resident, report_id, assignee_id=aid).status_code == 403
    assert assign(client, {}, report_id, assignee_id=aid).status_code == 401
    assert assign(client, verifier, 99999999, assignee_id=aid).status_code == 404
    assert client.post(f'/api/v1/reports/{report_id}/assign', data='x', headers=verifier).status_code == 422


def test_reassign_only_before_work_starts(client, who, report_id):
    verifier, _ = who('verifier')
    first, first_id = who('authority')
    second, second_id = who('authority')
    status(client, verifier, report_id, 'verified')
    assign(client, verifier, report_id, assignee_id=first_id)

    r = assign(client, verifier, report_id, assignee_id=second_id)       # hand over while still 'assigned'
    assert r.status_code == 200 and r.json['assigned_to'] == second_id and r.json['status'] == 'assigned'
    last = history(client, verifier, report_id)[-1]
    assert last['status'] == 'assigned' and last['note'].startswith('Reassigned to ')
    assert status(client, first, report_id, 'in_progress').status_code == 403   # old assignee lost access

    assert status(client, second, report_id, 'in_progress').status_code == 200
    late = assign(client, verifier, report_id, assignee_id=first_id)
    assert late.status_code == 409 and late.json['error']['code'] == 'cannot_reassign'


def test_merged_duplicate_cannot_be_assigned(client, app, who, report_id):
    verifier, _ = who('verifier')
    _, aid = who('authority')
    status(client, verifier, report_id, 'verified')
    with app.app_context():
        db.session.get(Report, report_id).duplicate_of = report_id
        db.session.commit()
    r = assign(client, verifier, report_id, assignee_id=aid)
    assert r.status_code == 409 and r.json['error']['code'] == 'is_duplicate'


def test_users_list_for_the_assign_dropdown(client, who):
    verifier, _ = who('verifier')
    admin, _ = who('admin')
    _, aid = who('authority')
    resident, _ = who('resident')

    mine = client.get('/api/v1/users', headers=verifier)
    assert mine.status_code == 200
    assert aid in [u['id'] for u in mine.json]
    assert all(u['role'] == 'authority' and 'email' not in u for u in mine.json)
    assert client.get('/api/v1/users?role=admin', headers=verifier).status_code == 403
    assert client.get('/api/v1/users', headers=resident).status_code == 403
    assert client.get('/api/v1/users').status_code == 401

    everyone = client.get('/api/v1/users?role=admin', headers=admin)
    assert everyone.status_code == 200 and all(u['role'] == 'admin' and 'email' in u for u in everyone.json)
    assert client.get('/api/v1/users?role=wizard', headers=admin).status_code == 422
