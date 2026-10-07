import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

NUMBER_OF_REPORTS = 300
RANDOM_SEED = 42

# Nairobi CBD / surrounding area.
# These are geographic coordinates used only to make the
# synthetic dataset spatially realistic.
CENTER_LATITUDE = -1.286389
CENTER_LONGITUDE = 36.817223

# Approximate area covered by generated reports.
LATITUDE_RANGE = 0.045
LONGITUDE_RANGE = 0.045

OUTPUT_FILE = Path(__file__).parent / "reports_seed.json"


# ============================================================
# DATABASE REFERENCE IDs
# ============================================================
#
# IMPORTANT:
# Replace these values with the actual IDs from the team's
# categories, areas and users tables.
#
# DO NOT assume that IDs 1-5 exist in the final database.
#

CATEGORY_IDS = {
    "pothole": 1,
    "garbage": 2,
    "drainage": 3,
    "streetlight": 4,
    "water": 5,
}

AREA_IDS = [1]

# A real user ID must exist because reports.created_by
# is NOT NULL.
CREATED_BY_USER_IDS = [1]


# ============================================================
# REPORT CATEGORIES
# ============================================================

CATEGORY_DESCRIPTIONS = {
    "pothole": [
        "Large pothole affecting vehicles and motorcycles.",
        "Deep pothole developing along the road surface.",
        "Damaged road section with several potholes.",
        "Road surface has deteriorated and requires repair.",
        "Large pothole creating a hazard for road users.",
    ],

    "garbage": [
        "Uncollected garbage has accumulated beside the road.",
        "Waste is piling up near a public area.",
        "Overflowing waste is creating an unpleasant environment.",
        "Garbage has not been collected and is spreading onto the roadside.",
        "Large amount of dumped waste reported in the area.",
    ],

    "drainage": [
        "Drainage channel appears blocked and requires clearing.",
        "Blocked drain is causing water to accumulate.",
        "Drainage obstruction may cause flooding during rainfall.",
        "Open drainage channel is filled with waste and debris.",
        "Water is not flowing properly through the drainage channel.",
    ],

    "streetlight": [
        "Streetlight is not functioning at night.",
        "Broken streetlight leaves part of the road poorly illuminated.",
        "Streetlight appears damaged and requires maintenance.",
        "Public lighting is not working in this section.",
        "Several pedestrians report poor lighting caused by a faulty streetlight.",
    ],

    "water": [
        "Possible water leak reported near the roadside.",
        "Water appears to be leaking from damaged infrastructure.",
        "Residents report an interruption in water supply.",
        "Water pipe appears damaged and requires inspection.",
        "Water is pooling around a suspected damaged pipe.",
    ],
}


# ============================================================
# STATUSES
# ============================================================

STATUSES = [
    "reported",
    "verified",
    "assigned",
    "in_progress",
    "resolved",
]

STATUS_WEIGHTS = [
    0.30,
    0.20,
    0.15,
    0.15,
    0.20,
]


# ============================================================
# DUPLICATE CLUSTERS
# ============================================================
#
# We deliberately create groups of reports around the same
# geographic locations.
#
# Each cluster represents several citizens independently
# reporting approximately the same infrastructure problem.
#
# Task 13 should discover these as possible duplicates.
#

DUPLICATE_CLUSTERS = [
    {
        "category": "pothole",
        "latitude": -1.28380,
        "longitude": 36.81740,
        "number_of_reports": 5,
    },
    {
        "category": "pothole",
        "latitude": -1.29020,
        "longitude": 36.82110,
        "number_of_reports": 4,
    },
    {
        "category": "garbage",
        "latitude": -1.28150,
        "longitude": 36.81270,
        "number_of_reports": 5,
    },
    {
        "category": "garbage",
        "latitude": -1.28930,
        "longitude": 36.81420,
        "number_of_reports": 4,
    },
    {
        "category": "drainage",
        "latitude": -1.28710,
        "longitude": 36.82350,
        "number_of_reports": 5,
    },
    {
        "category": "drainage",
        "latitude": -1.29200,
        "longitude": 36.81600,
        "number_of_reports": 4,
    },
    {
        "category": "streetlight",
        "latitude": -1.28420,
        "longitude": 36.82000,
        "number_of_reports": 4,
    },
    {
        "category": "water",
        "latitude": -1.28850,
        "longitude": 36.81050,
        "number_of_reports": 5,
    },
]


# ============================================================
# HELPERS
# ============================================================

def random_status():
    """Return a realistic report status."""
    return random.choices(
        STATUSES,
        weights=STATUS_WEIGHTS,
        k=1
    )[0]


def random_datetime():
    """
    Generate a timestamp from approximately the last 90 days.
    """
    now = datetime.now(timezone.utc)

    days_ago = random.randint(0, 90)
    hours_ago = random.randint(0, 23)
    minutes_ago = random.randint(0, 59)

    return now - timedelta(
        days=days_ago,
        hours=hours_ago,
        minutes=minutes_ago,
    )


def random_location():
    """
    Generate a random point around Nairobi CBD.

    This is synthetic geographic data.
    """
    latitude = CENTER_LATITUDE + random.uniform(
        -LATITUDE_RANGE,
        LATITUDE_RANGE,
    )

    longitude = CENTER_LONGITUDE + random.uniform(
        -LONGITUDE_RANGE,
        LONGITUDE_RANGE,
    )

    return latitude, longitude


def nearby_location(latitude, longitude, max_distance_meters=80):
    """
    Generate a point near an existing point.

    Used to deliberately create duplicate reports.

    The result is approximate, which is sufficient for creating
    synthetic test data.
    """

    # Approximate metres per degree at Nairobi's latitude.
    meters_per_latitude_degree = 111_000

    meters_per_longitude_degree = (
        111_000 * math.cos(math.radians(latitude))
    )

    distance = random.uniform(10, max_distance_meters)
    angle = random.uniform(0, 2 * math.pi)

    north_offset = math.cos(angle) * distance
    east_offset = math.sin(angle) * distance

    latitude_offset = (
        north_offset / meters_per_latitude_degree
    )

    longitude_offset = (
        east_offset / meters_per_longitude_degree
    )

    return (
        latitude + latitude_offset,
        longitude + longitude_offset,
    )


def create_description(category):
    """Generate a description appropriate for the category."""
    return random.choice(
        CATEGORY_DESCRIPTIONS[category]
    )


def create_report(
    category,
    latitude,
    longitude,
):
    """Create one synthetic report."""

    return {
        "category": category,

        # Temporary category ID mapping.
        # This will be converted into category_id below.
        "category_id": CATEGORY_IDS[category],

        "description": create_description(category),

        "status": random_status(),

        "latitude": round(latitude, 7),
        "longitude": round(longitude, 7),

        "area_id": random.choice(AREA_IDS),

        # Required by the database schema.
        # For synthetic data we use a placeholder path.
        "photo_path": f"seed/photos/{category}_placeholder.jpg",

        "created_by": random.choice(CREATED_BY_USER_IDS),

        # Leave assignment functionality for Task 14.
        "assigned_to": None,
        "due_date": None,

        # IMPORTANT:
        # These remain empty because Task 13 should discover
        # duplicates rather than us pre-labeling them.
        "duplicate_of": None,
        "duplicate_score": None,

        "report_count": 1,

        # AI functionality belongs to Task 19/20.
        "ai_category_id": None,
        "ai_confidence": None,

        "created_at": random_datetime().isoformat(),
    }


# ============================================================
# GENERATE NORMAL REPORTS
# ============================================================

def generate_normal_reports(number_of_reports):
    """Generate independent reports distributed around Nairobi."""

    reports = []

    categories = list(CATEGORY_IDS.keys())

    for _ in range(number_of_reports):
        category = random.choice(categories)

        latitude, longitude = random_location()

        reports.append(
            create_report(
                category,
                latitude,
                longitude,
            )
        )

    return reports


# ============================================================
# GENERATE DELIBERATE DUPLICATE REPORTS
# ============================================================

def generate_duplicate_reports():
    """
    Generate reports deliberately located close together.

    These are NOT labelled as duplicates.

    Task 13 should discover them.
    """

    reports = []

    for cluster in DUPLICATE_CLUSTERS:

        category = cluster["category"]

        center_latitude = cluster["latitude"]
        center_longitude = cluster["longitude"]

        for _ in range(cluster["number_of_reports"]):

            latitude, longitude = nearby_location(
                center_latitude,
                center_longitude,
                max_distance_meters=80,
            )

            reports.append(
                create_report(
                    category,
                    latitude,
                    longitude,
                )
            )

    return reports


# ============================================================
# MAIN
# ============================================================

def generate_dataset():
    """Generate the complete synthetic CivicPulse dataset."""

    random.seed(RANDOM_SEED)

    duplicate_reports = generate_duplicate_reports()

    number_of_normal_reports = (
        NUMBER_OF_REPORTS - len(duplicate_reports)
    )

    normal_reports = generate_normal_reports(
        number_of_normal_reports
    )

    reports = normal_reports + duplicate_reports

    # Shuffle so duplicate reports aren't all together.
    random.shuffle(reports)

    # Add a local seed identifier for easier testing.
    for index, report in enumerate(reports, start=1):
        report["seed_id"] = index

    return reports


def main():
    reports = generate_dataset()

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            reports,
            file,
            indent=2,
        )

    print(
        f"Generated {len(reports)} synthetic CivicPulse reports."
    )

    print(
        f"Saved to: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()
