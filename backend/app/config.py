import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
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
    # Which existing reports are handed to find_duplicates as candidates.
    DUPLICATE_CANDIDATE_RADIUS_M = int(os.getenv('DUPLICATE_CANDIDATE_RADIUS_M', '200'))
    DUPLICATE_WINDOW_DAYS = int(os.getenv('DUPLICATE_WINDOW_DAYS', '30'))
    # New reports can create hotspots, so clustering re-runs after new reports, at most this often (0 = never).
    HOTSPOT_REFRESH_MINUTES = int(os.getenv('HOTSPOT_REFRESH_MINUTES', '10'))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')