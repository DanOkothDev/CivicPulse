
from app.hotspot_service import _dbscan, _distance_m


def test_dbscan_groups_dense_reports_and_marks_noise():
    points = [
        (-1.2000, 36.8000),
        (-1.2001, 36.8000),
        (-1.2002, 36.8000),
        (-1.5000, 37.0000),
    ]

    labels = _dbscan(points, eps_m=50, min_samples=3)

    assert labels[0] == labels[1] == labels[2]
    assert labels[0] >= 0
    assert labels[3] == -1


def test_dbscan_marks_small_groups_as_noise():
    points = [
        (-1.2000, 36.8000),
        (-1.2001, 36.8000),
    ]

    assert _dbscan(points, eps_m=50, min_samples=3) == [-1, -1]


def test_distance_is_zero_for_identical_points():
    point = (-1.2864, 36.8172)

    assert _distance_m(point, point) == 0


def test_dbscan_spatial_index_preserves_neighbors_across_longitude_wrap():
    points = [
        (0.0, 179.9995),
        (0.0, -179.9995),
        (0.0, 179.9990),
        (35.0, 40.0),
    ]

    labels = _dbscan(points, eps_m=120, min_samples=3)

    assert labels[0] == labels[1] == labels[2] >= 0
    assert labels[3] == -1
