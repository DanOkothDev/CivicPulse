from .errors import ApiError
from .extensions import db
from .models import DuplicateSuggestion, Follow, Report, StatusEvent

OPEN_STATUSES = ('reported', 'verified', 'assigned', 'in_progress')  # a report can absorb duplicates
MERGEABLE_STATUSES = ('reported', 'verified')                         # a report can be absorbed


def save_suggestions(report_id, suggestions):
    """Store the output of find_duplicates() for one report, replacing older suggestions.
    `suggestions` is a list like [{'report_id': 42, 'score': 0.83, 'reasons': {...}}].
    The AI worker (Task 20) calls this. Returns how many were saved."""
    best = {}
    for s in suggestions:
        score = float(s['score'])
        if not 0 <= score <= 1:
            raise ValueError(f'score must be between 0 and 1, got {score}')
        cid = s['report_id']
        if cid != report_id and (cid not in best or score > best[cid]['score']):
            best[cid] = {'score': score, 'reasons': s.get('reasons')}
    known = {r.id for r in Report.query.filter(Report.id.in_(list(best))).all()} if best else set()

    DuplicateSuggestion.query.filter_by(report_id=report_id).delete(synchronize_session=False)
    for cid, s in best.items():
        if cid in known:  # silently skip candidates that no longer exist
            db.session.add(DuplicateSuggestion(report_id=report_id, candidate_id=cid,
                                               score=s['score'], reasons=s['reasons']))
    db.session.commit()
    return len(known)


def recount(parent):
    """report_count = the report itself + every report merged into it. Always recomputed,
    so it can never drift out of sync."""
    db.session.flush()
    parent.report_count = 1 + Report.query.filter_by(duplicate_of=parent.id).count()


def merge_reports(child_id, parent_id, user):
    """Fold `child` into `parent`. Returns the parent."""
    if child_id == parent_id:
        raise ApiError('self_merge', 'A report cannot be merged into itself', 409)
    rows = {r.id: r for r in Report.query.filter(Report.id.in_([child_id, parent_id]))
            .order_by(Report.id).with_for_update().all()}  # same lock order every time
    child, parent = rows.get(child_id), rows.get(parent_id)
    if child is None:
        raise ApiError('not_found', 'Report not found', 404)
    if parent is None:
        raise ApiError('validation_error', 'Unknown report', 422, {'parent_id': 'Unknown report'})
    if child.duplicate_of:
        raise ApiError('already_merged', f'This report is already merged into #{child.duplicate_of}', 409)
    if parent.duplicate_of:
        raise ApiError('parent_is_duplicate', f'#{parent.id} is itself merged into #{parent.duplicate_of}. '
                       'Merge into that report instead.', 409, {'merged_into': parent.duplicate_of})
    if child.status not in MERGEABLE_STATUSES:
        raise ApiError('child_not_mergeable', 'Only reported or verified reports can be merged', 409,
                       {'status': child.status})
    if parent.status not in OPEN_STATUSES:
        raise ApiError('parent_not_open', 'Reports cannot be merged into a resolved or rejected report. '
                       'Keep it as a new case instead.', 409, {'status': parent.status})

    # Reports already merged into the child move up to the parent, so merging stays one level deep.
    Report.query.filter_by(duplicate_of=child.id).update({'duplicate_of': parent.id}, synchronize_session=False)
    suggestion = DuplicateSuggestion.query.filter_by(report_id=child.id, candidate_id=parent.id).first()
    child.duplicate_score = suggestion.score if suggestion else None
    child.duplicate_of = parent.id

    # Everyone following the merged report (and its author) now follows the main one.
    watchers = {f.user_id for f in Follow.query.filter_by(report_id=child.id)} | {child.created_by}
    already = {f.user_id for f in Follow.query.filter_by(report_id=parent.id)}
    for uid in watchers - already:
        db.session.add(Follow(user_id=uid, report_id=parent.id))

    db.session.add(StatusEvent(report_id=child.id, status=child.status, changed_by=user.id,
                               note=f'Merged into #{parent.id}'))
    recount(parent)
    db.session.commit()
    return parent


def unmerge_report(report_id, user):
    """Split a wrongly merged report back out into its own case. Returns the report."""
    report = Report.query.filter_by(id=report_id).with_for_update().first()
    if report is None:
        raise ApiError('not_found', 'Report not found', 404)
    if not report.duplicate_of:
        raise ApiError('not_merged', 'This report is not merged into another one', 409)
    parent = db.session.get(Report, report.duplicate_of)
    old_parent = report.duplicate_of
    report.duplicate_of = None
    report.duplicate_score = None
    db.session.add(StatusEvent(report_id=report.id, status=report.status, changed_by=user.id,
                               note=f'Unmerged from #{old_parent}'))
    recount(parent)
    db.session.commit()
    return report
