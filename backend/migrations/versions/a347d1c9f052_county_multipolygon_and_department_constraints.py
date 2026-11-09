"""Support real county geometries and department identity constraints.

Revision ID: a347d1c9f052
Revises: 6d9cc4efb121
Create Date: 2026-11-09 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography


revision = 'a347d1c9f052'
down_revision = '6d9cc4efb121'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    name_conflict = bind.execute(sa.text(
        'SELECT county_id, lower(name) FROM departments '
        'GROUP BY county_id, lower(name) HAVING count(*) > 1 LIMIT 1'
    )).first()
    if name_conflict:
        raise RuntimeError(
            f'Department names are not unique ignoring case in county {name_conflict[0]}'
        )

    code_conflict = bind.execute(sa.text(
        'SELECT county_id, code FROM departments WHERE code IS NOT NULL '
        'GROUP BY county_id, code HAVING count(*) > 1 LIMIT 1'
    )).first()
    if code_conflict:
        raise RuntimeError(
            f'Department codes are not unique in county {code_conflict[0]}'
        )

    op.alter_column(
        'counties',
        'boundary',
        type_=Geography(geometry_type='GEOMETRY', srid=4326),
        postgresql_using='ST_SetSRID(boundary::geometry, 4326)::geography(Geometry,4326)',
    )
    op.create_index(
        'uq_department_county_name_ci',
        'departments',
        ['county_id', sa.text('lower(name)')],
        unique=True,
    )
    op.create_unique_constraint(
        'uq_department_county_code',
        'departments',
        ['county_id', 'code'],
    )


def downgrade():
    bind = op.get_bind()
    has_multipolygon = bind.execute(sa.text(
        "SELECT id FROM counties "
        "WHERE boundary IS NOT NULL AND ST_GeometryType(boundary::geometry) <> 'ST_Polygon' "
        'LIMIT 1'
    )).first()
    if has_multipolygon:
        raise RuntimeError(
            'Cannot downgrade county.boundary to POLYGON while multipart or non-polygon '
            'boundaries are stored; doing so could discard geometry.'
        )

    op.drop_constraint('uq_department_county_code', 'departments', type_='unique')
    op.drop_index('uq_department_county_name_ci', table_name='departments')
    op.alter_column(
        'counties',
        'boundary',
        type_=Geography(geometry_type='POLYGON', srid=4326),
        postgresql_using='ST_SetSRID(boundary::geometry, 4326)::geography(Polygon,4326)',
    )
