import os
import uuid

from flask import current_app

# Check the file's first bytes (its "signature") instead of trusting the file name.
SIGNATURES = [(b'\xff\xd8\xff', 'jpg'), (b'\x89PNG\r\n\x1a\n', 'png')]


def photo_extension(file_storage):
    """Returns 'jpg' or 'png' if the upload really is that image type, otherwise None."""
    head = file_storage.stream.read(16)
    file_storage.stream.seek(0)
    for signature, ext in SIGNATURES:
        if head.startswith(signature):
            return ext
    return None


def save_photo(file_storage, ext):
    """Saves under a random name (never the user's file name). Returns the path stored in the database."""
    rel = f'reports/{uuid.uuid4().hex}.{ext}'
    full = os.path.join(current_app.config['UPLOAD_FOLDER'], rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    file_storage.save(full)
    return rel


def delete_photo(rel):
    try:
        os.remove(os.path.join(current_app.config['UPLOAD_FOLDER'], rel))
    except OSError:
        pass
