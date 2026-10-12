"""Background jobs. The worker runs these; each one is safe to run twice."""
import importlib
import logging
import os
import time
from contextlib import contextmanager, nullcontext
from datetime import timedelta

from flask import current_app, has_app_context
from geoalchemy2 import Geography, Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import cast, func
from sqlalchemy.orm import joinedload

from .duplicate_service import OPEN_STATUSES, save_suggestions
from .extensions import db
from .hotspot_service import recompute_hotspots
from .models import Category, Report

logger = logging.getLogger(__name__)
_app = None
_last_hotspot_run = None
LON = func.ST_X(cast(Report.location, Geometry))
LAT = func.ST_Y(cast(Report.location, Geometry))


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
    """Teammate 3's functions, named in settings like AI_CLASSIFIER=ml.classifier.predict:classify.
    Returns None when not configured. A wrong path raises, so the mistake shows up as a failed job."""
    path = current_app.config.get(config_key)
    if not path:
        return None
    module, _, name = path.partition(':')
    return getattr(importlib.import_module(module), name)


def _as_dict(report, lat, lon, distance_m=None):
    data = {'id': report.id, 'lat': lat, 'lon': lon, 'category_id': report.category_id,
            'category': report.category.name, 'created_at': report.created_at.isoformat(),
            'photo_path': os.path.join(current_app.config['UPLOAD_FOLDER'], report.photo_path)}
    if distance_m is not None:
        data['distance_m'] = round(distance_m, 1)
    return data


def _position(report):
    return db.session.query(LAT, LON).filter(Report.id == report.id).one()


def _candidates(report, lat, lon):
    """Older, still-open, not-yet-merged reports near this one: the only ones worth comparing with."""
    config = current_app.config
    point = cast(WKTElement(f'POINT({lon} {lat})', srid=4326), Geography)
    distance = func.ST_Distance(Report.location, point)
    window = timedelta(days=config['DUPLICATE_WINDOW_DAYS'])
    rows = (db.session.query(Report, LAT, LON, distance).options(joinedload(Report.category))
            .filter(Report.id != report.id, Report.duplicate_of.is_(None),
                    Report.status.in_(OPEN_STATUSES),
                    Report.created_at <= report.created_at, Report.created_at >= report.created_at - window,
                    func.ST_DWithin(Report.location, point, config['DUPLICATE_CANDIDATE_RADIUS_M']))
            .order_by(distance).limit(50).all())
    return [_as_dict(r, la, lo, d) for r, la, lo, d in rows]


def _clean_suggestions(report_id, raw):
    """Keep well-formed suggestions only; log and skip the rest (a bad answer must not crash the job)."""
    clean = []
    for item in raw or []:
        try:
            score = float(item['score'])
            entry = {'report_id': int(item['report_id']), 'score': score}
        except (TypeError, KeyError, ValueError):
            logger.warning('Report %s: skipped unusable duplicate suggestion %r', report_id, item)
            continue
        if not 0 <= score <= 1:
            logger.warning('Report %s: skipped suggestion with score out of range: %r', report_id, item)
            continue
        reasons = item.get('reasons')
        if not isinstance(reasons, dict):  # also accept the simple {'reason': ..., 'distance_meters': ...} style
            reasons = {k: item[k] for k in ('reason', 'distance_meters') if k in item}
        entry['reasons'] = reasons
        clean.append(entry)
    return clean


def _normalize(name):
    return ' '.join(str(name).lower().replace('_', ' ').replace('-', ' ').split())


def _category_id(result):
    """Accepts {'category_id': 3} or {'category': 'Water leak'}. Names match the database names
    ignoring capitals, underscores and dashes (so 'water_leak' works). Returns None if unknown."""
    if result.get('category_id') is not None:
        return int(result['category_id'])
    wanted = _normalize(result['category'])
    for category in Category.query.all():
        if _normalize(category.name) == wanted:
            return category.id
    return None


def _apply_classification(report, result):
    """result looks like {'category_id': 3, 'confidence': 0.91} or {'category': 'Drainage', 'confidence': 0.91}.
    Bad output is ignored, not fatal."""
    try:
        category_id, confidence = _category_id(result), float(result['confidence'])
    except (TypeError, KeyError, ValueError, AttributeError):
        logger.warning('Report %s: classifier returned an unusable result: %r', report.id, result)
        return 'ignored: unusable result'
    if category_id is None or not 0 <= confidence <= 1 or db.session.get(Category, category_id) is None:
        logger.warning('Report %s: classifier result out of range: %r', report.id, result)
        return 'ignored: out of range'
    report.ai_category_id, report.ai_confidence = category_id, confidence
    db.session.commit()
    return 'saved'


def _refresh_hotspots_if_due():
    """New reports can create or grow hotspots, so re-cluster, but at most every HOTSPOT_REFRESH_MINUTES:
    clustering compares every pair of reports, so it should not run for each single report.
    A clustering problem is logged and never fails the report's AI job."""
    global _last_hotspot_run
    minutes = current_app.config['HOTSPOT_REFRESH_MINUTES']
    now = time.monotonic()
    if minutes <= 0 or (_last_hotspot_run is not None and now - _last_hotspot_run < minutes * 60):
        return
    _last_hotspot_run = now
    try:
        recompute_hotspots()
    except Exception:
        logger.exception('Hotspot refresh failed')
        db.session.rollback()


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
            lat, lon = _position(report)
            candidates = _candidates(report, lat, lon)
            raw = find_duplicates(_as_dict(report, lat, lon), candidates) if candidates else []
            outcome['duplicates_saved'] = save_suggestions(report.id, _clean_suggestions(report.id, raw))
        _refresh_hotspots_if_due()
        return outcome or {'note': 'no AI functions configured'}