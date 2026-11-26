"""Transparent, read-only recommendation scoring for open infrastructure reports."""

from datetime import datetime, timezone


LIMITATIONS = [
    'Severity is not currently measured.',
    'Location impact is not currently measured.',
    'This is a recommendation based on persistence and confirmed report frequency, '
    'not an objective measurement of urgency.',
]


def _as_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def score_report(created_at, report_count, now=None):
    """Return score and explainable factors; invalid inputs contribute zero safely."""
    current = _as_utc(now or datetime.now(timezone.utc))
    try:
        created = _as_utc(created_at)
        days_open = max(0.0, (current - created).total_seconds() / 86400)
    except (AttributeError, TypeError, ValueError, OverflowError):
        days_open = 0.0

    try:
        confirmed_report_count = max(1, int(report_count))
    except (TypeError, ValueError, OverflowError):
        confirmed_report_count = 1

    age_points = min(days_open / 30, 1) * 60
    frequency_points = min((confirmed_report_count - 1) / 4, 1) * 40
    score = max(0, min(100, int(age_points + frequency_points + 0.5)))
    level = 'High' if score >= 70 else 'Medium' if score >= 35 else 'Low'
    explanations = [
        f"Open for {days_open:.1f} days, contributing {age_points:.1f} of 60 age points.",
        f"{confirmed_report_count} confirmed report(s) in this issue, contributing "
        f"{frequency_points:.1f} of 40 frequency points.",
    ]
    return {
        'score': score,
        'level': level,
        'age_contribution': round(age_points, 1),
        'frequency_contribution': round(frequency_points, 1),
        'days_open': round(days_open, 1),
        'confirmed_report_count': confirmed_report_count,
        'explanations': explanations,
        'limitations': list(LIMITATIONS),
        'basis': 'Recommendation based on persistence and confirmed report frequency; '
                 'not an objective measurement of urgency.',
    }
