import pytest

from app.api.reference import _polygon_wkt
from app.errors import ApiError


def test_polygon_wkt_preserves_outer_ring_and_holes():
    polygon = {
        'type': 'Polygon',
        'coordinates': [
            [[36.8, -1.3], [36.9, -1.3], [36.9, -1.2], [36.8, -1.2], [36.8, -1.3]],
            [[36.82, -1.28], [36.83, -1.28], [36.83, -1.27],
             [36.82, -1.27], [36.82, -1.28]],
        ],
    }

    assert _polygon_wkt(polygon) == (
        'POLYGON((36.8 -1.3, 36.9 -1.3, 36.9 -1.2, 36.8 -1.2, 36.8 -1.3), '
        '(36.82 -1.28, 36.83 -1.28, 36.83 -1.27, 36.82 -1.27, 36.82 -1.28))'
    )


@pytest.mark.parametrize('polygon', [
    None,
    {'type': 'LineString', 'coordinates': []},
    {'type': 'Polygon', 'coordinates': [[[36.8, -1.3], [36.9, -1.3], [36.9, -1.2]]]},
    {'type': 'Polygon', 'coordinates': [[[36.8, -1.3], [36.9, -1.3], [36.9, -1.2],
                                         [36.8, -1.2]]]},
    {'type': 'Polygon', 'coordinates': [[[181, 0], [0, 1], [1, 0], [181, 0]]]},
    {'type': 'Polygon', 'coordinates': [[[10 ** 1000, 0], [0, 1], [1, 0], [10 ** 1000, 0]]]},
])
def test_polygon_wkt_rejects_invalid_coordinates(polygon):
    with pytest.raises(ApiError):
        _polygon_wkt(polygon)
