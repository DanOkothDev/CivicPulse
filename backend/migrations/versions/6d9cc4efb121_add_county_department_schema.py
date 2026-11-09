"""Add county and department schema for geographic routing.

Revision ID: 6d9cc4efb121
Revises: 71d2c49b8e63
Create Date: 2026-11-09 12:18:00.000000

"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography


# revision identifiers, used by Alembic.
revision = '6d9cc4efb121'
down_revision = '71d2c49b8e63'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')

    op.create_table(
        'counties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('boundary', Geography(geometry_type='POLYGON', srid=4326, spatial_index=False), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('code'),
    )

    with op.batch_alter_table('areas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('county_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_areas_county_id_counties',
            'counties',
            ['county_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_index('ix_areas_county', ['county_id'], unique=False)

    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('county_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('code', sa.String(length=60), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['county_id'], ['counties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('county_id', 'name', name='uq_department_county_name'),
    )
    with op.batch_alter_table('departments', schema=None) as batch_op:
        batch_op.create_index('ix_departments_county', ['county_id', 'name'], unique=False)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('county_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('department_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_users_county_id_counties', 'counties', ['county_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_users_department_id_departments', 'departments', ['department_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_users_county', ['county_id'], unique=False)
        batch_op.create_index('ix_users_department', ['department_id'], unique=False)

    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.add_column(sa.Column('county_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('department_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_reports_county_id_counties', 'counties', ['county_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_reports_department_id_departments', 'departments', ['department_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_reports_county_status', ['county_id', 'status', 'created_at'], unique=False)
        batch_op.create_index('ix_reports_department', ['department_id'], unique=False)


def downgrade():
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.drop_index('ix_reports_department')
        batch_op.drop_index('ix_reports_county_status')
        batch_op.drop_constraint('fk_reports_department_id_departments', type_='foreignkey')
        batch_op.drop_constraint('fk_reports_county_id_counties', type_='foreignkey')
        batch_op.drop_column('department_id')
        batch_op.drop_column('county_id')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_department')
        batch_op.drop_index('ix_users_county')
        batch_op.drop_constraint('fk_users_department_id_departments', type_='foreignkey')
        batch_op.drop_constraint('fk_users_county_id_counties', type_='foreignkey')
        batch_op.drop_column('department_id')
        batch_op.drop_column('county_id')

    with op.batch_alter_table('departments', schema=None) as batch_op:
        batch_op.drop_index('ix_departments_county')

    op.drop_table('departments')

    with op.batch_alter_table('areas', schema=None) as batch_op:
        batch_op.drop_index('ix_areas_county')
        batch_op.drop_constraint('fk_areas_county_id_counties', type_='foreignkey')
        batch_op.drop_column('county_id')

    op.drop_table('counties')
