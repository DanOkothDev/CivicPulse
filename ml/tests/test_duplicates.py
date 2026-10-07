import json
from pathlib import Path

from duplicates.detector import (
    calculate_distance,
    find_duplicates,
)


SEED_FILE = (
    Path(__file__).parent.parent
    / "seed"
    / "reports_seed.json"
)


def load_reports():
    with open(
        SEED_FILE,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def test_calculate_distance():
    """Identical coordinates should have zero distance."""

    distance = calculate_distance(
        -1.286389,
        36.817223,
        -1.286389,
        36.817223,
    )

    assert distance == 0


def test_nearby_same_category_is_duplicate():
    """Same category within 200m should match."""

    reports = [
        {
            "seed_id": 1,
            "category": "pothole",
            "latitude": -1.286389,
            "longitude": 36.817223,
        },
        {
            "seed_id": 2,
            "category": "pothole",
            "latitude": -1.286500,
            "longitude": 36.817300,
        },
    ]

    duplicates = find_duplicates(
        reports[0],
        reports,
    )

    assert len(duplicates) == 1
    assert duplicates[0]["report_id"] == 2


def test_different_categories_are_not_duplicates():
    """Different categories should not match."""

    reports = [
        {
            "seed_id": 1,
            "category": "pothole",
            "latitude": -1.286389,
            "longitude": 36.817223,
        },
        {
            "seed_id": 2,
            "category": "garbage",
            "latitude": -1.286400,
            "longitude": 36.817230,
        },
    ]

    duplicates = find_duplicates(
        reports[0],
        reports,
    )

    assert len(duplicates) == 0


def test_far_same_category_is_not_duplicate():
    """Same category over 200m away should not match."""

    reports = [
        {
            "seed_id": 1,
            "category": "pothole",
            "latitude": -1.286389,
            "longitude": 36.817223,
        },
        {
            "seed_id": 2,
            "category": "pothole",
            "latitude": -1.300000,
            "longitude": 36.830000,
        },
    ]

    duplicates = find_duplicates(
        reports[0],
        reports,
    )

    assert len(duplicates) == 0


def test_seed_data_contains_duplicate_candidates():
    """
    The generated dataset should contain deliberate
    duplicate clusters.
    """

    reports = load_reports()

    found_duplicates = False

    for report in reports:

        duplicates = find_duplicates(
            report,
            reports,
        )

        if duplicates:
            found_duplicates = True
            break

    assert found_duplicates


def test_seed_data_contains_300_reports():
    """Task 12 should generate exactly 300 reports."""

    reports = load_reports()

    assert len(reports) == 300


def test_seed_data_has_all_six_categories():
    """All CivicPulse categories should be represented."""

    reports = load_reports()

    categories = {
        report["category"]
        for report in reports
    }

    expected_categories = {
        "pothole",
        "streetlight",
        "drainage",
        "garbage",
        "water leak",
        "public facility",
    }

    assert categories == expected_categories


def test_seed_data_has_valid_statuses():
    """Every generated status must exist in the database schema."""

    reports = load_reports()

    valid_statuses = {
        "reported",
        "verified",
        "rejected",
        "assigned",
        "in_progress",
        "resolved",
    }

    for report in reports:
        assert report["status"] in valid_statuses


def test_seed_data_has_required_photo_path():
    """Every report must have a photo path."""

    reports = load_reports()

    for report in reports:
        assert report["photo_path"]
        assert report["photo_path"] == "seed/placeholder.jpg"


def test_seed_data_has_seed_user_email():
    """Every generated report should identify the seed user by email."""

    reports = load_reports()

    for report in reports:
        assert (
            report["created_by_email"]
            == "seed@civicpulse.test"
        )