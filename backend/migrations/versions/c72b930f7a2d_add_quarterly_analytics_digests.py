"""Store quarterly analytics distributions for in-app admin delivery.

Revision ID: c72b930f7a2d
Revises: a347d1c9f052
Create Date: 2026-11-10 14:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'c72b930f7a2d'
down_revision = 'a347d1c9f052'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'quarterly_analytics_batches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('sent_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['sent_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('period_start', name='uq_quarterly_analytics_period_start'),
    )
    op.create_table(
        'quarterly_analytics_digests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),
        sa.Column('recipient_id', sa.Integer(), nullable=False),
        sa.Column('recipient_county_id', sa.Integer(), nullable=True),
        sa.Column('snapshot', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['quarterly_analytics_batches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_county_id'], ['counties.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_id', 'recipient_id', name='uq_quarterly_analytics_digest_recipient'),
    )
    op.create_index('ix_quarterly_analytics_recipient', 'quarterly_analytics_digests', ['recipient_id'], unique=False)


def downgrade():
    op.drop_index('ix_quarterly_analytics_recipient', table_name='quarterly_analytics_digests')
    op.drop_table('quarterly_analytics_digests')
    op.drop_table('quarterly_analytics_batches')
