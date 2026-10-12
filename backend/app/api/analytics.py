"""Dashboard numbers for authorities and admins.

Counts describe *cases*: a report merged into another one (duplicate_of is set) is the same
problem, so it is not counted twice. The trends endpoint is the exception: it counts every
report residents submitted per day, duplicates included."""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import and_, func

from ..auth_utils import roles_required
from ..constants import STATUSES
from ..errors import ApiError
from ..extensions import db
from ..models import Area, Category, Hotspot, Report, StatusEvent

bp = Blueprint('analytics', __name__)

FINAL_STATUSES = ('resolved', 'rejected')
staff_only = roles_required('authority', 'admin')


def _case_conditions():
    """Filters for 'one row per real problem', optionally limited to one area (?area_id=)."""
    conditions = [Report.duplicate_of.is_(None)]
    raw = request.args.get('area_id')
    if raw not in (None, ''):
        try:
            conditions.append(Report.area_id == int(raw))
        except ValueError:
            raise ApiError('validation_error', 'area_id must be a number', 422)
    return conditions


def _counts_by_category(conditions):
    counts = dict(db.session.query(Report.category_id, func.count(Report.id))
                  .filter(*conditions).group_by(Report.category_id).all())
    return [(c.id, c.name, counts.get(c.id, 0)) for c in Category.query.order_by(Category.id)]


@bp.get('/analytics/summary')
@staff_only
def summary():
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

    return jsonify({
        'total_reports': total,
        'open_reports': sum(n for status, n in by_status.items() if status not in FINAL_STATUSES),
        'resolved_reports': by_status['resolved'],
        'hotspot_count': Hotspot.query.count(),
        'by_status': by_status,
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
            .filter(Report.created_at >= cutoff)
            .group_by(func.date(Report.created_at)).order_by(func.date(Report.created_at)).all())
    counts = {(day.isoformat() if hasattr(day, 'isoformat') else str(day)): n for day, n in rows}

    daily = []
    for offset in range(days):
        day_string = (start_day + timedelta(days=offset)).isoformat()
        daily.append({'date': day_string, 'count': counts.get(day_string, 0)})
    return jsonify({'days': days, 'daily_reports': daily})