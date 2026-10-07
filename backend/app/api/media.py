from flask import Blueprint, current_app, send_from_directory

bp = Blueprint('media', __name__)


@bp.get('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serves saved photos. send_from_directory blocks tricks like ../../secret."""
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
