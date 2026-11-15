import os
import uuid
from pathlib import Path, PurePosixPath

from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.core.exceptions import ResourceNotFoundError
from flask import current_app


# Check the file's first bytes (its "signature") instead of trusting the file name.
SIGNATURES = [(b'\xff\xd8\xff', 'jpg'), (b'\x89PNG\r\n\x1a\n', 'png')]

CONTENT_TYPES = {
    'jpg': 'image/jpeg',
    'png': 'image/png',
}


def photo_extension(file_storage):
    """Returns 'jpg' or 'png' if the upload really is that image type, otherwise None."""
    head = file_storage.stream.read(16)
    file_storage.stream.seek(0)

    for signature, ext in SIGNATURES:
        if head.startswith(signature):
            return ext

    return None


def _validate_photo_path(rel):
    """Reject unsafe or unexpected report photo paths."""
    if not isinstance(rel, str) or '\x00' in rel or '\\' in rel:
        raise ValueError('Invalid photo path.')

    parts = rel.split('/')

    if (
        len(parts) != 2
        or parts[0] != 'reports'
        or parts[1] in {'', '.', '..'}
        or PurePosixPath(rel).is_absolute()
    ):
        raise ValueError('Invalid photo path.')

    return rel


def _blob_client(rel):
    """Creates or reuses an authenticated Azure Blob client."""
    rel = _validate_photo_path(rel)

    client = current_app.extensions.get('civicpulse_blob_service')

    if client is None:
        account_url = current_app.config['AZURE_STORAGE_ACCOUNT_URL']
        credential = DefaultAzureCredential()
        client = BlobServiceClient(
            account_url=account_url,
            credential=credential,
        )
        current_app.extensions['civicpulse_blob_service'] = client

    return client.get_blob_client(
        container=current_app.config['AZURE_STORAGE_CONTAINER'],
        blob=rel,
    )


def save_photo(file_storage, ext):
    """Saves a photo locally or in Azure and returns its relative database path."""
    if ext not in CONTENT_TYPES:
        raise ValueError('Unsupported photo extension.')

    rel = f'reports/{uuid.uuid4().hex}.{ext}'

    if current_app.config['STORAGE_BACKEND'] == 'azure':
        blob = _blob_client(rel)

        file_storage.stream.seek(0)
        blob.upload_blob(
            file_storage.stream,
            overwrite=False,
            content_settings=ContentSettings(
                content_type=CONTENT_TYPES[ext]
            ),
        )

    else:
        full = os.path.join(current_app.config['UPLOAD_FOLDER'], rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        file_storage.save(full)

    return rel


def delete_photo(rel):
    """Deletes a photo from its configured storage backend."""
    rel = _validate_photo_path(rel)
    if current_app.config['STORAGE_BACKEND'] == 'azure':
        try:
            _blob_client(rel).delete_blob()
        except ResourceNotFoundError:
            pass

    else:
        try:
            os.remove(os.path.join(current_app.config['UPLOAD_FOLDER'], rel))
        except OSError:
            pass


def read_photo(rel):
    rel = _validate_photo_path(rel)
    """Returns (photo bytes, content type) from the configured storage backend."""
    if current_app.config['STORAGE_BACKEND'] == 'azure':
        blob = _blob_client(rel)
        properties = blob.get_blob_properties()
        content = blob.download_blob().readall()

        return content, properties.content_settings.content_type

    full = os.path.join(current_app.config['UPLOAD_FOLDER'], rel)

    content_type = CONTENT_TYPES.get(Path(rel).suffix.lstrip('.').lower())

    with open(full, 'rb') as photo:
        return photo.read(), content_type


def download_photo(rel, destination):
    rel = _validate_photo_path(rel)
    """Downloads a stored photo to a local filesystem path."""
    if current_app.config['STORAGE_BACKEND'] == 'azure':
        blob = _blob_client(rel)

        with open(destination, 'wb') as photo:
            photo.write(blob.download_blob().readall())

    else:
        full = os.path.join(current_app.config['UPLOAD_FOLDER'], rel)
        with open(full, 'rb') as source, open(destination, 'wb') as target:
            target.write(source.read())