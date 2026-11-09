import math
import os
import tempfile

from flask import Blueprint, current_app, jsonify, request, url_for
from sqlalchemy.exc import IntegrityError

from ..auth_utils import current_user, login_required, roles_required, user_can_access_report
from ..constants import CLASSIFIER_CATEGORY_NAMES
from ..errors import ApiError
from ..extensions import db
from ..jobs import load_hook
from ..models import Category, ClassificationFeedback, Report
from ..storage import photo_extension
from .reports import _feedback_json

bp = Blueprint('classification_feedback', __name__)


def _normalized(value):
    return ' '.join(str(value).lower().replace('_', ' ').replace('-', ' ').split())


def _category_by_name(name):
    normalized = _normalized(name)
    return next((category for category in Category.query.all()
                 if _normalized(category.name) == normalized), None)


def _feedback_detail(feedback):
    report = feedback.report
    result = _feedback_json(feedback)
    result.update({
        'report_id': report.id,
        'image_url': url_for('media.uploaded_file', filename=report.photo_path, _external=True),
        'predicted_class': feedback.predicted_class,
        'predicted_category': (
            {'id': feedback.predicted_category.id, 'name': feedback.predicted_category.name}
            if feedback.predicted_category else None),
        'selected_category': {
            'id': feedback.selected_category.id,
            'name': feedback.selected_category.name,
        },
        'submitted_by': feedback.submitted_by,
        'reviewed_by': feedback.reviewed_by,
        'reviewed_at': feedback.reviewed_at.isoformat() if feedback.reviewed_at else None,
    })
    return result


@bp.post('/reports/classify')
@login_required
def classify_photo():
    photo = request.files.get('photo')
    if photo is None or not photo.filename:
        raise ApiError('validation_error', 'A photo is required', 422, {'photo': 'A photo is required'})
    extension = photo_extension(photo)
    if extension is None:
        raise ApiError('validation_error', 'Upload a JPEG or PNG image', 422,
                       {'photo': 'Upload a JPEG or PNG image'})

    temp_path = None
    try:
        classify = load_hook('AI_CLASSIFIER')
        if classify is None:
            return jsonify(available=False, supported=False)
        with tempfile.NamedTemporaryFile(suffix=f'.{extension}', delete=False) as temporary:
            temp_path = temporary.name
        photo.save(temp_path)
        result = classify(temp_path)
    except Exception as error:
        current_app.logger.exception('Photo classification failed')
        raise ApiError('classification_unavailable', 'The photo could not be classified', 503) from error
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    if not isinstance(result, dict):
        raise ApiError('classification_unavailable', 'The classifier returned an invalid result', 503)
    try:
        confidence = float(result['confidence'])
    except (KeyError, TypeError, ValueError):
        raise ApiError('classification_unavailable', 'The classifier returned an invalid result', 503)
    if not math.isfinite(confidence) or not 0 <= confidence <= 1:
        raise ApiError('classification_unavailable', 'The classifier returned an invalid result', 503)

    class_name = str(result.get('class_name') or '').strip()
    if not class_name:
        raise ApiError('classification_unavailable', 'The classifier returned an invalid result', 503)
    canonical_name = CLASSIFIER_CATEGORY_NAMES.get(class_name.lower())
    category = _category_by_name(canonical_name) if canonical_name else None
    return jsonify(
        available=True,
        supported=category is not None,
        category={'id': category.id, 'name': category.name} if category else None,
        confidence=confidence,
        class_name=class_name[:100],
    )


@bp.post('/reports/<int:report_id>/classification-feedback')
@login_required
def submit_feedback(report_id):
    report = db.session.get(Report, report_id, with_for_update=True)
    if report is None:
        raise ApiError('not_found', 'Report not found', 404)
    user = current_user()
    if report.created_by != user.id:
        raise ApiError('forbidden', 'You can only submit feedback for your own report', 403)
    if report.classification_feedback is not None:
        raise ApiError('duplicate_feedback', 'Feedback has already been submitted for this report', 409)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON body', 422)
    predicted_class = data.get('predicted_class')
    confidence = data.get('confidence')
    predicted_id = data.get('predicted_category_id')
    selected_id = data.get('selected_category_id')
    accepted = data.get('accepted')
    errors = {}
    if not isinstance(predicted_class, str) or not predicted_class.strip() or len(predicted_class) > 100:
        errors['predicted_class'] = 'A valid predicted class is required'
    try:
        confidence = float(confidence)
        if not math.isfinite(confidence) or not 0 <= confidence <= 1:
            raise ValueError()
    except (TypeError, ValueError):
        errors['confidence'] = 'Confidence must be a number from 0 to 1'
    if not isinstance(accepted, bool):
        errors['accepted'] = 'Choose whether the suggestion was correct'
    if isinstance(selected_id, bool) or not isinstance(selected_id, int):
        selected_category = None
        errors['selected_category_id'] = 'Choose a valid category'
    else:
        selected_category = db.session.get(Category, selected_id)
        if selected_category is None:
            errors['selected_category_id'] = 'Choose a valid category'
    if predicted_id is not None and (isinstance(predicted_id, bool) or not isinstance(predicted_id, int)):
        predicted_category = None
        errors['predicted_category_id'] = 'The predicted category is invalid'
    else:
        predicted_category = db.session.get(Category, predicted_id) if predicted_id is not None else None
        if predicted_id is not None and predicted_category is None:
            errors['predicted_category_id'] = 'The predicted category is invalid'
    if isinstance(accepted, bool) and selected_category is not None:
        is_same_category = predicted_category is not None and predicted_category.id == selected_category.id
        if accepted != is_same_category:
            errors['accepted'] = 'Feedback must match the selected category'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)

    feedback = ClassificationFeedback(
        report_id=report.id,
        image_path=report.photo_path,
        predicted_class=predicted_class.strip(),
        predicted_category_id=predicted_category.id if predicted_category else None,
        confidence=confidence,
        selected_category_id=selected_category.id,
        accepted=accepted,
        submitted_by=user.id,
        review_status='pending',
        training_eligible=False,
    )
    db.session.add(feedback)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError('duplicate_feedback', 'Feedback has already been submitted for this report', 409)
    return jsonify(_feedback_detail(feedback)), 201


@bp.get('/classification-feedback')
@roles_required('verifier', 'admin')
def list_feedback():
    status = request.args.get('status', 'pending')
    if status not in ('pending', 'approved', 'rejected'):
        raise ApiError('validation_error', 'Unknown feedback review status', 422)
    user = current_user()
    query = ClassificationFeedback.query.join(Report)
    if user.role == 'verifier':
        if user.county_id is None:
            query = query.filter(Report.id == -1)
        else:
            query = query.filter(Report.county_id == user.county_id)
    elif user.county_id is not None:
        query = query.filter(Report.county_id == user.county_id)
    feedback = (query.filter(ClassificationFeedback.review_status == status)
                .order_by(ClassificationFeedback.created_at, ClassificationFeedback.id)
                .all())
    return jsonify([_feedback_detail(item) for item in feedback])


@bp.patch('/classification-feedback/<int:feedback_id>')
@roles_required('verifier', 'admin')
def review_feedback(feedback_id):
    feedback = db.session.get(ClassificationFeedback, feedback_id, with_for_update=True)
    if feedback is None:
        raise ApiError('not_found', 'Feedback not found', 404)
    if not user_can_access_report(current_user(), feedback.report):
        raise ApiError('forbidden', 'You cannot access that report', 403)
    if feedback.review_status != 'pending':
        raise ApiError('feedback_already_reviewed', 'Feedback has already been reviewed', 409)
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or data.get('review_status') not in ('approved', 'rejected'):
        raise ApiError('validation_error', 'Choose approved or rejected', 422, {
            'review_status': 'Choose approved or rejected',
        })
    feedback.review_status = data['review_status']
    feedback.training_eligible = feedback.review_status == 'approved'
    feedback.reviewed_by = current_user().id
    feedback.reviewed_at = db.func.now()
    db.session.commit()
    return jsonify(_feedback_detail(feedback))
