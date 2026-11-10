import csv
import click
import hashlib
import os
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from werkzeug.security import generate_password_hash

from .county_boundaries import (
    BOUNDARY_SOURCE_SHA256,
    download_source,
    import_county_boundaries,
)
from .civicai import GROQ_RESPONSES_TOOL_MODELS, list_groq_models
from .constants import DEFAULT_CATEGORIES, ROLES
from .extensions import db
from .jobqueue import enqueue, queue_info
from .jobs import process_new_report
from .models import Area, Category, ClassificationFeedback, County, Department, Report, User


def register_cli(app):
    @app.cli.command('civicai-models')
    def civicai_models():
        """List active Groq model IDs using GROQ_API_KEY from the backend environment."""
        try:
            models = list_groq_models()
        except ValueError as error:
            raise click.ClickException(str(error)) from error
        if not models:
            click.echo('Groq returned no active models for this API key.')
            return
        for model in models:
            capability = ' (verified for CivicAI Responses + tools)' if model in GROQ_RESPONSES_TOOL_MODELS else ''
            click.echo(f'{model}{capability}')

    @app.cli.command('init-db')
    def init_db():
        """Quick dev setup: enable PostGIS and create all tables."""
        db.session.execute(text('CREATE EXTENSION IF NOT EXISTS postgis'))
        db.session.commit()
        db.create_all()
        db.session.execute(text(
            'ALTER TABLE reports ADD COLUMN IF NOT EXISTS address VARCHAR(255)'
        ))
        db.session.execute(text(
            'ALTER TABLE reports ADD COLUMN IF NOT EXISTS landmark VARCHAR(120)'
        ))
        db.session.commit()
        click.echo('Tables created.')

    @app.cli.command('seed')
    def seed():
        """Insert the default categories and county records (safe to run twice)."""
        for name, icon in DEFAULT_CATEGORIES:
            if not Category.query.filter_by(name=name).first():
                db.session.add(Category(name=name, icon=icon))
        if not Area.query.first():
            db.session.add(Area(name='Default area'))
        County.ensure_seed()
        Department.ensure_seed()
        db.session.commit()
        click.echo('Seeded categories, default area, and county metadata.')

    @app.cli.command('import-county-boundaries')
    @click.option(
        '--source-file',
        type=click.Path(exists=True, dir_okay=False, readable=True, path_type=str),
        help='Use a previously downloaded copy of the pinned GeoJSON release.',
    )
    def import_boundaries(source_file):
        """Import pinned IEBC/HDX county polygons into the existing counties."""
        try:
            if source_file:
                with open(source_file, 'rb') as source:
                    content = source.read()
            else:
                content = download_source()
            digest = hashlib.sha256(content).hexdigest().upper()
            if digest != BOUNDARY_SOURCE_SHA256:
                raise click.ClickException(
                    f'Boundary source checksum mismatch: expected {BOUNDARY_SOURCE_SHA256}, got {digest}'
                )
            result = import_county_boundaries(content)
        except click.ClickException:
            raise
        except (OSError, ValueError, SQLAlchemyError) as error:
            raise click.ClickException(f'County boundary import failed: {error}') from error
        click.echo(
            f"Imported {result['counties']} county boundaries; "
            f"{result['valid']} valid geometries in EPSG:{result['srid']}."
        )

    @app.cli.command('create-user')
    @click.option('--name', prompt=True)
    @click.option('--email', prompt=True)
    @click.option('--role', type=click.Choice(ROLES), default='verifier', show_default=True)
    @click.option('--county', help='County name, e.g. Kiambu or Kisumu.')
    @click.option('--department', help='Department name, required for authorities.')
    @click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True)
    def create_user(name, email, role, county, department, password):
        """Create a user with an optional county and department assignment."""
        email = email.strip().lower()

        if User.query.filter_by(email=email).first():
            raise click.ClickException('That email already exists.')

        if len(password) < 8:
            raise click.ClickException('Password must be at least 8 characters.')

        county_record = None
        department_record = None

        if county:
            county_record = County.query.filter(
                db.func.lower(County.name) == county.strip().lower()
            ).first()

            if not county_record:
                raise click.ClickException(f'County "{county}" does not exist.')

        if role == 'authority':
            if not county_record:
                raise click.ClickException('Authorities must be assigned to a county.')

            if not department:
                raise click.ClickException('Authorities must be assigned to a department.')

        if department:
            if role != 'authority':
                raise click.ClickException('Only authorities can be assigned to departments.')

            department_record = Department.query.filter(
                Department.county_id == county_record.id,
                db.func.lower(Department.name) == department.strip().lower()
            ).first()

            if not department_record:
                raise click.ClickException(
                    f'Department "{department}" does not exist in {county_record.name}.'
                )

        user = User(
            name=name.strip(),
            email=email,
            role=role,
            county_id=county_record.id if county_record else None,
            department_id=department_record.id if department_record else None,
            password_hash=generate_password_hash(password),
        )

        db.session.add(user)
        db.session.commit()

        click.echo(f'Created {role} {email}.')
        click.echo(f'County: {county_record.name if county_record else "Global"}')
        click.echo(
            f'Department: {department_record.name if department_record else "None"}'
        )

    @app.cli.command('queue-status')
    def queue_status():
        """Show the queue mode and how many jobs are waiting, failed, and how many workers are running."""
        for key, value in queue_info().items():
            click.echo(f'{key}: {value}')

    @app.cli.command('process-reports')
    @click.argument('ids', nargs=-1, type=int)
    @click.option('--all', 'everything', is_flag=True, help='Queue every report (e.g. the seeded demo data).')
    def process_reports(ids, everything):
        """Queue the AI checks for existing reports (new reports are queued automatically)."""
        if everything:
            ids = [r.id for r in Report.query.filter(Report.duplicate_of.is_(None)).order_by(Report.id)]
        for report_id in ids:
            enqueue(process_new_report, report_id)
        click.echo(f'Queued {len(ids)} report(s).')

    @app.cli.command('export-approved-feedback')
    @click.option('--output', required=True, type=click.Path(dir_okay=False, writable=True))
    def export_approved_feedback(output):
        """Export approved, training-eligible image references and category labels as CSV."""
        rows = (ClassificationFeedback.query
                .join(Report, ClassificationFeedback.report_id == Report.id)
                .join(Category, ClassificationFeedback.selected_category_id == Category.id)
                .filter(ClassificationFeedback.review_status == 'approved',
                        ClassificationFeedback.training_eligible.is_(True))
                .order_by(ClassificationFeedback.id)
                .with_entities(
                    ClassificationFeedback.id,
                    ClassificationFeedback.report_id,
                    Report.photo_path,
                    Category.name,
                ).all())
        upload_root = app.config['UPLOAD_FOLDER']
        with open(output, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(('feedback_id', 'report_id', 'image_path', 'label'))
            for feedback_id, report_id, photo_path, label in rows:
                writer.writerow((
                    feedback_id,
                    report_id,
                    os.path.abspath(os.path.join(upload_root, photo_path)),
                    label,
                ))
        click.echo(f'Exported {len(rows)} approved image-label pair(s) to {output}.')
