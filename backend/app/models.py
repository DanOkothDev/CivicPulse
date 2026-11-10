from datetime import datetime, timezone

from geoalchemy2 import Geography, Geometry
from sqlalchemy import inspect
from geoalchemy2.elements import WKTElement
from sqlalchemy import cast, func

from .constants import ROLES, STATUSES
from .extensions import db


def now():
    return datetime.now(timezone.utc)


def _in(values):
    return ', '.join(f"'{v}'" for v in values)


class County(db.Model):
    __tablename__ = 'counties'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    code = db.Column(db.String(20), nullable=False, unique=True)
    boundary = db.Column(Geography('GEOMETRY', srid=4326), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)

    areas = db.relationship('Area', back_populates='county')
    users = db.relationship('User', back_populates='county')
    reports = db.relationship('Report', back_populates='county')
    departments = db.relationship('Department', back_populates='county')

    @staticmethod
    def ensure_seed():
        if not inspect(db.engine).has_table('counties'):
            return
        from .constants import KENYA_COUNTIES

        existing = {row.code: row for row in County.query.all()}
        for index, name in enumerate(KENYA_COUNTIES):
            code = name.lower().replace(' & ', '-').replace(' ', '-').replace("'", '')
            county = existing.get(code)
            if county is None:
                county = County(name=name, code=code)
                db.session.add(county)
                existing[code] = county
        db.session.commit()

    @staticmethod
    def resolve_for_point(lat, lon):
        if lat is None or lon is None:
            return None
        point = WKTElement(f'POINT({lon} {lat})', srid=4326)
        return (
            County.query.filter(County.boundary.isnot(None))
            .filter(func.ST_Covers(cast(County.boundary, Geometry), cast(point, Geometry)))
            .order_by(func.ST_Area(cast(County.boundary, Geometry)).asc())
            .first()
        )


class Area(db.Model):
    __tablename__ = 'areas'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    boundary = db.Column(Geography('POLYGON', srid=4326), nullable=True)
    county_id = db.Column(db.Integer, db.ForeignKey('counties.id', ondelete='SET NULL'))

    county = db.relationship('County', back_populates='areas')

    @staticmethod
    def ensure_default():
        if not inspect(db.engine).has_table('areas'):
            return
        if not Area.query.first():
            db.session.add(Area(name='Default area'))
        db.session.commit()


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), nullable=False, unique=True)
    icon = db.Column(db.String(40))

    @staticmethod
    def ensure_seed():
        if not inspect(db.engine).has_table('categories'):
            return
        from .constants import DEFAULT_CATEGORIES

        for name, icon in DEFAULT_CATEGORIES:
            if not Category.query.filter_by(name=name).first():
                db.session.add(Category(name=name, icon=icon))
        db.session.commit()


class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    county_id = db.Column(db.Integer, db.ForeignKey('counties.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(60), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)

    county = db.relationship('County', back_populates='departments')
    users = db.relationship('User', back_populates='department')
    reports = db.relationship('Report', back_populates='department')

    __table_args__ = (
        db.UniqueConstraint('county_id', 'name', name='uq_department_county_name'),
        db.UniqueConstraint('county_id', 'code', name='uq_department_county_code'),
        db.Index(
            'uq_department_county_name_ci',
            'county_id',
            db.func.lower(name),
            unique=True,
        ),
        db.Index('ix_departments_county', 'county_id', 'name'),
    )

    @staticmethod
    def ensure_seed():
        if not inspect(db.engine).has_table('departments'):
            return
        from .constants import DEFAULT_DEPARTMENTS

        for county in County.query.order_by(County.id).all():
            if not Department.query.filter_by(county_id=county.id).first():
                for name in DEFAULT_DEPARTMENTS:
                    db.session.add(Department(county_id=county.id, name=name, code=name.lower().replace('&', 'and').replace(' ', '-')))
        db.session.commit()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='resident')
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='SET NULL'))
    county_id = db.Column(db.Integer, db.ForeignKey('counties.id', ondelete='SET NULL'))
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'))
    onboarding_completed = db.Column(db.Boolean, nullable=False, default=False)
    product_tour_enabled = db.Column(db.Boolean, nullable=False, default=True)
    feature_tips_enabled = db.Column(db.Boolean, nullable=False, default=True)
    onboarding_completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    county = db.relationship('County', back_populates='users')
    department = db.relationship('Department', back_populates='users')
    __table_args__ = (db.CheckConstraint(f'role IN ({_in(ROLES)})', name='ck_users_role'),)


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    description = db.Column(db.String(500))
    address = db.Column(db.String(255))
    landmark = db.Column(db.String(120))
    status = db.Column(db.String(20), nullable=False, default='reported')
    # Geography [a map-aware type that measures distances in real metres]; a GiST
    # index [a spatial search index] is created automatically so map queries stay fast.
    location = db.Column(Geography('POINT', srid=4326), nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id', ondelete='SET NULL'))
    county_id = db.Column(db.Integer, db.ForeignKey('counties.id', ondelete='SET NULL'))
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'))
    photo_path = db.Column(db.String(255), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # Optional key used by CivicAI retries; standard report submissions leave this NULL.
    civicai_request_id = db.Column(db.String(36), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    due_date = db.Column(db.Date)
    # Duplicate handling: a duplicate points at its parent; the parent counts everyone.
    duplicate_of = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='SET NULL'))
    duplicate_score = db.Column(db.Float)
    report_count = db.Column(db.Integer, nullable=False, default=1)
    # AI suggestions (filled by the background worker).
    ai_category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    ai_class_name = db.Column(db.String(100))
    ai_confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=now, onupdate=now, nullable=False)

    category = db.relationship('Category', foreign_keys=[category_id])
    ai_category = db.relationship('Category', foreign_keys=[ai_category_id])
    county = db.relationship('County', back_populates='reports')
    department = db.relationship('Department', back_populates='reports')
    classification_feedback = db.relationship(
        'ClassificationFeedback', back_populates='report', uselist=False
    )
    creator = db.relationship('User', foreign_keys=[created_by])
    assignee = db.relationship('User', foreign_keys=[assigned_to])
    events = db.relationship('StatusEvent', backref='report', order_by='StatusEvent.created_at',
                             cascade='all, delete-orphan')

    __table_args__ = (
        db.CheckConstraint(f'status IN ({_in(STATUSES)})', name='ck_reports_status'),
        db.Index('ix_reports_status_created', 'status', 'created_at'),
        db.Index('ix_reports_category', 'category_id'),
        db.Index('ix_reports_duplicate_of', 'duplicate_of'),
        db.Index('ix_reports_county_status', 'county_id', 'status', 'created_at'),
        db.Index('ix_reports_department', 'department_id'),
        db.UniqueConstraint('created_by', 'civicai_request_id', name='uq_report_civicai_request'),
    )


class ClassificationFeedback(db.Model):
    __tablename__ = 'classification_feedback'
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='CASCADE'),
                          nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    predicted_class = db.Column(db.String(100), nullable=False)
    predicted_category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    confidence = db.Column(db.Float, nullable=False)
    selected_category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    accepted = db.Column(db.Boolean, nullable=False)
    submitted_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    review_status = db.Column(db.String(20), nullable=False, default='pending')
    training_eligible = db.Column(db.Boolean, nullable=False, default=False)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    reviewed_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)

    report = db.relationship('Report', back_populates='classification_feedback')
    predicted_category = db.relationship('Category', foreign_keys=[predicted_category_id])
    selected_category = db.relationship('Category', foreign_keys=[selected_category_id])

    __table_args__ = (
        db.UniqueConstraint('report_id', name='uq_classification_feedback_report'),
        db.CheckConstraint("review_status IN ('pending', 'approved', 'rejected')",
                           name='ck_classification_feedback_review_status'),
        db.CheckConstraint('confidence >= 0 AND confidence <= 1',
                           name='ck_classification_feedback_confidence'),
        db.CheckConstraint(
            "NOT training_eligible OR review_status = 'approved'",
            name='ck_classification_feedback_training_approval',
        ),
        db.CheckConstraint(
            'NOT accepted OR (predicted_category_id IS NOT NULL AND '
            'selected_category_id = predicted_category_id)',
            name='ck_classification_feedback_accepted_category',
        ),
        db.Index('ix_classification_feedback_review', 'review_status', 'created_at'),
        db.Index('ix_classification_feedback_training', 'training_eligible', 'review_status'),
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


class QuarterlyAnalyticsBatch(db.Model):
    __tablename__ = 'quarterly_analytics_batches'
    id = db.Column(db.Integer, primary_key=True)
    period_start = db.Column(db.Date, nullable=False, unique=True)
    period_end = db.Column(db.Date, nullable=False)
    sent_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    sender = db.relationship('User')
    deliveries = db.relationship('QuarterlyAnalyticsDigest', back_populates='batch', cascade='all, delete-orphan')


class QuarterlyAnalyticsDigest(db.Model):
    __tablename__ = 'quarterly_analytics_digests'
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('quarterly_analytics_batches.id', ondelete='CASCADE'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    recipient_county_id = db.Column(db.Integer, db.ForeignKey('counties.id', ondelete='SET NULL'))
    snapshot = db.Column(db.JSON, nullable=False)
    batch = db.relationship('QuarterlyAnalyticsBatch', back_populates='deliveries')
    recipient = db.relationship('User')
    recipient_county = db.relationship('County')
    __table_args__ = (
        db.UniqueConstraint('batch_id', 'recipient_id', name='uq_quarterly_analytics_digest_recipient'),
        db.Index('ix_quarterly_analytics_recipient', 'recipient_id'),
    )


class DuplicateSuggestion(db.Model):
    """The AI's guesses that a report duplicates another one, with the reasons (Task 13 / 20).
    The verifier reads these, then merges or ignores them."""
    __tablename__ = 'duplicate_suggestions'
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    score = db.Column(db.Float, nullable=False)
    reasons = db.Column(db.JSON)  # e.g. {"location": 0.8, "category": 1, "time": 0.96, "photo": null}
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    __table_args__ = (
        db.UniqueConstraint('report_id', 'candidate_id', name='uq_duplicate_suggestion'),
        db.CheckConstraint('score >= 0 AND score <= 1', name='ck_duplicate_score'),
        db.Index('ix_duplicate_suggestions_report', 'report_id', 'score'),
    )
