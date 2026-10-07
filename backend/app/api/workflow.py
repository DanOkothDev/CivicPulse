from flask import Blueprint, jsonify, request

from ..auth_utils import current_user, login_required, roles_required
from ..constants import STATUSES
from ..errors import ApiError
from ..extensions import db
from ..models import Report, StatusEvent
from ..status_flow import change_status
from .reports import _one

bp = Blueprint('workflow', __name__)


def _get_report(report_id, lock=False):
    report = db.session.get(Report, report_id, with_for_update=lock)
    if report is None:
        raise ApiError('not_found', 'Report not found', 404)
    return report


@bp.patch('/reports/<int:report_id>/status')
@roles_required('verifier', 'authority', 'admin')
def update_status(report_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON body', 422)
    new_status = data.get('status')
    note = str(data.get('note') or '').strip() or None
    if new_status not in STATUSES:
        raise ApiError('validation_error', 'Unknown status', 422, {'allowed': list(STATUSES)})
    if note and len(note) > 500:
        raise ApiError('validation_error', 'Keep the note under 500 characters', 422)

    report = _get_report(report_id, lock=True)  # lock the row so two people can't change it at once
    user = current_user()
    change_status(report, new_status, user, note)
    return jsonify(_one(report_id, user.id))


@bp.get('/reports/<int:report_id>/history')
@login_required
def history(report_id):
    _get_report(report_id)
    events = (StatusEvent.query.filter_by(report_id=report_id)
              .order_by(StatusEvent.created_at, StatusEvent.id).all())
    return jsonify([{'id': e.id, 'report_id': e.report_id, 'status': e.status,
                     'changed_by': e.changed_by, 'note': e.note,
                     'created_at': e.created_at.isoformat()} for e in events])
