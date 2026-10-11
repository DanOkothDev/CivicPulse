import uuid

import pytest
from flask import jsonify
from werkzeug.security import generate_password_hash

from app import create_app
from app.auth_utils import roles_required
from app.config import Config
from app.extensions import db
from app.models import Report, User

DOMAIN = '@test.civicpulse'
TEST_PASSWORD_HASH = generate_password_hash('password123')


@pytest.fixture(scope='session')
def app(tmp_path_factory):
    upload_folder = tmp_path_factory.mktemp('civicpulse-uploads')
    app = create_app({'UPLOAD_FOLDER': str(upload_folder),
                      'QUEUE_MODE': 'inline'})

    @app.get('/api/v1/_test/verifier-only')
    @roles_required('verifier', 'admin')
    def verifier_only():
        return jsonify(ok=True)

    yield app


@pytest.fixture
def client(app, tmp_path):
    app.config.update(
        UPLOAD_FOLDER=str(tmp_path),
        QUEUE_MODE='inline',
        REDIS_URL=Config.REDIS_URL,
        QUEUE_NAME=Config.QUEUE_NAME,
    )
    with app.test_client() as client:
        yield client

    with app.app_context():  # remove everything the test created
        ids = [u.id for u in User.query.filter(User.email.like('%' + DOMAIN)).all()]
        if ids:
            Report.query.filter(Report.created_by.in_(ids)).delete(synchronize_session=False)
            User.query.filter(User.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()


@pytest.fixture
def make_user(app):
    """Create a user with any role directly in the database; returns (email, password)."""
    def _make(role='resident'):
        email = f'{uuid.uuid4().hex[:10]}{DOMAIN}'
        with app.app_context():
            db.session.add(User(name='Test', email=email, role=role,
                                password_hash=TEST_PASSWORD_HASH))
            db.session.commit()
        return email, 'password123'
    return _make


@pytest.fixture
def token_for(client, make_user):
    def _token(role):
        email, pw = make_user(role)
        return client.post('/api/v1/auth/login', json={'email': email, 'password': pw}).json['token']
    return _token