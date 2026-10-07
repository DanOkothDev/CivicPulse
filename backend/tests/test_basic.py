# Needs the database from docker compose running and `flask init-db` + `flask seed` done.
from app import create_app


def test_health_and_categories():
    c = create_app().test_client()
    assert c.get('/api/v1/health').json['status'] == 'ok'
    assert len(c.get('/api/v1/categories').json) >= 6


def test_errors_use_contract_format():
    err = create_app().test_client().get('/api/v1/nope').json['error']
    assert err['code'] == 'not_found'
