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


def submit(client, headers):
    data = {'category_id': '1', 'lat': '-1.2921', 'lon': '36.8219', 'photo': (io.BytesIO(JPEG), 'a.jpg')}
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

    def find(report):
        seen['report'] = report
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
    assert seen['report']['id'] == rid and seen['report']['lat'] == pytest.approx(-1.2921)
    assert seen['report']['lon'] == pytest.approx(36.8219) and seen['report']['category_id'] == 1


def test_unusable_classifier_output_is_ignored(client, app, who, monkeypatch):
    resident = who('resident')
    rid = submit(client, resident).json['id']
    for bad in ({'category_id': 999, 'confidence': 0.5}, {'category_id': 1, 'confidence': 5}, 'nonsense', None):
        fake_hooks(monkeypatch, classify=lambda path, bad=bad: bad)
        with app.app_context():
            assert process_new_report(rid)['classifier'].startswith('ignored')
    assert client.get(f'/api/v1/reports/{rid}', headers=resident).json['ai_suggested_category'] is None


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
    import time

    app.config.update(QUEUE_MODE='redis', REDIS_URL='redis://localhost:1/0')

    start = time.perf_counter()
    response = submit(client, who('resident'))
    print(f'\nREPORT SUBMIT: {time.perf_counter() - start:.3f}s')

    start = time.perf_counter()
    health = client.get('/api/v1/health')
    print(f'HEALTH CHECK: {time.perf_counter() - start:.3f}s')

    assert response.status_code == 201
    assert health.json['queue']['error'] == 'Redis is not reachable'
