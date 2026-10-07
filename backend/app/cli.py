import click
from sqlalchemy import text

from .constants import DEFAULT_CATEGORIES
from .extensions import db
from .models import Area, Category


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
