import pytest

import app as app_module
from app import create_app
from app.config import Config, validate_config


def production_settings(tmp_path):
    return {
        'CIVICPULSE_ENV': 'production',
        'SECRET_KEY': 'unit-test-only-secret-A1b2C3d4E5f6G7h8J9k0',
        'JWT_SECRET_KEY': 'unit-test-only-jwt-Z9y8X7w6V5u4T3s2R1q0',
        'SQLALCHEMY_DATABASE_URI': (
            'postgresql+psycopg2://test-user:test-password@db.example.test:5432/civicpulse_test'
        ),
        'QUEUE_MODE': 'redis',
        'REDIS_URL': 'rediss://test-user:test-password@redis.example.test:6380/0',
        'UPLOAD_FOLDER': str(tmp_path / 'uploads'),
    }


def test_valid_production_configuration_starts_app(tmp_path):
    app = create_app(production_settings(tmp_path))

    assert app.config['CIVICPULSE_ENV'] == 'production'
    assert (tmp_path / 'uploads').is_dir()


@pytest.mark.parametrize('key', ['SECRET_KEY', 'JWT_SECRET_KEY'])
def test_production_rejects_missing_signing_secrets(tmp_path, key):
    settings = production_settings(tmp_path)
    settings[key] = ''

    with pytest.raises(ValueError, match=key):
        create_app(settings)


@pytest.mark.parametrize(
    ('key', 'value'),
    [
        ('SECRET_KEY', 'dev-secret'),
        ('JWT_SECRET_KEY', 'dev-jwt-secret'),
        ('SECRET_KEY', 'change-me'),
        ('JWT_SECRET_KEY', 'change-me-too'),
    ],
)
def test_production_rejects_known_development_secrets(tmp_path, key, value):
    settings = production_settings(tmp_path)
    settings[key] = value

    with pytest.raises(ValueError, match=key) as error:
        create_app(settings)
    assert value not in str(error.value)


@pytest.mark.parametrize('value', ['short', 'A1' * 32, 'abc123'.ljust(32, 'x')])
def test_production_rejects_weak_or_repetitive_secrets(tmp_path, value):
    settings = production_settings(tmp_path)
    settings['SECRET_KEY'] = value

    with pytest.raises(ValueError, match='SECRET_KEY') as error:
        create_app(settings)
    assert value not in str(error.value)


@pytest.mark.parametrize(
    ('key', 'value'),
    [
        ('SQLALCHEMY_DATABASE_URI', ''),
        ('SQLALCHEMY_DATABASE_URI', 'postgresql://user:pass@localhost:5432/civicpulse'),
        ('REDIS_URL', ''),
        ('UPLOAD_FOLDER', ''),
    ],
)
def test_production_rejects_missing_or_local_service_configuration(tmp_path, key, value):
    settings = production_settings(tmp_path)
    settings[key] = value

    with pytest.raises(ValueError, match='Invalid production configuration'):
        create_app(settings)


def test_production_inline_reports_still_require_redis_for_staff_email_queue(tmp_path):
    settings = production_settings(tmp_path)
    settings['QUEUE_MODE'] = 'inline'
    settings['REDIS_URL'] = ''

    with pytest.raises(ValueError, match='REDIS_URL must be a valid Redis connection URL'):
        validate_config(settings)


def test_production_rejects_upload_path_that_is_not_a_directory(tmp_path):
    not_a_directory = tmp_path / 'upload-file'
    not_a_directory.write_text('test', encoding='utf-8')
    settings = production_settings(tmp_path)
    settings['UPLOAD_FOLDER'] = str(not_a_directory)

    with pytest.raises(ValueError, match='UPLOAD_FOLDER must be a writable directory'):
        create_app(settings)


def test_production_rejects_valid_but_unwritable_upload_directory(tmp_path, monkeypatch):
    upload_folder = tmp_path / 'uploads'
    upload_folder.mkdir()
    settings = production_settings(tmp_path)

    def deny_write(*args, **kwargs):
        raise PermissionError('private filesystem detail')

    monkeypatch.setattr(app_module.tempfile, 'mkstemp', deny_write)

    with pytest.raises(ValueError, match='UPLOAD_FOLDER must be a writable directory') as error:
        create_app(settings)

    assert str(upload_folder) not in str(error.value)
    assert 'private filesystem detail' not in str(error.value)


def test_existing_local_development_defaults_remain_accepted():
    settings = {
        'CIVICPULSE_ENV': 'development',
        'SECRET_KEY': 'dev-secret',
        'JWT_SECRET_KEY': 'dev-jwt-secret',
        'SQLALCHEMY_DATABASE_URI': Config.SQLALCHEMY_DATABASE_URI,
        'REDIS_URL': Config.REDIS_URL,
        'QUEUE_MODE': Config.QUEUE_MODE,
        'UPLOAD_FOLDER': Config.UPLOAD_FOLDER,
    }

    validate_config(settings)
