import io
import os
import uuid

import pytest
from redis import Redis

from app import jobs
from app.jobs import process_new_report
from app.jobqueue import get_queue

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


@pytest.fixture
def who(client, make_user):
    def _who(role):
        email, pw = make_user(role)
        token = client.post('/api/v1/auth/login', json={'email': email, 'password': pw}).json['token']
        return {'Authorization': 'Bearer ' + token}
    return _who


def submit(client, headers, lat='10.0', lon='10.0'):  # a remote spot, so real or seeded reports never interfere
    data = {'category_id': '1', 'lat': lat, 'lon': lon, 'photo': (io.BytesIO(JPEG), 'a.jpg')}
    return client.post('/api/v1/reports', data=data, headers=headers, content_type='multipart/form-data')


def fake_hooks(monkeypatch, classify=None, find=None):
    hooks = {'AI_CLASSIFIER': classify, 'AI_DUPLICATES': find}
    monkeypatch.setattr(jobs, 'load_hook', lambda key: hooks[key])


def test_job_stores_ai_results(client, app, who, monkeypatch):
    resident, verifier = who('resident'), who('verifier')
    other = submit(client, resident).json['id']
    rid = submit(client, resident).json['id']
    seen = {}

    def classify(photo_path):
        seen['photo'] = photo_path
        return {'category_id': 3, 'confidence': 0.91}

    def find(report, candidates):
        seen['report'], seen['candidates'] = report, candidates
        return [{'report_id': other, 'score': 0.83, 'reasons': {'location': 0.8}}]

    fake_hooks(monkeypatch, classify, find)
    with app.app_context():
        outcome = process_new_report(rid)
        process_new_report(rid)  # running twice is harmless
    assert outcome == {'classifier': 'saved', 'duplicates_saved': 1}

    report = client.get(f'/api/v1/reports/{rid}', headers=resident).json
    assert report['ai_suggested_category'] == {'category_id': 3, 'confidence': 0.91}
    suggestions = client.get(f'/api/v1/reports/{rid}/duplicates', headers=verifier).json
    assert [s['report_id'] for s in suggestions] == [other] and suggestions[0]['reasons'] == {'location': 0.8}
    assert os.path.exists(seen['photo'])                        # the classifier gets a real file path
    assert seen['report']['id'] == rid and seen['report']['lat'] == pytest.approx(10.0)
    assert seen['report']['lon'] == pytest.approx(10.0) and seen['report']['category_id'] == 1
    assert seen['report']['category'] == 'Pothole'
    assert [c['id'] for c in seen['candidates']] == [other]      # the older nearby report is handed over
    assert seen['candidates'][0]['distance_m'] == 0 and seen['candidates'][0]['category'] == 'Pothole'


def test_only_sensible_candidates_are_passed_on(client, app, who, monkeypatch):
    from app.extensions import db
    from app.models import Report
    resident = who('resident')
    near_a = submit(client, resident).json['id']
    near_b = submit(client, resident, lat='10.00045', lon='10.0').json['id']      # about 50 m away
    far = submit(client, resident, lat='10.5', lon='10.5').json['id']          # tens of km away
    merged, resolved = submit(client, resident).json['id'], submit(client, resident).json['id']
    with app.app_context():
        db.session.get(Report, merged).duplicate_of = near_a
        db.session.get(Report, resolved).status = 'resolved'
        db.session.commit()
    new = submit(client, resident).json['id']
    newer = submit(client, resident).json['id']                                      # created later: not a candidate
    seen = {}
    fake_hooks(monkeypatch, find=lambda report, candidates: seen.setdefault('c', candidates) and [])
    with app.app_context():
        process_new_report(new)
    ids = [c['id'] for c in seen['c']]
    assert set(ids) == {near_a, near_b} and ids[0] == near_a                         # closest first
    assert far not in ids and merged not in ids and resolved not in ids and newer not in ids


def test_malformed_duplicate_suggestions_are_skipped(client, app, who, monkeypatch):
    resident, verifier = who('resident'), who('verifier')
    a, b, c, d = (submit(client, resident).json['id'] for _ in range(4))
    answer = [{'report_id': a, 'score': 0.5, 'reasons': {'location': 0.5}},
              {'report_id': 'x'}, {'report_id': b, 'score': 7}, {'score': 0.4},
              {'report_id': c, 'score': 0.6, 'distance_meters': 12.0, 'reason': 'same category'}]  # simple style
    fake_hooks(monkeypatch, find=lambda report, candidates: answer)
    with app.app_context():
        assert process_new_report(d)['duplicates_saved'] == 2
    saved = {s['report_id']: s for s in client.get(f'/api/v1/reports/{d}/duplicates', headers=verifier).json}
    assert set(saved) == {a, c}
    assert saved[c]['reasons'] == {'reason': 'same category', 'distance_meters': 12.0}


def test_unusable_classifier_output_is_ignored(client, app, who, monkeypatch):
    resident = who('resident')
    rid = submit(client, resident).json['id']
    for bad in ({'category_id': 999, 'confidence': 0.5}, {'category_id': 1, 'confidence': 5}, 'nonsense', None):
        fake_hooks(monkeypatch, classify=lambda path, bad=bad: bad)
        with app.app_context():
            assert process_new_report(rid)['classifier'].startswith('ignored')
    assert client.get(f'/api/v1/reports/{rid}', headers=resident).json['ai_suggested_category'] is None


def test_classifier_may_return_a_category_name(client, app, who, monkeypatch):
    resident = who('resident')
    rid = submit(client, resident).json['id']

    def stored():
        return client.get(f'/api/v1/reports/{rid}', headers=resident).json['ai_suggested_category']

    for answer, expected in (({'category': 'water_leak', 'confidence': 0.8}, 5),
                             ({'category': 'Public Facility', 'confidence': 0.6}, 6),
                             ({'category': 'DRAINAGE', 'confidence': 0.9}, 3),
                             ({'category': 'garbage', 'category_id': 2, 'confidence': 0.5}, 2)):  # id wins
        fake_hooks(monkeypatch, classify=lambda path, a=answer: a)
        with app.app_context():
            assert process_new_report(rid)['classifier'] == 'saved'
        assert stored()['category_id'] == expected

    fake_hooks(monkeypatch, classify=lambda path: {'category': 'banana', 'confidence': 0.9})
    with app.app_context():
        assert process_new_report(rid)['classifier'].startswith('ignored')
    assert stored()['category_id'] == 2                                       # unchanged


def test_nothing_configured_and_missing_report(client, app, who):
    rid = submit(client, who('resident')).json['id']
    with app.app_context():
        assert process_new_report(rid) == {'note': 'no AI functions configured'}
        assert process_new_report(99999999) == {'skipped': 'report not found'}


def test_inline_mode_runs_during_the_request(client, who, monkeypatch):
    fake_hooks(monkeypatch, classify=lambda path: {'category_id': 2, 'confidence': 0.7})
    resident = who('resident')
    rid = submit(client, resident).json['id']
    assert client.get(f'/api/v1/reports/{rid}', headers=resident).json['ai_suggested_category']['category_id'] == 2


def test_a_failing_ai_function_never_blocks_a_report(client, who, monkeypatch):
    def boom(path):
        raise RuntimeError('model crashed')
    fake_hooks(monkeypatch, classify=boom)
    resident = who('resident')
    r = submit(client, resident)
    assert r.status_code == 201
    assert client.get(f"/api/v1/reports/{r.json['id']}", headers=resident).status_code == 200  # database still fine


def test_health_shows_the_queue(client):
    assert client.get('/api/v1/health').json['queue'] == {'mode': 'inline'}


@pytest.fixture
def redis_queue(app):
    app.config.update(QUEUE_MODE='redis', QUEUE_NAME=f'test-{uuid.uuid4().hex[:8]}')  # a private queue
    try:
        Redis.from_url(app.config['REDIS_URL'], socket_connect_timeout=1).ping()
    except Exception:
        pytest.skip('Redis is not running (start it with: docker compose up -d)')
    with app.app_context():
        queue = get_queue()
    yield queue
    queue.delete(delete_jobs=True)


def test_report_puts_a_job_on_the_redis_queue(client, who, redis_queue):
    rid = submit(client, who('resident')).json['id']
    assert redis_queue.count == 1
    job = redis_queue.jobs[0]
    assert job.func_name == 'app.jobs.process_new_report' and job.args == (rid,)


def test_redis_being_down_never_blocks_a_report(client, app, who):
    app.config.update(QUEUE_MODE='redis', REDIS_URL='redis://localhost:1/0')  # nothing listens here
    assert submit(client, who('resident')).status_code == 201
    assert client.get('/api/v1/health').json['queue']['error'] == 'Redis is not reachable'