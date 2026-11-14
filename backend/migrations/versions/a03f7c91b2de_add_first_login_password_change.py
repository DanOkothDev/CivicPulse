"""Require temporary staff passwords to be changed at first login.

Revision ID: a03f7c91b2de
Revises: f49e21a8c630
Create Date: 2026-11-13 15:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a03f7c91b2de'
down_revision = 'f49e21a8c630'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.alter_column('must_change_password', server_default=None)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('must_change_password')
