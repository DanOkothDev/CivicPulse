from flask import Blueprint, jsonify, request

from ..auth_utils import current_user, roles_required, user_can_access_report
from ..duplicate_service import merge_reports, unmerge_report
from ..errors import ApiError
from ..extensions import db
from ..models import DuplicateSuggestion, Report
from .reports import _one

bp = Blueprint('duplicates', __name__)


@bp.get('/reports/<int:report_id>/duplicates')
@roles_required('verifier', 'admin')
def suggestions(report_id):
    user = current_user()
    report = db.session.get(Report, report_id)
    if report is None:
        raise ApiError('not_found', 'Report not found', 404)
    if not user_can_access_report(user, report):
        raise ApiError('forbidden', 'You cannot access that report', 403)
    rows = (DuplicateSuggestion.query.filter_by(report_id=report_id)
            .order_by(DuplicateSuggestion.score.desc(), DuplicateSuggestion.id).all())
    return jsonify([
        {'report_id': suggestion.candidate_id, 'score': suggestion.score, 'reasons': suggestion.reasons}
        for suggestion in rows
        if (candidate := db.session.get(Report, suggestion.candidate_id)) is not None
        and user_can_access_report(user, candidate)
    ])


@bp.post('/reports/<int:report_id>/merge')
@roles_required('verifier', 'admin')
def merge(report_id):
    data = request.get_json(silent=True)
    parent_id = data.get('parent_id') if isinstance(data, dict) else None
    if not isinstance(parent_id, int) or isinstance(parent_id, bool):
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422,
                       {'parent_id': 'Send the id of the main report'})
    user = current_user()
    child = db.session.get(Report, report_id)
    parent = db.session.get(Report, parent_id)
    if child is not None and not user_can_access_report(user, child):
        raise ApiError('forbidden', 'You cannot access that report', 403)
    if parent is not None and not user_can_access_report(user, parent):
        raise ApiError('forbidden', 'You cannot access that report', 403)
    merge_reports(report_id, parent_id, user)
    return jsonify(_one(parent_id, user.id))


@bp.post('/reports/<int:report_id>/unmerge')
@roles_required('verifier', 'admin')
def unmerge(report_id):
    user = current_user()
    report = db.session.get(Report, report_id)
    if report is not None and not user_can_access_report(user, report):
        raise ApiError('forbidden', 'You cannot access that report', 403)
    if report is not None and report.duplicate_of is not None:
        parent = db.session.get(Report, report.duplicate_of)
        if parent is not None and not user_can_access_report(user, parent):
            raise ApiError('forbidden', 'You cannot access that report', 403)
    unmerge_report(report_id, user)
    return jsonify(_one(report_id, user.id))
