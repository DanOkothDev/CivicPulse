import os
from datetime import timedelta
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

load_dotenv()


_KNOWN_DEVELOPMENT_SECRETS = {
    'dev-secret',
    'dev-jwt-secret',
    'change-me',
    'change-me-too',
    'changeme',
    'secret',
    'secret-key',
    'your-secret-key',
    'your-secret-here',
    'replace-me',
    'placeholder',
}
_LOCAL_HOSTS = {'localhost', '127.0.0.1', '::1'}


def _is_strong_production_secret(value):
    if not isinstance(value, str) or len(value) < 32 or value != value.strip():
        return False

    normalized = value.casefold()
    if normalized in _KNOWN_DEVELOPMENT_SECRETS or any(
        normalized.startswith(f'{placeholder}-')
        for placeholder in ('dev-secret', 'dev-jwt-secret', 'change-me', 'changeme', 'your-secret')
    ):
        return False

    # This is a guardrail against weak placeholders, not an entropy estimator.
    if len(set(value)) < 12:
        return False
    for period in range(1, len(value) // 2 + 1):
        if len(value) % period == 0 and value == value[:period] * (len(value) // period):
            return False
    return True


def validate_config(config):
    """Fail early on unsafe or unusable production configuration.

    Local development deliberately retains its existing defaults. Connection
    URLs are validated syntactically; service availability is left to normal
    health checks so transient outages do not prevent a container restart.
    """
    environment = str(config.get('CIVICPULSE_ENV', 'development')).strip().lower()
    if environment not in {'development', 'test', 'production'}:
        raise ValueError('CIVICPULSE_ENV must be development, test, or production.')
    if environment != 'production':
        return

    errors = []
    secret_key = config.get('SECRET_KEY')
    jwt_secret_key = config.get('JWT_SECRET_KEY')
    if not _is_strong_production_secret(secret_key):
        errors.append('SECRET_KEY must be a strong secret with at least 32 characters.')
    if not _is_strong_production_secret(jwt_secret_key):
        errors.append('JWT_SECRET_KEY must be a strong secret with at least 32 characters.')
    if isinstance(secret_key, str) and isinstance(jwt_secret_key, str) and secret_key == jwt_secret_key:
        errors.append('SECRET_KEY and JWT_SECRET_KEY must be different.')

    database_url = config.get('SQLALCHEMY_DATABASE_URI')
    try:
        parsed_database_url = make_url(database_url)
        if (parsed_database_url.get_backend_name() != 'postgresql'
                or not parsed_database_url.host
                or not parsed_database_url.database
                or parsed_database_url.host.casefold() in _LOCAL_HOSTS):
            errors.append('DATABASE_URL must identify a non-local PostgreSQL database.')
    except (ArgumentError, TypeError, ValueError):
        errors.append('DATABASE_URL must be a valid PostgreSQL connection URL.')

    queue_mode = str(config.get('QUEUE_MODE', '')).strip().lower()
    if queue_mode not in {'redis', 'inline'}:
        errors.append('QUEUE_MODE must be redis or inline.')
    # Staff onboarding always uses RQ, including when report jobs run inline.
    redis_url = config.get('REDIS_URL')
    try:
        parsed_redis_url = make_url(redis_url)
        if (parsed_redis_url.drivername.split('+', 1)[0] not in {'redis', 'rediss'}
                or not parsed_redis_url.host
                or parsed_redis_url.host.casefold() in _LOCAL_HOSTS):
            errors.append('REDIS_URL must identify a non-local Redis service for staff onboarding.')
    except (ArgumentError, TypeError, ValueError):
        errors.append('REDIS_URL must be a valid Redis connection URL for staff onboarding.')

    upload_folder = config.get('UPLOAD_FOLDER')
    if not isinstance(upload_folder, (str, os.PathLike)) or not os.fspath(upload_folder).strip():
        errors.append('UPLOAD_FOLDER must be configured.')

    if errors:
        raise ValueError('Invalid production configuration: ' + ' '.join(errors))


class Config:
    CIVICPULSE_ENV = os.getenv('CIVICPULSE_ENV', 'development')
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret')
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql+psycopg2://civicpulse:civicpulse@localhost:5432/civicpulse')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB photo limit, matches the API contract
    # 'redis': a separate worker runs background jobs. 'inline': jobs run inside the request (no worker needed).
    QUEUE_MODE = os.getenv('QUEUE_MODE', 'redis')
    QUEUE_NAME = os.getenv('QUEUE_NAME', 'default')
    # Teammate 3's functions as 'module:function', e.g. ml.classifier:classify. Empty means skipped.
    AI_CLASSIFIER = os.getenv('AI_CLASSIFIER', '')
    AI_DUPLICATES = os.getenv('AI_DUPLICATES', '')
    CIVICAI_API_KEY = os.getenv('CIVICAI_API_KEY', '')
    CIVICAI_MODEL = os.getenv('CIVICAI_MODEL', 'gpt-4.1-mini')
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    # This default is verified against Groq Responses API and function calling.
    # CivicAI validates overrides against its provider capability allowlist.
    GROQ_MODEL = os.getenv('GROQ_MODEL', 'openai/gpt-oss-20b')
    ML_DIR = os.getenv('ML_DIR')
    # Which existing reports are handed to find_duplicates as candidates.
    DUPLICATE_CANDIDATE_RADIUS_M = int(os.getenv('DUPLICATE_CANDIDATE_RADIUS_M', '200'))
    DUPLICATE_WINDOW_DAYS = int(os.getenv('DUPLICATE_WINDOW_DAYS', '30'))
    # New reports can create hotspots, so clustering re-runs after new reports, at most this often (0 = never).
    HOTSPOT_REFRESH_MINUTES = int(os.getenv('HOTSPOT_REFRESH_MINUTES', '10'))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    SMTP_HOST = os.getenv('SMTP_HOST', '')
    # Keep raw input here so malformed SMTP settings fail the delivery job,
    # rather than preventing the API or worker from starting.
    SMTP_PORT = os.getenv('SMTP_PORT', '587')
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', '')
    SMTP_USE_SSL = os.getenv('SMTP_USE_SSL', 'false').lower() in {'1', 'true', 'yes'}
