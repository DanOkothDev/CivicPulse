from datetime import date

from flask import Blueprint, jsonify, request

from ..auth_utils import current_user, login_required, roles_required
from ..constants import STATUSES
from ..errors import ApiError
from ..extensions import db
from ..models import Report, StatusEvent, User
from ..status_flow import change_status, reassign
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


@bp.post('/reports/<int:report_id>/assign')
@roles_required('verifier', 'authority', 'admin')
def assign(report_id):
    report = _get_report(report_id, lock=True)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON body', 422)

    errors, assignee, due = {}, None, None
    assignee_id = data.get('assignee_id')
    if not isinstance(assignee_id, int) or isinstance(assignee_id, bool):
        errors['assignee_id'] = 'Choose an authority user'
    else:
        assignee = db.session.get(User, assignee_id)
        if assignee is None or assignee.role != 'authority':
            errors['assignee_id'] = 'Choose an authority user'
    if data.get('due_date') is not None:
        try:
            due = date.fromisoformat(data['due_date'])
            if due < date.today():
                errors['due_date'] = 'Pick today or a later date'
        except (TypeError, ValueError):
            errors['due_date'] = 'Use the format YYYY-MM-DD'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)

    user = current_user()
    updates = {'assigned_to': assignee.id, 'due_date': due}
    due_text = f', due {due.isoformat()}' if due else ''
    if report.status in ('assigned', 'in_progress', 'resolved'):  # already had an assignee
        reassign(report, user, updates, f'Reassigned to {assignee.name}{due_text}')
    else:
        change_status(report, 'assigned', user, f'Assigned to {assignee.name}{due_text}',
                      via_assign=True, updates=updates)
    return jsonify(_one(report_id, user.id))