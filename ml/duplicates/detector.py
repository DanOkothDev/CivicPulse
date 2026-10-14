"""
CivicPulse - Duplicate Report Detector

Task 13:
Detect potentially duplicate civic reports.

Current rule:
- Same category
- Within 200 metres

This is currently a rule-based detector.
It is independent of Flask and PostgreSQL so it can
later be imported by the backend as a normal Python function.
"""

import math


DUPLICATE_DISTANCE_METERS = 200


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two GPS coordinates
    using the Haversine formula.

    Returns:
        Distance in metres.
    """

    earth_radius = 6_371_000

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    difference_latitude = lat2 - lat1
    difference_longitude = math.radians(lon2 - lon1)

    a = (
        math.sin(difference_latitude / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(difference_longitude / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return earth_radius * c


def find_duplicates(
    report,
    all_reports,
    max_distance=DUPLICATE_DISTANCE_METERS,
):
    """
    Find potential duplicates for one report.

    A report is a potential duplicate when:
    1. It has the same category.
    2. It is within max_distance metres.
    """

    duplicates = []
    report_id = report.get("id", report.get("seed_id"))
    report_lat = report.get("lat", report.get("latitude"))
    report_lon = report.get("lon", report.get("longitude"))

    for other_report in all_reports:
        other_id = other_report.get("id", other_report.get("seed_id"))
        if other_id == report_id:
            continue

        report_category_id = report.get("category_id")
        other_category_id = other_report.get("category_id")
        if report_category_id is not None and other_category_id is not None:
            same_category = report_category_id == other_category_id
        else:
            report_category = " ".join(
                str(report.get("category", "")).lower().replace("_", " ").replace("-", " ").split()
            )
            other_category = " ".join(
                str(other_report.get("category", "")).lower().replace("_", " ").replace("-", " ").split()
            )
            same_category = report_category == other_category
        if not same_category:
            continue

        other_lat = other_report.get("lat", other_report.get("latitude"))
        other_lon = other_report.get("lon", other_report.get("longitude"))
        distance = calculate_distance(
            report_lat,
            report_lon,
            other_lat,
            other_lon,
        )

        if distance <= max_distance:
            location_score = max(0.0, 1 - distance / max_distance) if max_distance else 1.0
            duplicates.append(
                {
                    "report_id": other_id,
                    "score": round(location_score, 4),
                    "reasons": {
                        "location": round(location_score, 4),
                        "category": 1.0,
                        "distance_meters": round(distance, 2),
                        "reason": f"Same category and within {max_distance:g}m",
                    },
                }
            )

    return sorted(duplicates, key=lambda match: match["score"], reverse=True)


def detect_all_duplicates(
    reports,
    max_distance=DUPLICATE_DISTANCE_METERS,
):
    """
    Find potential duplicates for every report.
    """

    duplicate_results = {}

    for report in reports:

        matches = find_duplicates(
            report,
            reports,
            max_distance,
        )

        if matches:
            duplicate_results[
                report["seed_id"]
            ] = matches

    return duplicate_results


if __name__ == "__main__":

    import json
    from pathlib import Path

    seed_file = (
        Path(__file__).parent.parent
        / "seed"
        / "reports_seed.json"
    )

    with open(
        seed_file,
        "r",
        encoding="utf-8",
    ) as file:
        reports = json.load(file)

    results = detect_all_duplicates(reports)

    print(f"Total reports: {len(reports)}")
    print(
        "Reports with potential duplicates: "
        f"{len(results)}"
    )

    print("\nSample duplicate matches:")

    displayed = 0

    for report_id, matches in results.items():

        print(f"\nReport {report_id}:")

        for match in matches[:3]:
            print(
                f"  -> Report {match['report_id']} "
                f"({match['distance_meters']}m)"
            )

        displayed += 1

        if displayed == 10:
            break