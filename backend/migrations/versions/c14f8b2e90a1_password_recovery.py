"""Add password recovery tokens and JWT token versions.

Revision ID: c14f8b2e90a1
Revises: b8e714a9d063
Create Date: 2026-11-15
"""
from alembic import op
import sqlalchemy as sa


revision = 'c14f8b2e90a1'
down_revision = 'b8e714a9d063'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('token_version', sa.Integer(), server_default='0', nullable=False))
    op.alter_column('users', 'token_version', server_default=None)
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'], unique=True)
    op.create_index('ix_password_reset_tokens_user_open', 'password_reset_tokens', ['user_id', 'used_at', 'expires_at'])


def downgrade():
    op.drop_index('ix_password_reset_tokens_user_open', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_token_hash', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
    op.drop_column('users', 'token_version')
