from datetime import datetime, timezone

from geoalchemy2 import Geography

from .constants import ROLES, STATUSES
from .extensions import db


def now():
    return datetime.now(timezone.utc)


def _in(values):
    return ', '.join(f"'{v}'" for v in values)


class Area(db.Model):
    __tablename__ = 'areas'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    boundary = db.Column(Geography('POLYGON', srid=4326), nullable=True)


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), nullable=False, unique=True)
    icon = db.Column(db.String(40))


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='resident')
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    __table_args__ = (db.CheckConstraint(f'role IN ({_in(ROLES)})', name='ck_users_role'),)


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    description = db.Column(db.String(500))
    status = db.Column(db.String(20), nullable=False, default='reported')
    # Geography [a map-aware type that measures distances in real metres]; a GiST
    # index [a spatial search index] is created automatically so map queries stay fast.
    location = db.Column(Geography('POINT', srid=4326), nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='SET NULL'))
    photo_path = db.Column(db.String(255), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    due_date = db.Column(db.Date)
    # Duplicate handling: a duplicate points at its parent; the parent counts everyone.
    duplicate_of = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='SET NULL'))
    duplicate_score = db.Column(db.Float)
    report_count = db.Column(db.Integer, nullable=False, default=1)
    # AI suggestions (filled by the background worker).
    ai_category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    ai_confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=now, onupdate=now, nullable=False)

    category = db.relationship('Category', foreign_keys=[category_id])
    creator = db.relationship('User', foreign_keys=[created_by])
    assignee = db.relationship('User', foreign_keys=[assigned_to])
    events = db.relationship('StatusEvent', backref='report', order_by='StatusEvent.created_at',
                             cascade='all, delete-orphan')

    __table_args__ = (
        db.CheckConstraint(f'status IN ({_in(STATUSES)})', name='ck_reports_status'),
        db.Index('ix_reports_status_created', 'status', 'created_at'),
        db.Index('ix_reports_category', 'category_id'),
        db.Index('ix_reports_duplicate_of', 'duplicate_of'),
    )


class StatusEvent(db.Model):
    """One row per status change: the audit trail used for 'days to resolve'."""
    __tablename__ = 'status_events'
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    note = db.Column(db.String(500))
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    __table_args__ = (
        db.CheckConstraint(f'status IN ({_in(STATUSES)})', name='ck_status_events_status'),
        db.Index('ix_status_events_report', 'report_id', 'created_at'),
    )


class Follow(db.Model):
    __tablename__ = 'follows'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='CASCADE'), primary_key=True)


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    __table_args__ = (db.Index('ix_notifications_user', 'user_id', 'read', 'created_at'),)


class Hotspot(db.Model):
    """Output of the clustering job (Task 21); rebuilt each run."""
    __tablename__ = 'hotspots'
    id = db.Column(db.Integer, primary_key=True)
    center = db.Column(Geography('POINT', srid=4326), nullable=False)
    radius_m = db.Column(db.Float, nullable=False)
    report_count = db.Column(db.Integer, nullable=False)
    top_category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    computed_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
