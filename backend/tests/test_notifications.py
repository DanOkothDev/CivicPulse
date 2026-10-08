import io
from datetime import date, timedelta

import pytest

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


@pytest.fixture
def who(client, make_user):
    def _who(role):
        email, pw = make_user(role)
        token = client.post('/api/v1/auth/login', json={'email': email, 'password': pw}).json['token']
        headers = {'Authorization': 'Bearer ' + token}
        return headers, client.get('/api/v1/auth/me', headers=headers).json['id']
    return _who


def make_report(client, headers):
    data = {'category_id': '1', 'lat': '10.0', 'lon': '10.0', 'photo': (io.BytesIO(JPEG), 'a.jpg')}
    return client.post('/api/v1/reports', data=data, headers=headers, content_type='multipart/form-data').json['id']


def status(client, h, rid, new, **extra):
    return client.patch(f'/api/v1/reports/{rid}/status', json={'status': new, **extra}, headers=h)


def inbox(client, h, **params):
    return client.get('/api/v1/notifications', query_string=params, headers=h).json


def messages(client, h):
    return [n['message'] for n in inbox(client, h)]


def test_author_and_followers_are_told_but_not_the_actor(client, who):
    author, _ = who('resident')
    follower, _ = who('resident')
    stranger, _ = who('resident')
    verifier, _ = who('verifier')
    rid = make_report(client, author)
    client.post(f'/api/v1/reports/{rid}/follow', headers=follower)

    status(client, verifier, rid, 'verified')
    for h in (author, follower):
        msgs = messages(client, h)
        assert len(msgs) == 1 and f'#{rid}' in msgs[0] and 'Pothole' in msgs[0] and 'verified' in msgs[0]
    assert inbox(client, stranger) == []
    assert inbox(client, verifier) == []           # no message about your own action


def test_author_who_also_follows_gets_only_one(client, who):
    author, _ = who('resident')
    verifier, _ = who('verifier')
    rid = make_report(client, author)
    client.post(f'/api/v1/reports/{rid}/follow', headers=author)
    status(client, verifier, rid, 'verified')
    assert len(inbox(client, author)) == 1


def test_rejection_includes_the_reason(client, who):
    author, _ = who('resident')
    verifier, _ = who('verifier')
    rid = make_report(client, author)
    status(client, verifier, rid, 'rejected', note='Not a public road')
    assert 'rejected: Not a public road' in messages(client, author)[0]


def test_assignment_and_reassignment(client, who):
    author, _ = who('resident')
    verifier, _ = who('verifier')
    first, first_id = who('authority')
    second, second_id = who('authority')
    rid = make_report(client, author)
    status(client, verifier, rid, 'verified')
    due = (date.today() + timedelta(days=3)).isoformat()

    client.post(f'/api/v1/reports/{rid}/assign', json={'assignee_id': first_id, 'due_date': due}, headers=verifier)
    assert len(inbox(client, first)) == 1 and f'assigned to you (due {due})' in messages(client, first)[0]
    assert any('has been assigned' in m for m in messages(client, author))

    client.post(f'/api/v1/reports/{rid}/assign', json={'assignee_id': second_id}, headers=verifier)
    assert 'assigned to you' in messages(client, second)[0]
    assert 'reassigned to someone else' in messages(client, first)[0]      # newest first
    assert len(inbox(client, first)) == 2


def test_merged_authors_keep_getting_updates(client, who):
    parent_author, _ = who('resident')
    child_author, _ = who('resident')
    verifier, _ = who('verifier')
    parent, child = make_report(client, parent_author), make_report(client, child_author)

    client.post(f'/api/v1/reports/{child}/merge', json={'parent_id': parent}, headers=verifier)
    merged = inbox(client, child_author)
    assert len(merged) == 1 and merged[0]['report_id'] == parent and f'#{child}' in merged[0]['message']

    status(client, verifier, parent, 'verified')
    after = messages(client, child_author)
    assert len(after) == 2 and 'verified' in after[0]                        # exactly one new message
    assert any('verified' in m for m in messages(client, parent_author))


def test_resolution_reaches_everyone_involved(client, app, who):
    author, _ = who('resident')
    verifier, _ = who('verifier')
    authority, aid = who('authority')
    rid = make_report(client, author)
    status(client, verifier, rid, 'verified')
    client.post(f'/api/v1/reports/{rid}/assign', json={'assignee_id': aid}, headers=verifier)
    status(client, authority, rid, 'in_progress')
    status(client, authority, rid, 'resolved')
    assert [m.split(') ', 1)[1] for m in messages(client, author)] == [
        'has been resolved', 'is now in progress', 'has been assigned', 'has been verified']


def test_inbox_read_and_counts(client, who):
    author, _ = who('resident')
    other, _ = who('resident')
    verifier, _ = who('verifier')
    for _ in range(3):
        status(client, verifier, make_report(client, author), 'verified')

    assert client.get('/api/v1/notifications/unread-count', headers=author).json == {'count': 3}
    first = inbox(client, author)[0]
    assert client.post(f"/api/v1/notifications/{first['id']}/read", headers=author).status_code == 204
    assert client.post(f"/api/v1/notifications/{first['id']}/read", headers=author).status_code == 204  # repeat is fine
    assert client.get('/api/v1/notifications/unread-count', headers=author).json['count'] == 2
    assert len(inbox(client, author, unread='true')) == 2 and len(inbox(client, author)) == 3
    assert len(inbox(client, author, per_page=1, page=2)) == 1

    # someone else's notification looks like it does not exist
    assert client.post(f"/api/v1/notifications/{first['id']}/read", headers=other).status_code == 404
    assert client.post('/api/v1/notifications/99999999/read', headers=author).status_code == 404

    assert client.post('/api/v1/notifications/read-all', headers=author).status_code == 204
    assert client.get('/api/v1/notifications/unread-count', headers=author).json['count'] == 0


def test_login_required(client):
    for url in ('/api/v1/notifications', '/api/v1/notifications/unread-count'):
        assert client.get(url).status_code == 401
    assert client.post('/api/v1/notifications/read-all').status_code == 401
