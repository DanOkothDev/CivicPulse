from flask import Blueprint, current_app, jsonify, send_file
from io import BytesIO

from ..storage import read_photo
from azure.core.exceptions import ResourceNotFoundError

bp = Blueprint('media', __name__)


@bp.get('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serves saved photos from local storage or Azure Blob Storage."""
    try:
        content, content_type = read_photo(filename)
    except (FileNotFoundError, ResourceNotFoundError):
        return jsonify({'error': 'Photo not found.'}), 404
    except ValueError:
        return jsonify({'error': 'Invalid photo path.'}), 400

    if not content_type:
        current_app.logger.error('Missing content type for photo: %s', filename)
        return jsonify({'error': 'Photo content type unavailable.'}), 500

    return send_file(
        BytesIO(content),
        mimetype=content_type,
        max_age=3600,
    )