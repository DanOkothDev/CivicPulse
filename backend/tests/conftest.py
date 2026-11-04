import uuid

import pytest
from flask import jsonify
from sqlalchemy.engine import make_url
from werkzeug.security import generate_password_hash

from app import create_app
from app.auth_utils import roles_required
from app.config import Config
from app.extensions import db
from app.models import Report, User

DOMAIN = '@test.civicpulse'


@pytest.fixture
def app(tmp_path):
    test_database_uri = make_url(
        Config.SQLALCHEMY_DATABASE_URI
    ).set(database='civicpulse_test').render_as_string(hide_password=False)

    app = create_app({
        'SQLALCHEMY_DATABASE_URI': test_database_uri,
        'UPLOAD_FOLDER': str(tmp_path),
        'QUEUE_MODE': 'inline',
        'AI_CLASSIFIER': '',
        'AI_DUPLICATES': '',
        'HOTSPOT_REFRESH_MINUTES': 0
    })

    @app.get('/api/v1/_test/verifier-only')
    @roles_required('verifier', 'admin')
    def verifier_only():
        return jsonify(ok=True)

    yield app

    with app.app_context():
        ids = [
            u.id
            for u in User.query.filter(
                User.email.like('%' + DOMAIN)
            ).all()
        ]

        if ids:
            Report.query.filter(
                Report.created_by.in_(ids)
            ).delete(synchronize_session=False)

            User.query.filter(
                User.id.in_(ids)
            ).delete(synchronize_session=False)

        db.session.commit()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(app):
    """Create a user with any role directly in the database; returns (email, password)."""

    def _make(role='resident'):
        email = f'{uuid.uuid4().hex[:10]}{DOMAIN}'

        with app.app_context():
            db.session.add(
                User(
                    name='Test',
                    email=email,
                    role=role,
                    password_hash=generate_password_hash('password123')
                )
            )
            db.session.commit()

        return email, 'password123'

    return _make


@pytest.fixture
def token_for(client, make_user):
    def _token(role):
        email, pw = make_user(role)

        return client.post(
            '/api/v1/auth/login',
            json={'email': email, 'password': pw}
        ).json['token']

    return _token