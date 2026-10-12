
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from ..extensions import db
from ..models import Category, Hotspot, Report

bp = Blueprint("analytics", __name__)

FINAL_STATUSES = ("resolved", "rejected")


@bp.get("/analytics/summary")
def summary():
    total = db.session.query(func.count(Report.id)).scalar() or 0

    open_reports = Report.query.filter(
        Report.status.notin_(FINAL_STATUSES)
    ).count()

    resolved_reports = Report.query.filter_by(status="resolved").count()

    by_status = (
        db.session.query(Report.status, func.count(Report.id))
        .group_by(Report.status)
        .order_by(Report.status)
        .all()
    )

    return jsonify({
        "total_reports": total,
        "open_reports": open_reports,
        "resolved_reports": resolved_reports,
        "hotspot_count": Hotspot.query.count(),
        "by_status": [
            {"status": status, "count": count}
            for status, count in by_status
        ],
    })


@bp.get("/analytics/categories")
def category_analytics():
    rows = (
        db.session.query(Category.id, Category.name, func.count(Report.id))
        .outerjoin(Report, Report.category_id == Category.id)
        .group_by(Category.id, Category.name)
        .order_by(Category.id)
        .all()
    )

    return jsonify([
        {"category_id": category_id, "category": name, "count": count}
        for category_id, name, count in rows
    ])


@bp.get("/analytics/statuses")
def status_analytics():
    rows = (
        db.session.query(Report.status, func.count(Report.id))
        .group_by(Report.status)
        .order_by(Report.status)
        .all()
    )

    return jsonify([
        {"status": status, "count": count}
        for status, count in rows
    ])


@bp.get("/analytics/trends")
def report_trends():
    try:
        days = int(request.args.get("days", 30))
    except (TypeError, ValueError):
        return jsonify(error={
            "code": "invalid_days",
            "message": "days must be an integer between 1 and 365",
        }), 400

    if not 1 <= days <= 365:
        return jsonify(error={
            "code": "invalid_days",
            "message": "days must be between 1 and 365",
        }), 400

    today = datetime.now(timezone.utc).date()
    start_day = today - timedelta(days=days - 1)
    cutoff = datetime.combine(
        start_day, datetime.min.time(), tzinfo=timezone.utc
    )

    rows = (
        db.session.query(
            func.date(Report.created_at).label("day"),
            func.count(Report.id),
        )
        .filter(Report.created_at >= cutoff)
        .group_by(func.date(Report.created_at))
        .order_by(func.date(Report.created_at))
        .all()
    )

    counts = {
        (day.isoformat() if hasattr(day, "isoformat") else str(day)): count
        for day, count in rows
    }

    daily_reports = []
    for offset in range(days):
        day = start_day + timedelta(days=offset)
        day_string = day.isoformat()
        daily_reports.append({
            "date": day_string,
            "count": counts.get(day_string, 0),
        })

    return jsonify({"days": days, "daily_reports": daily_reports})
