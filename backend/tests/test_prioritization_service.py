from datetime import datetime, timedelta, timezone

import pytest

from app.prioritization_service import score_report


NOW = datetime(2026, 11, 26, tzinfo=timezone.utc)


@pytest.mark.parametrize(('days', 'count', 'score', 'level'), [
    (0, 1, 0, 'Low'),
    (15, 1, 30, 'Low'),
    (17, 1, 34, 'Low'),
    (17.5, 1, 35, 'Medium'),
    (29.5, 2, 69, 'Medium'),
    (30, 1, 60, 'Medium'),
    (30, 2, 70, 'High'),
    (30, 5, 100, 'High'),
    (100, 100, 100, 'High'),
])
def test_score_formula_and_level_boundaries(days, count, score, level):
    result = score_report(NOW - timedelta(days=days), count, NOW)
    assert result['score'] == score
    assert result['level'] == level


def test_naive_datetime_is_treated_as_utc_and_factors_are_explained():
    result = score_report(datetime(2026, 11, 16), 3, NOW)
    assert result['days_open'] == 10
    assert result['age_contribution'] == 20
    assert result['frequency_contribution'] == 20
    assert result['confirmed_report_count'] == 3
    assert len(result['explanations']) == 2
    assert 'Severity' in result['limitations'][0]
    assert 'Location impact' in result['limitations'][1]


@pytest.mark.parametrize('created,count', [(None, 0), ('bad-date', 'bad-count'),
                                            (NOW + timedelta(days=5), -10)])
def test_invalid_values_are_clamped_or_zeroed(created, count):
    result = score_report(created, count, NOW)
    assert result['score'] == 0
    assert result['days_open'] == 0
    assert result['confirmed_report_count'] == 1