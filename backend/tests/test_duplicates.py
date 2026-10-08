import io

import pytest

from app.duplicate_service import save_suggestions
from app.extensions import db
from app.models import Report

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


@pytest.fixture
def who(client, make_user):
    def _who(role):
        email, pw = make_user(role)
        token = client.post('/api/v1/auth/login', json={'email': email, 'password': pw}).json['token']
        headers = {'Authorization': 'Bearer ' + token}
        return headers, client.get('/api/v1/auth/me', headers=headers).json['id']
    return _who


@pytest.fixture
def resident(who):
    return who('resident')[0]


@pytest.fixture
def new_report(client, resident):
    def _new():
        data = {'category_id': '1', 'lat': '10.0', 'lon': '10.0', 'photo': (io.BytesIO(JPEG), 'a.jpg')}
        return client.post('/api/v1/reports', data=data, headers=resident,
                           content_type='multipart/form-data').json['id']
    return _new


def merge(client, h, child, parent):
    return client.post(f'/api/v1/reports/{child}/merge', json={'parent_id': parent}, headers=h)


def unmerge(client, h, rid):
    return client.post(f'/api/v1/reports/{rid}/unmerge', headers=h)


def get(client, h, rid):
    return client.get(f'/api/v1/reports/{rid}', headers=h).json


def set_db(app, rid, **fields):
    with app.app_context():
        report = db.session.get(Report, rid)
        for k, v in fields.items():
            setattr(report, k, v)
        db.session.commit()


def test_suggestions_are_stored_and_listed_best_first(client, app, who, new_report):
    verifier, _ = who('verifier')
    a, b, c = new_report(), new_report(), new_report()
    with app.app_context():
        saved = save_suggestions(a, [
            {'report_id': b, 'score': 0.55, 'reasons': {'location': 0.5}},
            {'report_id': c, 'score': 0.83, 'reasons': {'location': 0.8, 'photo': None}},
            {'report_id': a, 'score': 0.99, 'reasons': {}},            # itself: ignored
            {'report_id': 99999999, 'score': 0.9, 'reasons': {}},      # unknown: ignored
        ])
        assert saved == 2
        with pytest.raises(ValueError):
            save_suggestions(a, [{'report_id': b, 'score': 1.5}])
    r = client.get(f'/api/v1/reports/{a}/duplicates', headers=verifier)
    assert r.status_code == 200
    assert [s['report_id'] for s in r.json] == [c, b]
    assert r.json[0]['score'] == 0.83 and r.json[0]['reasons']['location'] == 0.8
    with app.app_context():  # saving again replaces the old suggestions
        save_suggestions(a, [{'report_id': b, 'score': 0.7, 'reasons': {}}])
    assert [s['report_id'] for s in client.get(f'/api/v1/reports/{a}/duplicates', headers=verifier).json] == [b]


def test_suggestion_permissions(client, who, resident, new_report):
    rid = new_report()
    assert client.get(f'/api/v1/reports/{rid}/duplicates', headers=resident).status_code == 403
    assert client.get(f'/api/v1/reports/{rid}/duplicates').status_code == 401
    verifier, _ = who('verifier')
    assert client.get('/api/v1/reports/99999999/duplicates', headers=verifier).status_code == 404


def test_merge_and_unmerge(client, app, who, resident, new_report):
    verifier, _ = who('verifier')
    parent, child = new_report(), new_report()
    with app.app_context():
        save_suggestions(child, [{'report_id': parent, 'score': 0.83, 'reasons': {}}])
    assert client.post(f'/api/v1/reports/{child}/follow', headers=resident).status_code == 204

    r = merge(client, verifier, child, parent)
    assert r.status_code == 200 and r.json['id'] == parent and r.json['report_count'] == 2
    merged = get(client, verifier, child)
    assert merged['duplicate_of'] == parent
    with app.app_context():
        assert db.session.get(Report, child).duplicate_score == 0.83
    assert get(client, resident, parent)['is_following'] is True        # followers move to the main report
    listed = {i['id'] for i in client.get('/api/v1/reports?mine=true', headers=resident).json['items']}
    assert parent in listed and child not in listed                     # duplicates are hidden from lists
    notes = [e['note'] for e in client.get(f'/api/v1/reports/{child}/history', headers=verifier).json]
    assert f'Merged into #{parent}' in notes

    back = unmerge(client, verifier, child)
    assert back.status_code == 200 and back.json['duplicate_of'] is None
    assert get(client, verifier, parent)['report_count'] == 1
    assert unmerge(client, verifier, child).json['error']['code'] == 'not_merged'


def test_merge_rules(client, app, who, new_report):
    verifier, _ = who('verifier')
    a, b, c = new_report(), new_report(), new_report()

    assert merge(client, verifier, a, a).json['error']['code'] == 'self_merge'
    assert client.post(f'/api/v1/reports/{a}/merge', json={}, headers=verifier).status_code == 422
    assert merge(client, verifier, a, 99999999).status_code == 422
    assert merge(client, verifier, 99999999, a).status_code == 404

    assert merge(client, verifier, b, a).status_code == 200
    assert merge(client, verifier, b, c).json['error']['code'] == 'already_merged'
    assert merge(client, verifier, c, b).json['error']['code'] == 'parent_is_duplicate'

    set_db(app, c, status='assigned')
    assert merge(client, verifier, c, a).json['error']['code'] == 'child_not_mergeable'
    set_db(app, a, status='resolved')
    d = new_report()
    assert merge(client, verifier, d, a).json['error']['code'] == 'parent_not_open'


def test_merging_a_report_that_has_duplicates_keeps_one_level(client, who, new_report):
    verifier, _ = who('verifier')
    p, c, d = new_report(), new_report(), new_report()
    merge(client, verifier, d, c)                       # d into c
    r = merge(client, verifier, c, p)                   # then c (with d) into p
    assert r.json['report_count'] == 3
    assert get(client, verifier, d)['duplicate_of'] == p
    unmerge(client, verifier, c)
    assert get(client, verifier, p)['report_count'] == 2    # d stays with p


def test_merge_permissions(client, who, new_report):
    a, b = new_report(), new_report()
    for role in ('resident', 'authority'):
        assert merge(client, who(role)[0], b, a).status_code == 403
        assert unmerge(client, who(role)[0], b).status_code == 403
    assert merge(client, {}, b, a).status_code == 401
    assert merge(client, who('admin')[0], b, a).status_code == 200
