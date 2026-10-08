from .constants import TRANSITION_ROLES, TRANSITIONS, can_transition
from .errors import ApiError
from .extensions import db
from .models import StatusEvent


def change_status(report, new_status, user, note=None, via_assign=False, updates=None):
    """The one place where a report's status changes. Checks every rule, then saves the new
    status and a status_events row together. The assign endpoint (Task 14) calls this with
    via_assign=True; notifications (Task 15) will be added here too."""
    old = report.status

    if report.duplicate_of:
        raise ApiError('is_duplicate', f'This report is merged into #{report.duplicate_of}. '
                       'Update the main report instead.', 409)
    if new_status == 'assigned' and not via_assign:
        raise ApiError('use_assign_endpoint', 'Use POST /reports/{id}/assign to assign a report', 409)
    if not can_transition(old, new_status):
        raise ApiError('invalid_transition', f'A {old} report cannot move to {new_status}', 409,
                       {'from': old, 'to': new_status, 'allowed': sorted(TRANSITIONS[old])})
    if user.role not in TRANSITION_ROLES[(old, new_status)]:
        raise ApiError('forbidden', 'Your role cannot make this change', 403)
    if user.role == 'authority' and new_status in ('in_progress', 'resolved') \
            and report.assigned_to != user.id:
        raise ApiError('not_assignee', 'Only the assigned authority can update this report', 403)
    if new_status == 'rejected' and not note:
        raise ApiError('validation_error', 'Give a reason when rejecting a report', 422,
                       {'note': 'A reason is required'})

    for field, value in (updates or {}).items():  # extra fields saved in the same commit (e.g. assignee)
        setattr(report, field, value)
    db.session.add(StatusEvent(report_id=report.id, status=new_status, changed_by=user.id, note=note))
    report.status = new_status
    db.session.commit()
    return report


def reassign(report, user, updates, note):
    """Give an assigned-but-not-started report to someone else. The status stays 'assigned',
    and a new status event records the change."""
    if report.duplicate_of:
        raise ApiError('is_duplicate', f'This report is merged into #{report.duplicate_of}. '
                       'Update the main report instead.', 409)
    if report.status != 'assigned':
        raise ApiError('cannot_reassign', 'Only reports that are assigned but not started can be reassigned',
                       409, {'status': report.status})
    if user.role not in TRANSITION_ROLES[('verified', 'assigned')]:
        raise ApiError('forbidden', 'Your role cannot make this change', 403)
    for field, value in updates.items():
        setattr(report, field, value)
    db.session.add(StatusEvent(report_id=report.id, status='assigned', changed_by=user.id, note=note))
    db.session.commit()
    return report