from flask import jsonify
from werkzeug.exceptions import HTTPException
from .extensions import jwt


class ApiError(Exception):
    """Raise this anywhere; it becomes the error format from the API contract."""

    def __init__(self, code, message, status=400, details=None):
        self.code, self.message, self.status, self.details = code, message, status, details or {}


def _body(code, message, details=None):
    return {'error': {'code': code, 'message': message, 'details': details or {}}}


def register_errors(app):
    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify(_body(e.code, e.message, e.details)), e.status

    @app.errorhandler(HTTPException)
    def http_error(e):
        return jsonify(_body(e.name.lower().replace(' ', '_'), e.description)), e.code

    @app.errorhandler(Exception)
    def unexpected(e):
        app.logger.exception(e)
        return jsonify(_body('server_error', 'Something went wrong')), 500

    @jwt.unauthorized_loader
    def missing(reason):
        return jsonify(_body('unauthorized', reason)), 401

    @jwt.invalid_token_loader
    def invalid(reason):
        return jsonify(_body('unauthorized', reason)), 401

    @jwt.expired_token_loader
    def expired(header, payload):
        return jsonify(_body('token_expired', 'Please log in again')), 401
