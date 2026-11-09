import hashlib
import json
from urllib.request import urlopen

from sqlalchemy import text

from .extensions import db

BOUNDARY_SOURCE_URL = (
    'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/'
    'releaseData/gbHumanitarian/KEN/ADM1/geoBoundaries-KEN-ADM1.geojson'
)
BOUNDARY_SOURCE_SHA256 = 'B56CC477AF2EC6A915D33EAD7DFB32871C5EA62886EEE388AEF786E96A6445D2'
SOURCE_FEATURE_TO_COUNTY_CODE = {
    '84041B4966396117000': 'mombasa',
    '84041B49371932358008': 'kwale',
    '84041B48657530486511': 'kilifi',
    '84041B43344583484167': 'tana-river',
    '84041B59205792954549': 'lamu',
    '84041B20805422820943': 'taita-taveta',
    '84041B68521891022803': 'garissa',
    '84041B31162130895851': 'wajir',
    '84041B97164571435884': 'mandera',
    '84041B71371005366284': 'marsabit',
    '84041B31210356473951': 'isiolo',
    '84041B51785833405201': 'meru',
    '84041B89608442037415': 'tharaka-nithi',
    '84041B48419403847090': 'embu',
    '84041B73138708866033': 'kitui',
    '84041B53348899617297': 'machakos',
    '84041B71092434276748': 'makueni',
    '84041B28549084367121': 'nyandarua',
    '84041B95669428538400': 'nyeri',
    '84041B65963379650483': 'kirinyaga',
    '84041B76933648255209': 'muranga',
    '84041B93184238747098': 'kiambu',
    '84041B15545177329011': 'turkana',
    '84041B60516303049092': 'west-pokot',
    '84041B68820083537026': 'samburu',
    '84041B30774600407111': 'trans-nzoia',
    '84041B13275604476180': 'uasin-gishu',
    '84041B60058764890390': 'elgeyo-marakwet',
    '84041B15384331282421': 'nandi',
    '84041B20040140383820': 'baringo',
    '84041B21702061071144': 'laikipia',
    '84041B32841551839435': 'nakuru',
    '84041B41773146059949': 'narok',
    '84041B33592267968891': 'kajiado',
    '84041B43889823691832': 'kericho',
    '84041B77241007369657': 'bomet',
    '84041B9783457716565': 'kakamega',
    '84041B90068641190391': 'vihiga',
    '84041B37267527329789': 'bungoma',
    '84041B84404578063732': 'busia',
    '84041B90602795386742': 'siaya',
    '84041B39834413495081': 'kisumu',
    '84041B84281011595703': 'homa-bay',
    '84041B55366160165314': 'migori',
    '84041B39825939755141': 'kisii',
    '84041B97594390238659': 'nyamira',
    '84041B21327310696623': 'nairobi',
}

KENYA_COUNTY_POINTS = {
    'nairobi': (-1.286389, 36.817223),
    'kisumu': (-0.091702, 34.767956),
}


def download_source():
    with urlopen(BOUNDARY_SOURCE_URL, timeout=60) as response:
        content = response.read()
    digest = hashlib.sha256(content).hexdigest().upper()
    if digest != BOUNDARY_SOURCE_SHA256:
        raise ValueError(
            f'Boundary download checksum mismatch: expected {BOUNDARY_SOURCE_SHA256}, got {digest}'
        )
    return content


def _read_features(content):
    source = json.loads(content)
    crs_name = (
        source.get('crs', {})
        .get('properties', {})
        .get('name')
    )
    if crs_name not in ('urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'):
        raise ValueError(f'Unsupported boundary CRS: {crs_name!r}')
    features = source.get('features')
    if not isinstance(features, list) or len(features) != 47:
        raise ValueError('Expected exactly 47 Kenyan county features')

    feature_rows = {}
    for feature in features:
        properties = feature.get('properties') or {}
        source_id = properties.get('shapeID')
        county_code = SOURCE_FEATURE_TO_COUNTY_CODE.get(source_id)
        if county_code is None:
            raise ValueError(f'Unknown county boundary source ID: {source_id!r}')
        if source_id in feature_rows or county_code in (
            row['county_code'] for row in feature_rows.values()
        ):
            raise ValueError(f'Duplicate boundary feature or county code: {source_id}')
        if properties.get('shapeGroup') != 'KEN' or properties.get('shapeType') != 'ADM1':
            raise ValueError(f'Unexpected boundary feature metadata for {source_id}')
        geometry = feature.get('geometry')
        if not isinstance(geometry, dict) or geometry.get('type') not in ('Polygon', 'MultiPolygon'):
            raise ValueError(f'Expected Polygon or MultiPolygon for {source_id}')
        if not geometry.get('coordinates'):
            raise ValueError(f'Empty coordinates for {source_id}')
        feature_rows[source_id] = {
            'county_code': county_code,
            'geometry': json.dumps(geometry, separators=(',', ':')),
        }

    if set(feature_rows) != set(SOURCE_FEATURE_TO_COUNTY_CODE):
        raise ValueError('County boundary source is missing or has unexpected feature IDs')
    return feature_rows


def import_county_boundaries(content):
    features = _read_features(content)
    with db.engine.begin() as connection:
        counties = connection.execute(text('SELECT id, code FROM counties')).all()
        county_ids = {row.code: row.id for row in counties}
        expected_codes = set(SOURCE_FEATURE_TO_COUNTY_CODE.values())
        if len(counties) != 47 or set(county_ids) != expected_codes:
            raise ValueError('Database must contain exactly the 47 expected county codes')

        for feature in features.values():
            validation = connection.execute(text(
                'SELECT ST_SRID(geom), ST_GeometryType(geom), ST_IsValid(geom), '
                'ST_IsEmpty(geom), ST_IsValidReason(geom) '
                'FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326) AS geom) input'
            ), {'geometry': feature['geometry']}).one()
            srid, geometry_type, valid, empty, reason = validation
            if srid != 4326 or geometry_type not in ('ST_Polygon', 'ST_MultiPolygon') or not valid or empty:
                raise ValueError(f'Invalid county geometry for {feature["county_code"]}: {reason}')

        for feature in features.values():
            connection.execute(text(
                'UPDATE counties SET boundary = '
                'ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326)::geography(Geometry,4326) '
                'WHERE id = :county_id AND code = :county_code'
            ), {
                'geometry': feature['geometry'],
                'county_id': county_ids[feature['county_code']],
                'county_code': feature['county_code'],
            })

        summary = connection.execute(text(
            'SELECT count(*), count(boundary), '
            'count(*) FILTER (WHERE boundary IS NOT NULL AND ST_IsValid(boundary::geometry)), '
            'count(*) FILTER (WHERE boundary IS NOT NULL AND ST_SRID(boundary::geometry) = 4326) '
            'FROM counties'
        )).one()
        if summary != (47, 47, 47, 47):
            raise ValueError(f'PostGIS county boundary validation failed: {summary}')

        for county_code, (lat, lon) in KENYA_COUNTY_POINTS.items():
            matches = connection.execute(text(
                'SELECT code FROM counties WHERE ST_Covers(boundary::geometry, '
                'ST_SetSRID(ST_MakePoint(:lon, :lat),4326)) ORDER BY code'
            ), {'lat': lat, 'lon': lon}).scalars().all()
            if matches != [county_code]:
                raise ValueError(
                    f'Expected {county_code} to uniquely cover its validation point, got {matches}'
                )
        outside = connection.execute(text(
            'SELECT count(*) FROM counties WHERE ST_Covers(boundary::geometry, '
            'ST_SetSRID(ST_MakePoint(0,0),4326))'
        )).scalar_one()
        if outside:
            raise ValueError('An out-of-Kenya validation point is covered by a county')

    return {'counties': 47, 'valid': 47, 'srid': 4326}
