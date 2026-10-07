"""
CivicPulse - Synthetic Seed Report Generator

Task 12:
Generate realistic civic infrastructure reports for development/testing.

The data is synthetic. The coordinates are realistic Nairobi coordinates,
but the reports do NOT represent real citizen complaints.

Task 13:
The generated dataset contains deliberate clusters of reports that can
be used to test duplicate detection.
"""

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

CENTER_LATITUDE = -1.286389
CENTER_LONGITUDE = 36.817223

LATITUDE_RANGE = 0.045
LONGITUDE_RANGE = 0.045

OUTPUT_FILE = Path(__file__).parent / "reports_seed.json"

# Seed user is identified by email rather than a hardcoded database ID.
SEED_USER_EMAIL = "seed@civicpulse.test"

# Area is optional according to the database schema.
DEFAULT_AREA_ID = None

# photo_path is required by the Report model.
PLACEHOLDER_PHOTO = "seed/placeholder.jpg"


# ============================================================
# CIVICPULSE CATEGORIES
# ============================================================

# These names must match the Category records in the database.
CATEGORIES = [
    "pothole",
    "streetlight",
    "drainage",
    "garbage",
    "water leak",
    "public facility",
]


CATEGORY_DESCRIPTIONS = {
    "pothole": [
        "Large pothole affecting vehicles and motorcycles.",
        "Deep pothole developing along the road surface.",
        "Damaged road section with several potholes.",
        "Road surface has deteriorated and requires repair.",
        "Large pothole creating a hazard for road users.",
    ],
    "streetlight": [
        "Streetlight is not functioning at night.",
        "Broken streetlight leaves part of the road poorly illuminated.",
        "Streetlight appears damaged and requires maintenance.",
        "Public lighting is not working in this section.",
        "Faulty streetlight is affecting visibility for pedestrians.",
    ],
    "drainage": [
        "Drainage channel appears blocked and requires clearing.",
        "Blocked drain is causing water to accumulate.",
        "Drainage obstruction may cause flooding during rainfall.",
        "Open drainage channel is filled with waste and debris.",
        "Water is not flowing properly through the drainage channel.",
    ],
    "garbage": [
        "Uncollected garbage has accumulated beside the road.",
        "Waste is piling up near a public area.",
        "Overflowing waste is creating an unpleasant environment.",
        "Garbage has not been collected and is spreading onto the roadside.",
        "Large amount of dumped waste reported in the area.",
    ],
    "water leak": [
        "Possible water leak reported near the roadside.",
        "Water appears to be leaking from damaged infrastructure.",
        "Residents report an interruption in water supply.",
        "Water pipe appears damaged and requires inspection.",
        "Water is pooling around a suspected damaged pipe.",
    ],
    "public facility": [
        "Public facility requires maintenance.",
        "Damaged public facility reported in the area.",
        "Public infrastructure appears to require repair.",
        "Facility is deteriorating and may require municipal attention.",
        "Public facility requires inspection and maintenance.",
    ],
}


# ============================================================
# VALID DATABASE STATUSES
# ============================================================

STATUSES = [
    "reported",
    "verified",
    "rejected",
    "assigned",
    "in_progress",
    "resolved",
]

STATUS_WEIGHTS = [
    0.25,  # reported
    0.15,  # verified
    0.10,  # rejected
    0.15,  # assigned
    0.15,  # in_progress
    0.20,  # resolved
]


# ============================================================
# DELIBERATE DUPLICATE CLUSTERS
# ============================================================

# These clusters intentionally place multiple reports close
# together so Task 13 can detect them.

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
        "category": "water leak",
        "latitude": -1.28850,
        "longitude": 36.81050,
        "number_of_reports": 5,
    },
]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def nearby_location(latitude, longitude, max_distance_meters=80):
    """
    Generate a random point within approximately max_distance_meters
    of a given location.

    Used to create deliberate duplicate clusters.
    """

    earth_radius = 6_371_000

    distance = random.uniform(0, max_distance_meters)
    angle = random.uniform(0, 2 * math.pi)

    latitude_change = (
        distance * math.cos(angle)
    ) / earth_radius

    longitude_change = (
        distance * math.sin(angle)
    ) / (
        earth_radius * math.cos(math.radians(latitude))
    )

    new_latitude = latitude + math.degrees(latitude_change)
    new_longitude = longitude + math.degrees(longitude_change)

    return new_latitude, new_longitude


def random_location():
    """Generate a random location around central Nairobi."""

    latitude = random.uniform(
        CENTER_LATITUDE - LATITUDE_RANGE,
        CENTER_LATITUDE + LATITUDE_RANGE,
    )

    longitude = random.uniform(
        CENTER_LONGITUDE - LONGITUDE_RANGE,
        CENTER_LONGITUDE + LONGITUDE_RANGE,
    )

    return latitude, longitude


def random_status():
    """Choose a realistic status using weighted probabilities."""

    return random.choices(
        STATUSES,
        weights=STATUS_WEIGHTS,
        k=1,
    )[0]


def random_created_at():
    """Generate a timestamp within the previous 90 days."""

    days_ago = random.uniform(0, 90)

    timestamp = (
        datetime.now(timezone.utc)
        - timedelta(days=days_ago)
    )

    return timestamp.isoformat()


def create_report(
    seed_id,
    category,
    latitude,
    longitude,
):
    """Create one synthetic report."""

    return {
        "seed_id": seed_id,

        # Category name is useful for standalone duplicate testing.
        "category": category,

        # category_id is intentionally left as None here.
        # The database seeder will look up Category by name.
        "category_id": None,

        "description": random.choice(
            CATEGORY_DESCRIPTIONS[category]
        ),

        "status": random_status(),

        "latitude": round(latitude, 7),
        "longitude": round(longitude, 7),

        # Optional according to the schema.
        "area_id": DEFAULT_AREA_ID,

        # Required by the database schema.
        "photo_path": PLACEHOLDER_PHOTO,

        # The database seeder will resolve this email
        # to an actual User ID.
        "created_by_email": SEED_USER_EMAIL,

        "assigned_to": None,
        "due_date": None,

        # Task 13 starts with these unset.
        "duplicate_of": None,
        "duplicate_score": None,
        "report_count": 1,

        "ai_category_id": None,
        "ai_confidence": None,

        "created_at": random_created_at(),
        "updated_at": None,
    }


# ============================================================
# GENERATE DATA
# ============================================================

def generate_reports():
    """Generate the complete synthetic report dataset."""

    random.seed(RANDOM_SEED)

    reports = []

    seed_id = 1

    # --------------------------------------------------------
    # Normal reports
    # --------------------------------------------------------

    duplicate_report_count = sum(
        cluster["number_of_reports"]
        for cluster in DUPLICATE_CLUSTERS
    )

    normal_report_count = (
        NUMBER_OF_REPORTS - duplicate_report_count
    )

    for _ in range(normal_report_count):

        category = random.choice(CATEGORIES)

        latitude, longitude = random_location()

        report = create_report(
            seed_id=seed_id,
            category=category,
            latitude=latitude,
            longitude=longitude,
        )

        reports.append(report)

        seed_id += 1

    # --------------------------------------------------------
    # Deliberate duplicate clusters
    # --------------------------------------------------------

    for cluster in DUPLICATE_CLUSTERS:

        for _ in range(cluster["number_of_reports"]):

            latitude, longitude = nearby_location(
                cluster["latitude"],
                cluster["longitude"],
                max_distance_meters=80,
            )

            report = create_report(
                seed_id=seed_id,
                category=cluster["category"],
                latitude=latitude,
                longitude=longitude,
            )

            reports.append(report)

            seed_id += 1

    # Shuffle so duplicate clusters are not simply grouped
    # together in the JSON file.
    random.shuffle(reports)

    return reports


def main():
    """Generate and save the seed dataset."""

    reports = generate_reports()

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

    print("CivicPulse seed data generated successfully.")
    print(f"Reports generated: {len(reports)}")
    print(f"Output file: {OUTPUT_FILE}")
    print(f"Seed user: {SEED_USER_EMAIL}")
    print(f"Photo placeholder: {PLACEHOLDER_PHOTO}")
    print(f"Categories: {len(CATEGORIES)}")
    print(f"Statuses: {len(STATUSES)}")


if __name__ == "__main__":
    main()