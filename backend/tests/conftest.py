import os
import uuid

import pytest
from flask import jsonify
from geoalchemy2.elements import WKTElement
from sqlalchemy.engine import make_url
from werkzeug.security import generate_password_hash

from app import create_app
from app.auth_utils import roles_required
from app.config import Config
from app.extensions import db
from app.models import Area, Category, County, Department, Report, User

DOMAIN = '@test.civicpulse'


@pytest.fixture
def app(tmp_path):
    test_database = os.environ.get('CIVICPULSE_TEST_DATABASE')
    if not test_database:
        raise RuntimeError(
            'Set CIVICPULSE_TEST_DATABASE to a dedicated disposable test database; '
            'the test fixture recreates its schema.'
        )
    test_database_uri = make_url(
        Config.SQLALCHEMY_DATABASE_URI
    ).set(database=test_database).render_as_string(hide_password=False)

    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': test_database_uri,
        'UPLOAD_FOLDER': str(tmp_path),
        'QUEUE_MODE': 'inline',
        'AI_CLASSIFIER': '',
        'AI_DUPLICATES': '',
        'HOTSPOT_REFRESH_MINUTES': 0
    })
    with app.app_context():
        db.drop_all()
        db.create_all()
        Area.ensure_default()
        Category.ensure_seed()
        County.ensure_seed()
        Department.ensure_seed()
        default_county = County.query.order_by(County.id).first()
        default_county.boundary = WKTElement(
            'MULTIPOLYGON(((9 9, 13 9, 13 13, 9 13, 9 9)), '
            '((36.7 -1.4, 36.9 -1.4, 36.9 -1.2, 36.7 -1.2, 36.7 -1.4)), '
            '((39 39, 42 39, 42 42, 39 42, 39 39)))',
            srid=4326,
        )
        db.session.commit()

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

        Area.query.delete(synchronize_session=False)
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
            default_county_id = None
            county = db.session.query(County).order_by(County.id).first()
            if county is not None and role != 'admin':
                default_county_id = county.id
            department = (
                Department.query.filter_by(county_id=default_county_id)
                .order_by(Department.id)
                .first()
                if role == 'authority' and default_county_id is not None
                else None
            )
            db.session.add(
                User(
                    name='Test',
                    email=email,
                    role=role,
                    county_id=default_county_id,
                    department_id=department.id if department else None,
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