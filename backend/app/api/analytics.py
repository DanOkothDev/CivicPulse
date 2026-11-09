"""Dashboard numbers for authorities and admins.

Counts describe *cases*: a report merged into another one (duplicate_of is set) is the same
problem, so it is not counted twice. The trends endpoint is the exception: it counts every
report residents submitted per day, duplicates included."""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from geoalchemy2 import Geometry
from sqlalchemy import and_, cast, func

from ..auth_utils import current_user, roles_required
from ..constants import DEPARTMENT_CATEGORY_MAP, STATUSES
from ..errors import ApiError
from ..extensions import db
from ..models import Area, Category, County, Hotspot, Report, StatusEvent

bp = Blueprint('analytics', __name__)

FINAL_STATUSES = ('resolved', 'rejected')
staff_only = roles_required('authority', 'admin')


def _staff_report_scope():
    user = current_user()
    conditions = []
    if user.role == 'authority' and user.county_id is None:
        conditions.append(Report.id == -1)
    elif user.role in {'authority', 'admin'} and user.county_id is not None:
        conditions.append(Report.county_id == user.county_id)
    if user.role == 'authority':
        if user.department_id is None:
            conditions.append(Report.id == -1)
        else:
            conditions.append(Report.department_id == user.department_id)
    return conditions


def _case_conditions():
    """Filters for one row per case, optionally limited to an area."""
    conditions = [Report.duplicate_of.is_(None), *_staff_report_scope()]
    raw = request.args.get('area_id')
    if raw not in (None, ''):
        try:
            conditions.append(Report.area_id == int(raw))
        except ValueError:
            raise ApiError('validation_error', 'area_id must be a number', 422)
    return conditions


def _scope_hotspots(query):
    user = current_user()
    if user.role == 'admin' and user.county_id is not None:
        return query.join(
            County, County.id == user.county_id
        ).filter(func.ST_Covers(
            cast(County.boundary, Geometry), cast(Hotspot.center, Geometry)
        ))
    if user.role == 'authority':
        if user.county_id is None or user.department_id is None:
            return query.filter(Hotspot.id == -1)
        department_name = user.department.name if user.department else None
        category_names = [
            category for category, department in DEPARTMENT_CATEGORY_MAP.items()
            if department == department_name
        ]
        category_ids = Category.query.filter(Category.name.in_(category_names)).with_entities(
            Category.id
        )
        return query.join(
            County, County.id == user.county_id
        ).filter(
            func.ST_Covers(cast(County.boundary, Geometry), cast(Hotspot.center, Geometry)),
            Hotspot.top_category_id.in_(category_ids),
        )
    return query


def _area_id():
    raw = request.args.get('area_id')
    if raw in (None, ''):
        return None
    try:
        return int(raw)
    except ValueError:
        raise ApiError('validation_error', 'area_id must be a number', 422)


def _counts_by_category(conditions):
    counts = dict(db.session.query(Report.category_id, func.count(Report.id))
                  .filter(*conditions).group_by(Report.category_id).all())
    return [(c.id, c.name, counts.get(c.id, 0)) for c in Category.query.order_by(Category.id)]


@bp.get('/analytics/summary')
@staff_only
def summary():
    area_id = _area_id()
    conditions = _case_conditions()
    total = db.session.query(func.count(Report.id)).filter(*conditions).scalar() or 0
    counts = dict(db.session.query(Report.status, func.count(Report.id))
                  .filter(*conditions).group_by(Report.status).all())
    by_status = {status: counts.get(status, 0) for status in STATUSES}  # every status, even with 0

    open_rows = (db.session.query(Report.area_id, Area.name, func.count(Report.id))
                 .outerjoin(Area, Area.id == Report.area_id)
                 .filter(*conditions, Report.status.notin_(FINAL_STATUSES))
                 .group_by(Report.area_id, Area.name)
                 .order_by(func.count(Report.id).desc(), Report.area_id).all())

    # Days from submission to the 'resolved' status event, averaged over resolved cases.
    avg_seconds = (db.session.query(func.avg(func.extract('epoch', StatusEvent.created_at - Report.created_at)))
                   .select_from(Report)
                   .join(StatusEvent, and_(StatusEvent.report_id == Report.id, StatusEvent.status == 'resolved'))
                   .filter(*conditions, Report.status == 'resolved').scalar())

    hotspot_query = _scope_hotspots(Hotspot.query)
    if area_id is not None:
        hotspot_query = hotspot_query.join(Area, Area.id == area_id).filter(
            Area.boundary.isnot(None),
            func.ST_Covers(cast(Area.boundary, Geometry), cast(Hotspot.center, Geometry)),
        )

    county_rows = []
    counties = County.query.order_by(County.name)
    user = current_user()
    if user.role == 'authority' and (
        user.county_id is None or user.department_id is None
    ):
        counties = counties.filter(County.id == -1)
    if user.role in {'authority', 'admin'} and user.county_id is not None:
        counties = counties.filter(County.id == user.county_id)
    for county in counties.all():
        county_q = Report.query.filter(Report.duplicate_of.is_(None), Report.county_id == county.id)
        if user.role == 'authority':
            county_q = county_q.filter(Report.department_id == user.department_id) if user.department_id else county_q.filter(Report.id == -1)
        county_total = county_q.count()
        county_resolved = county_q.filter(Report.status == 'resolved').count()
        county_pending = county_q.filter(Report.status.in_(['reported', 'assigned', 'in_progress', 'verified'])).count()
        county_rows.append({
            'county_id': county.id,
            'county_name': county.name,
            'total_reports': county_total,
            'resolved_reports': county_resolved,
            'pending_reports': county_pending,
            'resolution_rate': round((county_resolved / county_total) * 100, 2) if county_total else 0,
        })

    return jsonify({
        'total_reports': total,
        'open_reports': sum(n for status, n in by_status.items() if status not in FINAL_STATUSES),
        'resolved_reports': by_status['resolved'],
        'hotspot_count': hotspot_query.count(),
        'county_count': counties.count(),
        'by_status': by_status,
        'by_county': sorted(
            county_rows,
            key=lambda item: (-item['total_reports'], -item['resolved_reports'], -item['pending_reports'], item['county_name'])
        ),
        'by_category': {name: n for _, name, n in _counts_by_category(conditions)},
        'open_by_area': [{'area_id': area_id, 'area': name or 'No area', 'open': n}
                         for area_id, name, n in open_rows],
        'avg_days_to_resolve': round(float(avg_seconds) / 86400, 1) if avg_seconds is not None else None,
    })


@bp.get('/analytics/categories')
@staff_only
def category_analytics():
    return jsonify([{'category_id': cid, 'category': name, 'count': n}
                    for cid, name, n in _counts_by_category(_case_conditions())])


@bp.get('/analytics/statuses')
@staff_only
def status_analytics():
    rows = (db.session.query(Report.status, func.count(Report.id))
            .filter(*_case_conditions()).group_by(Report.status).order_by(Report.status).all())
    return jsonify([{'status': status, 'count': n} for status, n in rows])


@bp.get('/analytics/trends')
@staff_only
def report_trends():
    try:
        days = int(request.args.get('days', 30))
    except (TypeError, ValueError):
        raise ApiError('invalid_days', 'days must be an integer between 1 and 365', 400)
    if not 1 <= days <= 365:
        raise ApiError('invalid_days', 'days must be between 1 and 365', 400)

    today = datetime.now(timezone.utc).date()
    start_day = today - timedelta(days=days - 1)
    cutoff = datetime.combine(start_day, datetime.min.time(), tzinfo=timezone.utc)

    rows = (db.session.query(func.date(Report.created_at).label('day'), func.count(Report.id))
            .filter(Report.created_at >= cutoff, *_staff_report_scope())
            .group_by(func.date(Report.created_at)).order_by(func.date(Report.created_at)).all())
    counts = {(day.isoformat() if hasattr(day, 'isoformat') else str(day)): n for day, n in rows}

    daily = []
    for offset in range(days):
        day_string = (start_day + timedelta(days=offset)).isoformat()
        daily.append({'date': day_string, 'count': counts.get(day_string, 0)})
    return jsonify({'days': days, 'daily_reports': daily})