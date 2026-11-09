import json

import pytest

from app.county_boundaries import SOURCE_FEATURE_TO_COUNTY_CODE, _read_features


def _geojson():
    return {
        'type': 'FeatureCollection',
        'crs': {'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}},
        'features': [
            {
                'type': 'Feature',
                'properties': {
                    'shapeID': source_id,
                    'shapeGroup': 'KEN',
                    'shapeType': 'ADM1',
                },
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                },
            }
            for source_id in SOURCE_FEATURE_TO_COUNTY_CODE
        ],
    }


def test_boundary_import_parser_requires_all_county_ids_and_valid_polygon_types():
    parsed = _read_features(json.dumps(_geojson()).encode())
    assert len(parsed) == 47
    assert {row['county_code'] for row in parsed.values()} == set(
        SOURCE_FEATURE_TO_COUNTY_CODE.values()
    )

    source = _geojson()
    source['features'][0]['geometry']['type'] = 'LineString'
    with pytest.raises(ValueError, match='Polygon or MultiPolygon'):
        _read_features(json.dumps(source).encode())


def test_boundary_import_parser_rejects_unexpected_crs_and_source_ids():
    source = _geojson()
    source['crs']['properties']['name'] = 'EPSG:3857'
    with pytest.raises(ValueError, match='Unsupported boundary CRS'):
        _read_features(json.dumps(source).encode())

    source = _geojson()
    source['features'][0]['properties']['shapeID'] = 'unknown-source-id'
    with pytest.raises(ValueError, match='Unknown county boundary source ID'):
        _read_features(json.dumps(source).encode())
