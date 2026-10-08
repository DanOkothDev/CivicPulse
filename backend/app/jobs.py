"""Background jobs. The worker runs these; each one is safe to run twice."""
import importlib
import logging
import os
from contextlib import contextmanager, nullcontext

from flask import current_app, has_app_context
from geoalchemy2 import Geometry
from sqlalchemy import cast, func

from .duplicate_service import save_suggestions
from .extensions import db
from .models import Category, Report

logger = logging.getLogger(__name__)
_app = None


@contextmanager
def app_context():
    """Jobs need the app (database, settings). Inside a request (inline mode) reuse it;
    in a worker process, build it once and reuse it for every job."""
    global _app
    if has_app_context():
        context = nullcontext()
    else:
        if _app is None:
            from . import create_app
            _app = create_app()
        context = _app.app_context()
    with context:
        try:
            yield
        except Exception:
            db.session.rollback()  # never leave a half-finished transaction behind
            raise


def load_hook(config_key):
    """Teammate 3's functions, named in settings like AI_CLASSIFIER=ml.classifier:classify.
    Returns None when not configured. A wrong path raises, so the mistake shows up as a failed job."""
    path = current_app.config.get(config_key)
    if not path:
        return None
    module, _, name = path.partition(':')
    return getattr(importlib.import_module(module), name)


def _report_dict(report):
    lat, lon = db.session.query(func.ST_Y(cast(Report.location, Geometry)),
                                func.ST_X(cast(Report.location, Geometry))).filter(Report.id == report.id).one()
    return {'id': report.id, 'lat': lat, 'lon': lon, 'category_id': report.category_id,
            'created_at': report.created_at.isoformat(),
            'photo_path': os.path.join(current_app.config['UPLOAD_FOLDER'], report.photo_path)}


def _apply_classification(report, result):
    """result should look like {'category_id': 3, 'confidence': 0.91}. Bad output is ignored, not fatal."""
    try:
        category_id, confidence = int(result['category_id']), float(result['confidence'])
    except (TypeError, KeyError, ValueError):
        logger.warning('Report %s: classifier returned an unusable result: %r', report.id, result)
        return 'ignored: unusable result'
    if not 0 <= confidence <= 1 or db.session.get(Category, category_id) is None:
        logger.warning('Report %s: classifier result out of range: %r', report.id, result)
        return 'ignored: out of range'
    report.ai_category_id, report.ai_confidence = category_id, confidence
    db.session.commit()
    return 'saved'


def process_new_report(report_id):
    """Runs after a report is submitted: ask the AI for a category and for duplicate candidates,
    and store the answers for the verifier."""
    with app_context():
        report = db.session.get(Report, report_id)
        if report is None:
            logger.warning('process_new_report: report %s no longer exists', report_id)
            return {'skipped': 'report not found'}
        outcome = {}
        classify = load_hook('AI_CLASSIFIER')
        if classify:
            photo = os.path.join(current_app.config['UPLOAD_FOLDER'], report.photo_path)
            outcome['classifier'] = _apply_classification(report, classify(photo))
        find_duplicates = load_hook('AI_DUPLICATES')
        if find_duplicates:
            outcome['duplicates_saved'] = save_suggestions(report.id, find_duplicates(_report_dict(report)))
        return outcome or {'note': 'no AI functions configured'}
