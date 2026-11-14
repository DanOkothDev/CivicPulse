"""Add user account revocation flag.

Revision ID: f49e21a8c630
Revises: d91c3a7e2f40
Create Date: 2026-11-13 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f49e21a8c630'
down_revision = 'd91c3a7e2f40'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.alter_column('is_active', server_default=None)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_active')
