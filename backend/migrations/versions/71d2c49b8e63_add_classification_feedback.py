"""Add resident classifier feedback and report class names.

Revision ID: 71d2c49b8e63
Revises: a3cb9e48ad24
Create Date: 2026-11-09 02:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '71d2c49b8e63'
down_revision = 'a3cb9e48ad24'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reports', sa.Column('ai_class_name', sa.String(length=100), nullable=True))
    op.create_table(
        'classification_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('image_path', sa.String(length=255), nullable=False),
        sa.Column('predicted_class', sa.String(length=100), nullable=False),
        sa.Column('predicted_category_id', sa.Integer(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('selected_category_id', sa.Integer(), nullable=False),
        sa.Column('accepted', sa.Boolean(), nullable=False),
        sa.Column('submitted_by', sa.Integer(), nullable=True),
        sa.Column('review_status', sa.String(length=20), nullable=False),
        sa.Column('training_eligible', sa.Boolean(), nullable=False),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "review_status IN ('pending', 'approved', 'rejected')",
            name='ck_classification_feedback_review_status',
        ),
        sa.CheckConstraint(
            'confidence >= 0 AND confidence <= 1',
            name='ck_classification_feedback_confidence',
        ),
        sa.CheckConstraint(
            "NOT training_eligible OR review_status = 'approved'",
            name='ck_classification_feedback_training_approval',
        ),
        sa.CheckConstraint(
            'NOT accepted OR (predicted_category_id IS NOT NULL AND '
            'selected_category_id = predicted_category_id)',
            name='ck_classification_feedback_accepted_category',
        ),
        sa.ForeignKeyConstraint(['predicted_category_id'], ['categories.id']),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['selected_category_id'], ['categories.id']),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_id', name='uq_classification_feedback_report'),
    )
    op.create_index(
        'ix_classification_feedback_review',
        'classification_feedback',
        ['review_status', 'created_at'],
    )
    op.create_index(
        'ix_classification_feedback_training',
        'classification_feedback',
        ['training_eligible', 'review_status'],
    )


def downgrade():
    op.drop_index('ix_classification_feedback_training', table_name='classification_feedback')
    op.drop_index('ix_classification_feedback_review', table_name='classification_feedback')
    op.drop_table('classification_feedback')
    op.drop_column('reports', 'ai_class_name')
