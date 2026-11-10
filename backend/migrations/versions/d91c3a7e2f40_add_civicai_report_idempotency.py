"""Add an optional idempotency key for CivicAI report retries.

Revision ID: d91c3a7e2f40
Revises: c72b930f7a2d
Create Date: 2026-11-10 16:10:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'd91c3a7e2f40'
down_revision = 'c72b930f7a2d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reports', sa.Column('civicai_request_id', sa.String(length=36), nullable=True))
    op.create_unique_constraint(
        'uq_report_civicai_request', 'reports', ['created_by', 'civicai_request_id']
    )


def downgrade():
    op.drop_constraint('uq_report_civicai_request', 'reports', type_='unique')
    op.drop_column('reports', 'civicai_request_id')
