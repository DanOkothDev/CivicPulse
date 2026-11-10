from datetime import date, datetime, timedelta, timezone
from statistics import median

from flask import Blueprint, jsonify
from sqlalchemy import and_, case, func
from sqlalchemy.exc import IntegrityError

from ..auth_utils import current_user, roles_required
from ..errors import ApiError
from ..extensions import db
from ..models import Category, County, QuarterlyAnalyticsBatch, QuarterlyAnalyticsDigest, Report, StatusEvent, User

bp = Blueprint('quarterly_analytics', __name__)


def previous_quarter(today=None):
    today = today or datetime.now(timezone.utc).date()
    current_start = date(today.year, ((today.month - 1) // 3) * 3 + 1, 1)
    previous_end = current_start
    previous_day = date.fromordinal(previous_end.toordinal() - 1)
    previous_start = date(previous_day.year, ((previous_day.month - 1) // 3) * 3 + 1, 1)
    return previous_start, previous_end


def _quarter_metrics(start, end, county_id=None):
    filters = [Report.duplicate_of.is_(None), Report.created_at >= start,
               Report.created_at < end]
    if county_id is not None:
        filters.append(Report.county_id == county_id)
    base = Report.query.filter(*filters)
    total = base.count()
    statuses = dict(db.session.query(Report.status, func.count(Report.id))
                    .filter(*filters).group_by(Report.status).all())
    resolved = base.filter(Report.status == 'resolved').count()
    rejected = statuses.get('rejected', 0)
    avg_seconds = (db.session.query(func.avg(func.extract(
        'epoch', StatusEvent.created_at - Report.created_at)))
        .select_from(Report)
        .join(StatusEvent, and_(StatusEvent.report_id == Report.id,
                                StatusEvent.status == 'resolved'))
        .filter(*filters, Report.status == 'resolved').scalar())
    categories = (db.session.query(Category.name, func.count(Report.id))
                  .join(Report, Report.category_id == Category.id)
                  .filter(*filters).group_by(Category.name)
                  .order_by(func.count(Report.id).desc(), Category.name).all())
    monthly = (db.session.query(func.date_trunc('month', Report.created_at), func.count(Report.id))
               .filter(*filters).group_by(func.date_trunc('month', Report.created_at))
               .order_by(func.date_trunc('month', Report.created_at)).all())
    return {
        'total_reports': total,
        'resolved_reports': resolved,
        'open_reports': sum(count for status, count in statuses.items()
                             if status not in ('resolved', 'rejected')),
        'rejected_reports': rejected,
        'resolution_rate': round((resolved / total) * 100, 1) if total else 0,
        'avg_days_to_resolve': round(float(avg_seconds) / 86400, 1) if avg_seconds is not None else None,
        'by_status': statuses,
        'by_category': [{'category': name, 'count': count} for name, count in categories],
        'monthly_reports': [{'month': month.date().isoformat(), 'count': count} for month, count in monthly],
    }


def _county_rankings(start, end):
    total = func.count(Report.id)
    resolved = func.sum(case((Report.status == 'resolved', 1), else_=0))
    rows = (db.session.query(Report.county_id, County.name, total, resolved)
            .join(County, County.id == Report.county_id)
            .filter(Report.duplicate_of.is_(None), Report.county_id.isnot(None),
                    Report.created_at >= start, Report.created_at < end)
            .group_by(Report.county_id, County.name).all())
    ranked = []
    for county_id, name, count, resolved_count in rows:
        resolved_count = int(resolved_count or 0)
        ranked.append({'county_id': county_id, 'county': name, 'total_reports': count,
                       'resolved_reports': resolved_count,
                       'resolution_rate': round((resolved_count / count) * 100, 1) if count else 0})
    ranked.sort(key=lambda row: (-row['resolution_rate'], -row['resolved_reports'],
                                 -row['total_reports'], row['county']))
    for rank, row in enumerate(ranked, 1):
        row['rank'] = rank
    return ranked


def _quarter_snapshot(recipient, start, end):
    county_id = recipient.county_id
    current = _quarter_metrics(start, end, county_id)
    prior_start, _ = previous_quarter(start)
    prior = _quarter_metrics(prior_start, start, county_id)
    rankings = _county_rankings(start, end)
    county_rank = next((row for row in rankings if row['county_id'] == county_id), None)
    national_total = sum(row['total_reports'] for row in rankings)
    national_resolved = sum(row['resolved_reports'] for row in rankings)
    national_rate = round(national_resolved / national_total * 100, 1) if national_total else 0
    national_median = round(median([row['resolution_rate'] for row in rankings]), 1) if rankings else 0

    current_categories = {row['category']: row['count'] for row in current['by_category']}
    prior_categories = {row['category']: row['count'] for row in prior['by_category']}
    category_changes = []
    for name in current_categories.keys() | prior_categories.keys():
        before, now = prior_categories.get(name, 0), current_categories.get(name, 0)
        category_changes.append({
            'category': name, 'current_reports': now, 'previous_reports': before,
            'change': now - before,
            'change_percent': round((now - before) / before * 100, 1) if before else None,
        })
    category_changes.sort(key=lambda row: (-row['change'], -row['current_reports'], row['category']))

    qoq = {
        'previous_period_start': prior_start.isoformat(),
        'previous_period_end': (start - timedelta(days=1)).isoformat(),
        'reports_change': current['total_reports'] - prior['total_reports'],
        'reports_change_percent': (round((current['total_reports'] - prior['total_reports'])
                                         / prior['total_reports'] * 100, 1)
                                   if prior['total_reports'] else None),
        'resolution_rate_change_points': round(current['resolution_rate'] - prior['resolution_rate'], 1),
        'avg_days_to_resolve_change': (round(current['avg_days_to_resolve'] - prior['avg_days_to_resolve'], 1)
                                      if current['avg_days_to_resolve'] is not None
                                      and prior['avg_days_to_resolve'] is not None else None),
    }
    insights = []
    if county_rank:
        insights.append(f"{recipient.county.name} ranked #{county_rank['rank']} of {len(rankings)} counties by resolution rate.")
    if prior['total_reports']:
        direction = 'up' if qoq['reports_change'] > 0 else 'down' if qoq['reports_change'] < 0 else 'unchanged'
        insights.append(f"Report volume was {direction} {abs(qoq['reports_change_percent'] or 0):g}% from the previous quarter.")
    if category_changes and category_changes[0]['change'] > 0:
        leader = category_changes[0]
        insights.append(f"{leader['category']} reports had the largest increase: +{leader['change']} compared with the previous quarter.")
    if county_rank and county_rank['resolution_rate'] > national_median:
        insights.append(f"Resolution rate was {county_rank['resolution_rate'] - national_median:g} percentage points above the county median.")
    elif county_rank:
        insights.append(f"Resolution rate was {national_median - county_rank['resolution_rate']:g} percentage points below the county median.")

    return {
        **current,
        'scope': recipient.county.name if recipient.county else 'All counties',
        'is_national_scope': recipient.county_id is None,
        'ranking_basis': 'Resolution rate = reports submitted in the quarter that were resolved by briefing generation ÷ non-duplicate reports submitted in that quarter. Counties with no reports are not ranked.',
        'county_rank': county_rank['rank'] if county_rank else None,
        'ranked_counties': len(rankings),
        'national_median_resolution_rate': national_median,
        'national_resolution_rate': national_rate,
        'national_leaders': rankings[:5],
        'quarter_over_quarter': qoq,
        'category_changes': category_changes,
        'insights': insights,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }


def _digest_json(digest):
    batch = digest.batch
    return {
        'id': digest.id,
        'period_start': batch.period_start.isoformat(),
        'period_end': (batch.period_end - timedelta(days=1)).isoformat(),
        'sent_at': batch.created_at.isoformat(),
        'sent_by': batch.sender.name,
        'snapshot': digest.snapshot,
    }


@bp.get('/analytics/quarterly-digests')
@roles_required('admin')
def list_quarterly_digests():
    user = current_user()
    q = QuarterlyAnalyticsDigest.query.filter_by(recipient_id=user.id)
    if user.county_id is not None:
        q = q.filter(QuarterlyAnalyticsDigest.recipient_county_id == user.county_id)
    rows = (q
            .join(QuarterlyAnalyticsBatch)
            .order_by(QuarterlyAnalyticsBatch.period_start.desc()).all())
    return jsonify([_digest_json(row) for row in rows])


@bp.post('/analytics/quarterly-digests/send')
@roles_required('admin')
def send_quarterly_digests():
    sender = current_user()
    if sender.county_id is not None:
        raise ApiError('forbidden', 'Only a national admin can distribute quarterly analytics', 403)
    start, end = previous_quarter()
    existing = QuarterlyAnalyticsBatch.query.filter_by(period_start=start).first()
    if existing:
        raise ApiError('already_sent', 'Quarterly analytics for this period have already been sent', 409,
                       {'sent_at': existing.created_at.isoformat()})

    recipients = User.query.filter(User.role == 'admin', User.id != sender.id).order_by(User.id).all()
    try:
        batch = QuarterlyAnalyticsBatch(period_start=start, period_end=end, sent_by=sender.id)
        db.session.add(batch)
        db.session.flush()
        for recipient in recipients:
            db.session.add(QuarterlyAnalyticsDigest(
                batch_id=batch.id,
                recipient_id=recipient.id,
                recipient_county_id=recipient.county_id,
                snapshot=_quarter_snapshot(recipient, start, end),
            ))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError('already_sent', 'Quarterly analytics for this period have already been sent', 409)
    return jsonify({'period_start': start.isoformat(), 'period_end': (end - timedelta(days=1)).isoformat(),
                    'recipient_count': len(recipients), 'delivery': 'in_app'}), 201
