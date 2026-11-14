"""Track staff temporary password email delivery.

Revision ID: b8e714a9d063
Revises: a03f7c91b2de
Create Date: 2026-11-13 16:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b8e714a9d063'
down_revision = 'a03f7c91b2de'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('temporary_password_email_status', sa.String(length=16), nullable=True))
    # Accounts created by the earlier synchronous onboarding flow were committed only after SMTP accepted the email.
    op.execute("UPDATE users SET temporary_password_email_status = 'sent' WHERE must_change_password IS TRUE AND is_active IS TRUE")


def downgrade():
    op.drop_column('users', 'temporary_password_email_status')
