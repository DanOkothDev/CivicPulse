"""Add onboarding preferences

Revision ID: a3cb9e48ad24
Revises: ec5b0d8dc4af
Create Date: 2026-11-08 20:14:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3cb9e48ad24'
down_revision = 'ec5b0d8dc4af'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('product_tour_enabled', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column('feature_tips_enabled', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('onboarding_completed', server_default=None)
        batch_op.alter_column('product_tour_enabled', server_default=None)
        batch_op.alter_column('feature_tips_enabled', server_default=None)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('onboarding_completed_at')
        batch_op.drop_column('feature_tips_enabled')
        batch_op.drop_column('product_tour_enabled')
        batch_op.drop_column('onboarding_completed')
