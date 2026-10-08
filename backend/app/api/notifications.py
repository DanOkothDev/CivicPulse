from flask import Blueprint, jsonify, request

from ..auth_utils import current_user, login_required
from ..errors import ApiError
from ..extensions import db
from ..models import Notification

bp = Blueprint('notifications', __name__)


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _mine():
    return Notification.query.filter_by(user_id=current_user().id)


@bp.get('/notifications')
@login_required
def list_notifications():
    q = _mine()
    if (request.args.get('unread') or '').lower() in ('1', 'true', 'yes'):
        q = q.filter(Notification.read.is_(False))
    page, per_page = _int(request.args.get('page', 1)), _int(request.args.get('per_page', 50))
    if page is None or per_page is None:
        raise ApiError('validation_error', 'page and per_page must be numbers', 422)
    page, per_page = max(page, 1), min(max(per_page, 1), 200)
    rows = (q.order_by(Notification.created_at.desc(), Notification.id.desc())
            .offset((page - 1) * per_page).limit(per_page).all())
    return jsonify([{'id': n.id, 'report_id': n.report_id, 'message': n.message, 'read': n.read,
                     'created_at': n.created_at.isoformat()} for n in rows])


@bp.get('/notifications/unread-count')
@login_required
def unread_count():
    return jsonify(count=_mine().filter(Notification.read.is_(False)).count())


@bp.post('/notifications/read-all')
@login_required
def read_all():
    _mine().filter(Notification.read.is_(False)).update({'read': True}, synchronize_session=False)
    db.session.commit()
    return '', 204


@bp.post('/notifications/<int:notification_id>/read')
@login_required
def mark_read(notification_id):
    n = _mine().filter(Notification.id == notification_id).first()  # someone else's looks like "not found"
    if n is None:
        raise ApiError('not_found', 'Notification not found', 404)
    n.read = True
    db.session.commit()
    return '', 204
