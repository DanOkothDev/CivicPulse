
import math
from collections import Counter

from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import cast, func

from .extensions import db
from .models import Hotspot, Report

EARTH_RADIUS_M = 6_371_000


def _distance_m(point_a, point_b):
    """Haversine distance between (latitude, longitude) points."""
    lat1, lon1 = map(math.radians, point_a)
    lat2, lon2 = map(math.radians, point_b)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    a = min(1.0, max(0.0, a))

    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _dbscan(points, eps_m=250, min_samples=3):
    """Return a cluster label per point; -1 denotes noise."""
    if not math.isfinite(eps_m) or eps_m <= 0 or min_samples < 1:
        raise ValueError("eps_m must be positive and min_samples at least 1")

    labels = [None] * len(points)
    cluster_id = 0
    cell_size = max(eps_m, 1e-6)
    cells = {}
    xyz_points = []
    for index, (latitude, longitude) in enumerate(points):
        lat, lon = math.radians(latitude), math.radians(longitude)
        xyz = (
            EARTH_RADIUS_M * math.cos(lat) * math.cos(lon),
            EARTH_RADIUS_M * math.cos(lat) * math.sin(lon),
            EARTH_RADIUS_M * math.sin(lat),
        )
        xyz_points.append(xyz)
        cell = tuple(math.floor(coordinate / cell_size) for coordinate in xyz)
        cells.setdefault(cell, []).append(index)

    def neighbors(index):
        cell = tuple(math.floor(coordinate / cell_size) for coordinate in xyz_points[index])
        nearby = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    nearby.extend(cells.get((cell[0] + dx, cell[1] + dy, cell[2] + dz), ()))
        return [
            candidate for candidate in sorted(nearby)
            if _distance_m(points[index], points[candidate]) <= eps_m
        ]

    for index in range(len(points)):
        if labels[index] is not None:
            continue

        nearby = neighbors(index)

        if len(nearby) < min_samples:
            labels[index] = -1
            continue

        labels[index] = cluster_id
        seeds = list(nearby)
        seed_set = set(seeds)
        cursor = 0

        while cursor < len(seeds):
            candidate = seeds[cursor]

            if labels[candidate] == -1:
                # A previously identified noise point can be a border point.
                labels[candidate] = cluster_id

            if labels[candidate] is not None:
                cursor += 1
                continue

            labels[candidate] = cluster_id
            candidate_neighbors = neighbors(candidate)

            if len(candidate_neighbors) >= min_samples:
                for neighbor in candidate_neighbors:
                    if neighbor not in seed_set:
                        seeds.append(neighbor)
                        seed_set.add(neighbor)

            cursor += 1

        cluster_id += 1

    return labels


def recompute_hotspots(eps_m=250, min_samples=3):
    """Cluster canonical reports and replace the saved hotspot results."""
    if eps_m <= 0 or min_samples < 1:
        raise ValueError("Invalid DBSCAN parameters")

    longitude = func.ST_X(cast(Report.location, Geometry)).label("lon")
    latitude = func.ST_Y(cast(Report.location, Geometry)).label("lat")

    rows = (
        db.session.query(
            Report.id,
            Report.category_id,
            latitude,
            longitude,
        )
        .filter(Report.duplicate_of.is_(None))
        .all()
    )

    records = [
        {
            "id": row.id,
            "category_id": row.category_id,
            "lat": float(row.lat),
            "lon": float(row.lon),
        }
        for row in rows
        if row.lat is not None and row.lon is not None
    ]

    points = [(record["lat"], record["lon"]) for record in records]
    labels = _dbscan(points, eps_m, min_samples)

    clusters = {}
    for index, label in enumerate(labels):
        if label >= 0:
            clusters.setdefault(label, []).append(records[index])

    hotspots = []

    for members in clusters.values():
        center_lat = sum(r["lat"] for r in members) / len(members)
        center_lon = sum(r["lon"] for r in members) / len(members)

        radius = max(
            _distance_m((center_lat, center_lon), (r["lat"], r["lon"]))
            for r in members
        )

        category_counts = Counter(r["category_id"] for r in members)
        top_category_id = category_counts.most_common(1)[0][0]

        hotspots.append(
            Hotspot(
                center=WKTElement(
                    f"POINT({center_lon} {center_lat})",
                    srid=4326,
                ),
                radius_m=round(radius, 2),
                report_count=len(members),
                top_category_id=top_category_id,
            )
        )

    try:
        Hotspot.query.delete(synchronize_session=False)
        db.session.add_all(hotspots)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return {
        "clusters_created": len(hotspots),
        "noise_reports": labels.count(-1),
        "reports_considered": len(records),
        "eps_m": eps_m,
        "min_samples": min_samples,
    }
