from flask import Blueprint, jsonify, request

from ..auth_utils import current_user, roles_required
from ..duplicate_service import merge_reports, unmerge_report
from ..errors import ApiError
from ..extensions import db
from ..models import DuplicateSuggestion, Report
from .reports import _one

bp = Blueprint('duplicates', __name__)


@bp.get('/reports/<int:report_id>/duplicates')
@roles_required('verifier', 'admin')
def suggestions(report_id):
    if db.session.get(Report, report_id) is None:
        raise ApiError('not_found', 'Report not found', 404)
    rows = (DuplicateSuggestion.query.filter_by(report_id=report_id)
            .order_by(DuplicateSuggestion.score.desc(), DuplicateSuggestion.id).all())
    return jsonify([{'report_id': s.candidate_id, 'score': s.score, 'reasons': s.reasons} for s in rows])


@bp.post('/reports/<int:report_id>/merge')
@roles_required('verifier', 'admin')
def merge(report_id):
    data = request.get_json(silent=True)
    parent_id = data.get('parent_id') if isinstance(data, dict) else None
    if not isinstance(parent_id, int) or isinstance(parent_id, bool):
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422,
                       {'parent_id': 'Send the id of the main report'})
    user = current_user()
    merge_reports(report_id, parent_id, user)
    return jsonify(_one(parent_id, user.id))


@bp.post('/reports/<int:report_id>/unmerge')
@roles_required('verifier', 'admin')
def unmerge(report_id):
    user = current_user()
    unmerge_report(report_id, user)
    return jsonify(_one(report_id, user.id))
