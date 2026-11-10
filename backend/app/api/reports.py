import math
import uuid

from flask import Blueprint, current_app, jsonify, request, url_for
from geoalchemy2 import Geography, Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import and_, cast, func, or_
from sqlalchemy.orm import joinedload

from ..auth_utils import current_user, login_required, user_can_access_report
from ..constants import DEPARTMENT_CATEGORY_MAP, STATUSES
from ..errors import ApiError
from ..extensions import db
from ..jobqueue import enqueue
from ..jobs import process_new_report
from ..models import Area, Category, ClassificationFeedback, County, Department, Follow, Report, StatusEvent
from ..storage import delete_photo, photo_extension, save_photo

bp = Blueprint('reports', __name__)

# Read longitude/latitude back out of the Geography column.
LON = func.ST_X(cast(Report.location, Geometry)).label('lon')
LAT = func.ST_Y(cast(Report.location, Geometry)).label('lat')


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _float(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _flag(name):
    return (request.args.get(name) or '').lower() in ('1', 'true', 'yes')


def _report_json(r, lon, lat, following):
    return {
        'id': r.id,
        'category': {'id': r.category.id, 'name': r.category.name, 'icon': r.category.icon},
        'description': r.description,
        'address': r.address,
        'landmark': r.landmark,
        'status': r.status,
        'location': {'lat': lat, 'lon': lon},
        'area_id': r.area_id,
        'county_id': r.county_id,
        'county': (
            {'id': r.county.id, 'name': r.county.name, 'code': r.county.code}
            if r.county else None
        ),
        'department_id': r.department_id,
        'department': (
            {'id': r.department.id, 'county_id': r.department.county_id,
             'name': r.department.name, 'code': r.department.code}
            if r.department else None
        ),
        'photo_url': url_for('media.uploaded_file', filename=r.photo_path, _external=True),
        'created_by': r.created_by,
        'assigned_to': r.assigned_to,
        'due_date': r.due_date.isoformat() if r.due_date else None,
        'report_count': r.report_count,
        'duplicate_of': r.duplicate_of,
        'ai_suggested_category': (
            {'category_id': r.ai_category_id, 'name': r.ai_category.name,
             'confidence': r.ai_confidence} if r.ai_category_id else None),
        'classification_feedback': _feedback_json(r.classification_feedback),
        'is_following': following,
        'created_at': r.created_at.isoformat(),
        'updated_at': r.updated_at.isoformat(),
    }


def _feedback_json(feedback):
    if feedback is None:
        return None
    predicted = feedback.predicted_category
    selected = feedback.selected_category
    return {
        'id': feedback.id,
        'predicted_category': (
            {'id': predicted.id, 'name': predicted.name} if predicted else None),
        'confidence': feedback.confidence,
        'selected_category': {'id': selected.id, 'name': selected.name},
        'accepted': feedback.accepted,
        'review_status': feedback.review_status,
        'training_eligible': feedback.training_eligible,
        'created_at': feedback.created_at.isoformat(),
    }


def _query():
    return Report.query.options(
        joinedload(Report.category),
        joinedload(Report.ai_category),
        joinedload(Report.classification_feedback).joinedload(
            ClassificationFeedback.selected_category),
        joinedload(Report.classification_feedback).joinedload(
            ClassificationFeedback.predicted_category),
    ).add_columns(LON, LAT)


def _followed(user_id, report_ids):
    rows = db.session.query(Follow.report_id).filter(
        Follow.user_id == user_id, Follow.report_id.in_(report_ids)).all()
    return {row[0] for row in rows}


def _one(report_id, user_id):
    row = _query().filter(Report.id == report_id).first()
    if row is None:
        raise ApiError('not_found', 'Report not found', 404)
    report, lon, lat = row
    return _report_json(report, lon, lat, report.id in _followed(user_id, [report.id]))


@bp.post('/reports')
@login_required
def create_report():
    form = request.form
    errors = {}

    category_id = _int(form.get('category_id'))
    if category_id is None or not db.session.get(Category, category_id):
        errors['category_id'] = 'Choose a valid category'
    lat, lon = _float(form.get('lat')), _float(form.get('lon'))
    if lat is None or not -90 <= lat <= 90:
        errors['lat'] = 'Latitude must be a number from -90 to 90'
    if lon is None or not -180 <= lon <= 180:
        errors['lon'] = 'Longitude must be a number from -180 to 180'
    description = (form.get('description') or '').strip()
    if len(description) > 500:
        errors['description'] = 'Keep it under 500 characters'
    address = (form.get('address') or '').strip() or None
    if address and len(address) > 255:
        errors['address'] = 'Keep it under 255 characters'
    landmark = (form.get('landmark') or '').strip() or None
    if landmark and len(landmark) > 120:
        errors['landmark'] = 'Keep it under 120 characters'
    photo, ext = request.files.get('photo'), None
    if photo is None or not photo.filename:
        errors['photo'] = 'A photo is required'
    else:
        ext = photo_extension(photo)
        if ext is None:
            errors['photo'] = 'Upload a JPEG or PNG image'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)

    user = current_user()
    idempotency_key = request.headers.get('Idempotency-Key')
    if idempotency_key:
        try:
            idempotency_key = str(uuid.UUID(idempotency_key))
        except (ValueError, AttributeError):
            raise ApiError('validation_error', 'Idempotency-Key must be a UUID.', 422)
        existing = Report.query.filter_by(
            created_by=user.id, civicai_request_id=idempotency_key
        ).first()
        if existing:
            return jsonify(_one(existing.id, user.id)), 200
    point = WKTElement(f'POINT({lon} {lat})', srid=4326)  # longitude first
    # If areas have boundaries drawn, assign the report to the most specific area that contains it.
    # Ordering by area size keeps multiple overlapping boundaries deterministic while still honoring
    # the actual geography of the report rather than the resident's home area.
    point_geom = cast(point, Geometry)
    area = (
        Area.query.filter(Area.boundary.isnot(None))
        .filter(func.ST_Covers(cast(Area.boundary, Geometry), point_geom))
        .order_by(func.ST_Area(cast(Area.boundary, Geometry)).asc())
        .first()
    )
    county = County.resolve_for_point(lat, lon)
    if county is None:
        raise ApiError(
            'unresolved_location',
            'The report location could not be resolved to a county boundary. Please move the marker to a point within a Kenyan county.',
            422,
        )

    category = db.session.get(Category, category_id)
    department_name = DEPARTMENT_CATEGORY_MAP.get(category.name) if category else None

    department = None
    if county is not None and department_name:
        department = Department.query.filter_by(county_id=county.id, name=department_name).first()

    photo_path = save_photo(photo, ext)
    try:
        report = Report(category_id=category_id, description=description or None,
                        address=address, landmark=landmark, location=point,
                        area_id=area.id if area else None, county_id=county.id if county else None,
                        department_id=department.id if department else None,
                        photo_path=photo_path, created_by=user.id,
                        civicai_request_id=idempotency_key)
        db.session.add(report)
        db.session.flush()
        db.session.add(StatusEvent(report_id=report.id, status='reported', changed_by=user.id))
        db.session.commit()
        if idempotency_key:
            current_app.logger.info('CivicAI report submitted user_id=%s report_id=%s', user.id, report.id)
    except Exception:
        db.session.rollback()
        delete_photo(photo_path)  # don't leave an orphan photo behind
        if idempotency_key:
            existing = Report.query.filter_by(
                created_by=user.id, civicai_request_id=idempotency_key
            ).first()
            if existing:
                return jsonify(_one(existing.id, user.id)), 200
        raise
    try:  # AI checks run in the background. A queue problem must never stop a resident's report.
        enqueue(process_new_report, report.id)
    except Exception:
        if current_app.config['QUEUE_MODE'] == 'inline':
            current_app.logger.exception('Inline processing failed for report %s; requeue it with process-reports %s',
                                         report.id, report.id)
        else:
            current_app.logger.exception('Could not queue processing for report %s', report.id)
            try:
                current_app.logger.warning('Running report processing inline after queue failure: %s', report.id)
                process_new_report(report.id)
            except Exception:
                current_app.logger.exception(
                    'Inline processing failed for report %s; requeue it with process-reports %s',
                    report.id, report.id,
                )
    return jsonify(_one(report.id, user.id)), 201


@bp.get('/reports')
@login_required
def list_reports():
    user = current_user()
    args = request.args
    q = Report.query

    if args.get('bbox'):
        parts = [_float(p) for p in args['bbox'].split(',')]
        if len(parts) != 4 or None in parts or parts[0] >= parts[2] or parts[1] >= parts[3]:
            raise ApiError('validation_error', 'bbox must be min_lon,min_lat,max_lon,max_lat', 422)
        envelope = func.ST_MakeEnvelope(*parts, 4326)
        q = q.filter(func.ST_Intersects(Report.location, cast(envelope, Geography)))
    for name, column in (('category_id', Report.category_id), ('area_id', Report.area_id), ('county_id', Report.county_id), ('department_id', Report.department_id)):
        if args.get(name):
            value = _int(args[name])
            if value is None:
                raise ApiError('validation_error', f'{name} must be a number', 422)
            q = q.filter(column == value)
    if user.role in {'verifier', 'authority'} or (
        user.role == 'admin' and user.county_id is not None
    ):
        if user.county_id is None:
            q = q.filter(Report.id == -1)
        else:
            q = q.filter(Report.county_id == user.county_id)
        if user.role == 'authority':
            if user.department_id is None:
                q = q.filter(Report.id == -1)
            else:
                q = q.filter(Report.department_id == user.department_id)
    if args.get('status'):
        if args['status'] not in STATUSES:
            raise ApiError('validation_error', 'Unknown status', 422, {'allowed': list(STATUSES)})
        q = q.filter(Report.status == args['status'])
    search = (args.get('search') or '').strip()
    if search:
        pattern = f'%{search}%'
        filters = [
            Report.description.ilike(pattern),
            Report.address.ilike(pattern),
            Report.landmark.ilike(pattern),
            Report.category.has(Category.name.ilike(pattern)),
        ]
        if search.isdecimal():
            filters.append(Report.id == int(search))
        q = q.filter(or_(*filters))
    if _flag('mine'):
        q = q.filter(Report.created_by == user.id)
    if _flag('following'):
        q = q.join(Follow, and_(Follow.report_id == Report.id, Follow.user_id == user.id))
    if not _flag('include_duplicates'):
        q = q.filter(Report.duplicate_of.is_(None))  # duplicates are counted in their parent

    page, per_page = _int(args.get('page', 1)), _int(args.get('per_page', 50))
    if page is None or per_page is None:
        raise ApiError('validation_error', 'page and per_page must be numbers', 422)
    page, per_page = max(page, 1), min(max(per_page, 1), 200)

    total = q.count()
    rows = (q.options(
                joinedload(Report.category),
                joinedload(Report.ai_category),
                joinedload(Report.classification_feedback).joinedload(
                    ClassificationFeedback.selected_category),
                joinedload(Report.classification_feedback).joinedload(
                    ClassificationFeedback.predicted_category),
            ).add_columns(LON, LAT)
            .order_by(Report.created_at.desc(), Report.id.desc())
            .offset((page - 1) * per_page).limit(per_page).all())
    followed = _followed(user.id, [r.id for r, _, _ in rows])
    items = [_report_json(r, lon, lat, r.id in followed) for r, lon, lat in rows]
    return jsonify(items=items, page=page, per_page=per_page, total=total)


@bp.get('/reports/<int:report_id>')
@login_required
def get_report(report_id):
    user = current_user()
    report = db.session.get(Report, report_id)
    if report is None:
        raise ApiError('not_found', 'Report not found', 404)
    if not user_can_access_report(user, report):
        raise ApiError('forbidden', 'You cannot access that report', 403)
    return jsonify(_one(report_id, user.id))


@bp.post('/reports/<int:report_id>/follow')
@login_required
def follow(report_id):
    user = current_user()
    if db.session.get(Report, report_id) is None:
        raise ApiError('not_found', 'Report not found', 404)
    if db.session.get(Follow, (user.id, report_id)) is None:
        db.session.add(Follow(user_id=user.id, report_id=report_id))
        db.session.commit()
    return '', 204


@bp.delete('/reports/<int:report_id>/follow')
@login_required
def unfollow(report_id):
    existing = db.session.get(Follow, (current_user().id, report_id))
    if existing:
        db.session.delete(existing)
        db.session.commit()
    return '', 204
