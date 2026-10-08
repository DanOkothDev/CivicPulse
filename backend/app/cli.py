import click
from sqlalchemy import text

from werkzeug.security import generate_password_hash

from .constants import DEFAULT_CATEGORIES, ROLES
from .extensions import db
from .jobqueue import enqueue, queue_info
from .jobs import process_new_report
from .models import Area, Category, Report, User


def register_cli(app):
    @app.cli.command('init-db')
    def init_db():
        """Quick dev setup: enable PostGIS and create all tables."""
        db.session.execute(text('CREATE EXTENSION IF NOT EXISTS postgis'))
        db.session.commit()
        db.create_all()
        click.echo('Tables created.')

    @app.cli.command('seed')
    def seed():
        """Insert the default categories (safe to run twice)."""
        for name, icon in DEFAULT_CATEGORIES:
            if not Category.query.filter_by(name=name).first():
                db.session.add(Category(name=name, icon=icon))
        if not Area.query.first():
            db.session.add(Area(name='Default area'))
        db.session.commit()
        click.echo('Seeded categories and a default area.')

    @app.cli.command('create-user')
    @click.option('--name', prompt=True)
    @click.option('--email', prompt=True)
    @click.option('--role', type=click.Choice(ROLES), default='verifier', show_default=True)
    @click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True)
    def create_user(name, email, role, password):
        """Create a user with any role (for the first admin, verifier or authority)."""
        email = email.strip().lower()
        if User.query.filter_by(email=email).first():
            raise click.ClickException('That email already exists.')
        if len(password) < 8:
            raise click.ClickException('Password must be at least 8 characters.')
        db.session.add(User(name=name.strip(), email=email, role=role,
                            password_hash=generate_password_hash(password)))
        db.session.commit()
        click.echo(f'Created {role} {email}.')

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