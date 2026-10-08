"""Creates notification rows. Nothing here commits: the caller's commit saves them together
with the change that caused them, so you never get a notification for something that failed."""
from .extensions import db
from .models import Follow, Notification, Report

STATUS_TEXT = {
    'verified': 'has been verified',
    'rejected': 'was rejected',
    'assigned': 'has been assigned',
    'in_progress': 'is now in progress',
    'resolved': 'has been resolved',
}


def _label(report):
    return f'Report #{report.id} ({report.category.name})'


def _add(user_ids, report, message):
    for uid in user_ids:
        db.session.add(Notification(user_id=uid, report_id=report.id, message=message[:255]))


def _interested(report):
    """Everyone who cares about this case: its author, its followers, and the authors and
    followers of reports merged into it."""
    child_ids = [r.id for r in Report.query.filter_by(duplicate_of=report.id)]
    ids = [report.id] + child_ids
    people = {report.created_by}
    people |= {uid for (uid,) in db.session.query(Follow.user_id).filter(Follow.report_id.in_(ids))}
    if child_ids:
        people |= {uid for (uid,) in db.session.query(Report.created_by).filter(Report.id.in_(child_ids))}
    return people


def notify_status_change(report, new_status, actor, note=None):
    skip = {actor.id}  # nobody needs a message about their own action
    if new_status == 'assigned' and report.assigned_to:
        skip.add(report.assigned_to)  # the assignee gets their own, more specific message
        if report.assigned_to != actor.id:
            due = f' (due {report.due_date.isoformat()})' if report.due_date else ''
            _add([report.assigned_to], report, f'{_label(report)} was assigned to you{due}')
    tail = STATUS_TEXT[new_status]
    if new_status == 'rejected' and note:
        tail += f': {note}'
    _add(_interested(report) - skip, report, f'{_label(report)} {tail}')


def notify_reassigned(report, old_assignee_id, actor):
    if report.assigned_to and report.assigned_to != actor.id:
        due = f' (due {report.due_date.isoformat()})' if report.due_date else ''
        _add([report.assigned_to], report, f'{_label(report)} was assigned to you{due}')
    if old_assignee_id and old_assignee_id not in (actor.id, report.assigned_to):
        _add([old_assignee_id], report, f'{_label(report)} was reassigned to someone else')


def notify_merged(child, parent, actor):
    if child.created_by != actor.id:
        _add([child.created_by], parent,
             f'Your report #{child.id} ({child.category.name}) was combined with report #{parent.id}, '
             f'which covers the same issue. You will get updates on #{parent.id}.')
