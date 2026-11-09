import io

import pytest

from app.extensions import db
from app.models import ClassificationFeedback, Report

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


def _headers(client, make_user, role='resident'):
    email, password = make_user(role)
    token = client.post('/api/v1/auth/login', json={
        'email': email, 'password': password,
    }).json['token']
    return {'Authorization': f'Bearer {token}'}


def _category_ids(client):
    return {item['name']: item['id'] for item in client.get('/api/v1/categories').json}


def _submit_report(client, headers, category_id):
    return client.post('/api/v1/reports', data={
        'category_id': str(category_id),
        'lat': '10',
        'lon': '10',
        'description': 'A test issue',
        'photo': (io.BytesIO(JPEG), 'issue.jpg'),
    }, headers=headers, content_type='multipart/form-data')


def _feedback(client, headers, report_id, predicted_id, selected_id, accepted=False):
    return client.post(f'/api/v1/reports/{report_id}/classification-feedback', json={
        'predicted_class': 'pothole',
        'predicted_category_id': predicted_id,
        'confidence': 0.78,
        'selected_category_id': selected_id,
        'accepted': accepted,
    }, headers=headers)


def test_classification_returns_category_name_not_model_index(client, app, make_user, monkeypatch):
    headers = _headers(client, make_user)
    from app.api import classification_feedback

    monkeypatch.setattr(
        classification_feedback, 'load_hook',
        lambda key: lambda path: {
            'class_name': 'pothole', 'category': 'Pothole', 'confidence': 0.78,
        },
    )
    response = client.post('/api/v1/reports/classify', data={
        'photo': (io.BytesIO(JPEG), 'issue.jpg'),
    }, headers=headers, content_type='multipart/form-data')
    assert response.status_code == 200
    assert response.json['category']['name'] == 'Pothole'
    assert response.json['confidence'] == 0.78
    assert response.json['supported'] is True


def test_unsupported_classifier_category_is_not_fabricated(client, make_user, monkeypatch):
    headers = _headers(client, make_user)
    from app.api import classification_feedback

    monkeypatch.setattr(
        classification_feedback, 'load_hook',
        lambda key: lambda path: {
            'class_name': 'future_facility_type', 'category': 'Drainage', 'confidence': 0.94,
        },
    )
    response = client.post('/api/v1/reports/classify', data={
        'photo': (io.BytesIO(JPEG), 'issue.jpg'),
    }, headers=headers, content_type='multipart/form-data')
    assert response.status_code == 200
    assert response.json['supported'] is False
    assert response.json['category'] is None


def test_missing_prediction_does_not_block_manual_report(client, make_user):
    headers = _headers(client, make_user)
    category_id = _category_ids(client)['Drainage']
    response = _submit_report(client, headers, category_id)
    assert response.status_code == 201
    assert response.json['category']['name'] == 'Drainage'


def test_unconfigured_classifier_returns_manual_selection_state(client, make_user):
    headers = _headers(client, make_user)
    response = client.post('/api/v1/reports/classify', data={
        'photo': (io.BytesIO(JPEG), 'issue.jpg'),
    }, headers=headers, content_type='multipart/form-data')
    assert response.status_code == 200
    assert response.json == {'available': False, 'supported': False}


def test_feedback_captures_correction_and_reuses_report_image(client, app, make_user):
    headers = _headers(client, make_user)
    categories = _category_ids(client)
    report = _submit_report(client, headers, categories['Pothole']).json
    response = _feedback(
        client, headers, report['id'], categories['Pothole'], categories['Drainage']
    )
    assert response.status_code == 201
    assert response.json['selected_category']['name'] == 'Drainage'
    assert response.json['review_status'] == 'pending'
    assert response.json['training_eligible'] is False
    with app.app_context():
        record = ClassificationFeedback.query.filter_by(report_id=report['id']).one()
        stored_report = db.session.get(Report, report['id'])
        assert record.image_path == stored_report.photo_path
        assert record.accepted is False
        assert record.submitted_by == stored_report.created_by


def test_accepted_feedback_and_duplicate_prevention(client, make_user):
    headers = _headers(client, make_user)
    category_id = _category_ids(client)['Pothole']
    report = _submit_report(client, headers, category_id).json
    response = _feedback(client, headers, report['id'], category_id, category_id, accepted=True)
    assert response.status_code == 201
    duplicate = _feedback(client, headers, report['id'], category_id, category_id, accepted=True)
    assert duplicate.status_code == 409


def test_invalid_category_and_inconsistent_acceptance_rejected(client, make_user):
    headers = _headers(client, make_user)
    category_id = _category_ids(client)['Pothole']
    report = _submit_report(client, headers, category_id).json
    assert _feedback(client, headers, report['id'], category_id, 999).status_code == 422
    assert _feedback(client, headers, report['id'], category_id, category_id).status_code == 422


def test_feedback_is_owner_only_and_review_requires_authorized_role(client, make_user):
    resident = _headers(client, make_user)
    other_resident = _headers(client, make_user)
    category_id = _category_ids(client)['Pothole']
    report = _submit_report(client, resident, category_id).json
    assert _feedback(
        client, other_resident, report['id'], category_id, category_id, accepted=True
    ).status_code == 403
    assert client.get('/api/v1/classification-feedback', headers=resident).status_code == 403
    assert client.get('/api/v1/classification-feedback').status_code == 401


@pytest.mark.parametrize(('review_status', 'eligible'), [
    ('approved', True),
    ('rejected', False),
])
def test_verifier_can_approve_or_reject_feedback(
    client, app, make_user, review_status, eligible
):
    resident = _headers(client, make_user)
    verifier = _headers(client, make_user, 'verifier')
    category_id = _category_ids(client)['Pothole']
    report = _submit_report(client, resident, category_id).json
    created = _feedback(
        client, resident, report['id'], category_id, category_id, accepted=True
    ).json

    queue = client.get('/api/v1/classification-feedback', headers=verifier)
    assert queue.status_code == 200
    assert queue.json[0]['report_id'] == report['id']
    reviewed = client.patch(
        f"/api/v1/classification-feedback/{created['id']}",
        json={'review_status': review_status},
        headers=verifier,
    )
    assert reviewed.status_code == 200
    assert reviewed.json['review_status'] == review_status
    assert reviewed.json['training_eligible'] is eligible
    assert client.patch(
        f"/api/v1/classification-feedback/{created['id']}",
        json={'review_status': 'approved'},
        headers=verifier,
    ).status_code == 409


def test_export_contains_only_approved_image_label_pairs(client, app, make_user, tmp_path):
    resident = _headers(client, make_user)
    verifier = _headers(client, make_user, 'verifier')
    categories = _category_ids(client)
    report = _submit_report(client, resident, categories['Pothole']).json
    feedback = _feedback(
        client, resident, report['id'], categories['Pothole'], categories['Drainage']
    ).json
    assert client.patch(
        f"/api/v1/classification-feedback/{feedback['id']}",
        json={'review_status': 'approved'},
        headers=verifier,
    ).status_code == 200
    output = tmp_path / 'approved.csv'
    result = app.test_cli_runner().invoke(
        args=['export-approved-feedback', '--output', str(output)]
    )
    assert result.exit_code == 0, result.output
    exported = output.read_text(encoding='utf-8')
    assert 'Drainage' in exported
    assert str(report['id']) in exported
    assert 'feedback_id,report_id,image_path,label' in exported


def test_classifier_failure_returns_error_but_report_submission_remains_available(
    client, make_user, monkeypatch
):
    headers = _headers(client, make_user)
    from app.api import classification_feedback

    def fail(_path):
        raise RuntimeError('model unavailable')

    monkeypatch.setattr(classification_feedback, 'load_hook', lambda key: fail)
    prediction = client.post('/api/v1/reports/classify', data={
        'photo': (io.BytesIO(JPEG), 'issue.jpg'),
    }, headers=headers, content_type='multipart/form-data')
    assert prediction.status_code == 503
    category_id = _category_ids(client)['Pothole']
    assert _submit_report(client, headers, category_id).status_code == 201
