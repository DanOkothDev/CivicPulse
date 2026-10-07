import io

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


def patch(client, headers, rid, status, **extra):
    return client.patch(f'/api/v1/reports/{rid}/status', json={'status': status, **extra}, headers=headers)


def set_db(app, rid, **fields):
    with app.app_context():
        report = db.session.get(Report, rid)
        for key, value in fields.items():
            setattr(report, key, value)
        db.session.commit()


def test_verifier_verifies_and_history_grows(client, who, report_id):
    verifier, vid = who('verifier')
    r = patch(client, verifier, report_id, 'verified', note='Seen on site')
    assert r.status_code == 200 and r.json['status'] == 'verified'
    history = client.get(f'/api/v1/reports/{report_id}/history', headers=verifier).json
    assert [e['status'] for e in history] == ['reported', 'verified']
    assert history[1]['changed_by'] == vid and history[1]['note'] == 'Seen on site'


def test_residents_and_anonymous_cannot_change_status(client, who, report_id):
    resident, _ = who('resident')
    assert patch(client, resident, report_id, 'verified').status_code == 403
    assert patch(client, {}, report_id, 'verified').status_code == 401


def test_invalid_jump_is_rejected(client, who, report_id):
    admin, _ = who('admin')
    r = patch(client, admin, report_id, 'resolved')
    assert r.status_code == 409 and r.json['error']['code'] == 'invalid_transition'
    assert r.json['error']['details']['allowed'] == ['rejected', 'verified']


def test_reject_needs_a_reason_and_is_final(client, who, report_id):
    verifier, _ = who('verifier')
    assert patch(client, verifier, report_id, 'rejected').status_code == 422
    assert patch(client, verifier, report_id, 'rejected', note='Spam').status_code == 200
    again = patch(client, verifier, report_id, 'verified')
    assert again.status_code == 409 and again.json['error']['code'] == 'invalid_transition'


def test_assigned_must_use_assign_endpoint(client, who, report_id):
    admin, _ = who('admin')
    patch(client, admin, report_id, 'verified')
    r = patch(client, admin, report_id, 'assigned')
    assert r.status_code == 409 and r.json['error']['code'] == 'use_assign_endpoint'


def test_bad_bodies(client, who, report_id):
    admin, _ = who('admin')
    assert patch(client, admin, report_id, 'bogus').status_code == 422
    assert client.patch(f'/api/v1/reports/{report_id}/status', json={}, headers=admin).status_code == 422
    assert client.patch(f'/api/v1/reports/{report_id}/status', data='x', headers=admin).status_code == 422
    assert patch(client, admin, 99999999, 'verified').status_code == 404


def test_authority_works_only_on_own_assigned_reports(client, app, who, report_id):
    authority, aid = who('authority')
    other, _ = who('authority')
    verifier, _ = who('verifier')
    set_db(app, report_id, status='assigned', assigned_to=aid)

    assert patch(client, verifier, report_id, 'in_progress').status_code == 403   # wrong role
    refused = patch(client, other, report_id, 'in_progress')                       # not the assignee
    assert refused.status_code == 403 and refused.json['error']['code'] == 'not_assignee'
    assert patch(client, authority, report_id, 'in_progress').status_code == 200
    done = patch(client, authority, report_id, 'resolved', note='Filled and compacted')
    assert done.status_code == 200 and done.json['status'] == 'resolved'
    history = client.get(f'/api/v1/reports/{report_id}/history', headers=authority).json
    assert [e['status'] for e in history] == ['reported', 'in_progress', 'resolved']


def test_admin_can_work_on_any_assigned_report(client, app, who, report_id):
    admin, _ = who('admin')
    _, aid = who('authority')
    set_db(app, report_id, status='assigned', assigned_to=aid)
    assert patch(client, admin, report_id, 'in_progress').status_code == 200


def test_duplicates_cannot_be_updated_directly(client, app, who, report_id):
    admin, _ = who('admin')
    set_db(app, report_id, duplicate_of=report_id)  # pretend it was merged
    r = patch(client, admin, report_id, 'verified')
    assert r.status_code == 409 and r.json['error']['code'] == 'is_duplicate'


def test_history_requires_login_and_existing_report(client, who, report_id):
    resident, _ = who('resident')
    assert client.get(f'/api/v1/reports/{report_id}/history').status_code == 401
    assert client.get('/api/v1/reports/99999999/history', headers=resident).status_code == 404
    assert len(client.get(f'/api/v1/reports/{report_id}/history', headers=resident).json) == 1
