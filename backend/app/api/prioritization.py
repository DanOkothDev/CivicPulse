from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import case, cast, func, Integer
from sqlalchemy.orm import joinedload

from ..auth_utils import current_user, roles_required
from ..errors import ApiError
from ..models import ClassificationFeedback, Report
from ..prioritization_service import score_report
from .reports import LAT, LON, _followed, _report_json

bp = Blueprint('prioritization', __name__)
OPEN_STATUSES = ('reported', 'verified', 'assigned', 'in_progress')
VALID_LEVELS = ('High', 'Medium', 'Low')


def _score_expression(now):
    seconds = func.extract('epoch', now - Report.created_at)
    age_days = func.greatest(seconds / 86400.0, 0.0)
    age = func.least(age_days / 30.0, 1.0) * 60.0
    frequency = func.least(func.greatest(Report.report_count - 1, 0) / 4.0, 1.0) * 40.0
    return cast(func.round(age + frequency), Integer)


def _level_expression(score):
    return case((score >= 70, 'High'), (score >= 35, 'Medium'), else_='Low')


@bp.get('/prioritization/reports')
@roles_required('admin')
def prioritized_reports():
    user = current_user()
    if user.county_id is None:
        raise ApiError('forbidden', 'County administrators only', 403)

    page_raw, per_page_raw = request.args.get('page', '1'), request.args.get('per_page', '20')
    try:
        page, per_page = int(page_raw), int(per_page_raw)
    except (TypeError, ValueError):
        raise ApiError('validation_error', 'page and per_page must be numbers', 422)
    if page < 1 or per_page < 1:
        raise ApiError('validation_error', 'page and per_page must be positive', 422)
    per_page = min(per_page, 100)

    level = request.args.get('level')
    if level and level not in VALID_LEVELS:
        raise ApiError('validation_error', 'Unknown priority level', 422,
                       {'allowed': list(VALID_LEVELS)})
    status = request.args.get('status')
    if status and status not in OPEN_STATUSES:
        raise ApiError('validation_error', 'Unknown open report status', 422,
                       {'allowed': list(OPEN_STATUSES)})

    now = datetime.now(timezone.utc)
    score_expr = _score_expression(now)
    level_expr = _level_expression(score_expr)
    base = Report.query.filter(
        Report.county_id == user.county_id,
        Report.status.in_(OPEN_STATUSES),
        Report.duplicate_of.is_(None),
    )
    if status:
        base = base.filter(Report.status == status)

    summary_rows = (base.with_entities(level_expr.label('level'), func.count(Report.id))
                    .group_by(level_expr).all())
    summary = {name: 0 for name in VALID_LEVELS}
    for name, count in summary_rows:
        summary[name] = count

    filtered = base
    if level:
        filtered = filtered.filter(level_expr == level)
    total = filtered.count()
    rows = (filtered.options(
        joinedload(Report.category), joinedload(Report.county), joinedload(Report.department),
        joinedload(Report.ai_category),
        joinedload(Report.classification_feedback).joinedload(ClassificationFeedback.selected_category),
        joinedload(Report.classification_feedback).joinedload(ClassificationFeedback.predicted_category),
    ).add_columns(LON, LAT)
        .order_by(score_expr.desc(), Report.created_at.asc(), Report.id.asc())
        .offset((page - 1) * per_page).limit(per_page).all())
    followed = _followed(user.id, [report.id for report, _, _ in rows])
    items = []
    for report, lon, lat in rows:
        item = _report_json(report, lon, lat, report.id in followed)
        item['recommendation'] = score_report(report.created_at, report.report_count, now)
        items.append(item)

    return jsonify(items=items, page=page, per_page=per_page, total=total,
                   pages=(total + per_page - 1) // per_page, summary=summary)
