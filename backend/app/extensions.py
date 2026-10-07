from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()


def include_object(obj, name, type_, reflected, compare_to):
    # Ignore tables PostGIS creates itself so migrations never try to drop them.
    return not (type_ == 'table' and name in ('spatial_ref_sys',))


migrate = Migrate(include_object=include_object)
