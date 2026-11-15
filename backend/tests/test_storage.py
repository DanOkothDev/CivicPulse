import io
from types import SimpleNamespace

import pytest
from werkzeug.datastructures import FileStorage

from app import storage


JPEG = b'\xff\xd8\xff' + b'fake-jpeg-data'


def make_photo():
    return FileStorage(
        stream=io.BytesIO(JPEG),
        filename='test.jpg',
        content_type='image/jpeg',
    )


def test_local_photo_lifecycle(app):
    with app.app_context():
        photo = make_photo()
        ext = storage.photo_extension(photo)

        assert ext == 'jpg'

        rel = storage.save_photo(photo, ext)

        assert rel.startswith('reports/')
        assert rel.endswith('.jpg')

        content, content_type = storage.read_photo(rel)

        assert content == JPEG
        assert content_type == 'image/jpeg'

        destination = app.config['UPLOAD_FOLDER'] + '/downloaded.jpg'
        storage.download_photo(rel, destination)

        with open(destination, 'rb') as downloaded:
            assert downloaded.read() == JPEG

        storage.delete_photo(rel)

        with pytest.raises(FileNotFoundError):
            storage.read_photo(rel)


@pytest.mark.parametrize(
    'path',
    [
        '../secret.txt',
        'reports/../../secret.txt',
        'C:\\Windows\\secret.txt',
        '/etc/passwd',
        'reports/',
    ],
)
def test_invalid_photo_paths_are_rejected(app, path):
    with app.app_context():
        with pytest.raises(ValueError):
            storage.read_photo(path)


def test_azure_photo_lifecycle(app, tmp_path, monkeypatch):
    blobs = {}

    class FakeBlob:
        def __init__(self, name):
            self.name = name

        def upload_blob(self, stream, overwrite, content_settings):
            blobs[self.name] = {
                'content': stream.read(),
                'content_type': content_settings.content_type,
            }

        def get_blob_properties(self):
            if self.name not in blobs:
                from azure.core.exceptions import ResourceNotFoundError
                raise ResourceNotFoundError('Blob not found')

            return SimpleNamespace(
                content_settings=SimpleNamespace(
                    content_type=blobs[self.name]['content_type']
                )
            )

        def download_blob(self):
            if self.name not in blobs:
                from azure.core.exceptions import ResourceNotFoundError
                raise ResourceNotFoundError('Blob not found')

            content = blobs[self.name]['content']

            return SimpleNamespace(readall=lambda: content)

        def delete_blob(self):
            if self.name not in blobs:
                from azure.core.exceptions import ResourceNotFoundError
                raise ResourceNotFoundError('Blob not found')

            del blobs[self.name]

    class FakeBlobService:
        def get_blob_client(self, container, blob):
            assert container == 'civicpulse-photos'
            return FakeBlob(blob)

    monkeypatch.setattr(
        storage,
        'DefaultAzureCredential',
        lambda: object(),
    )
    monkeypatch.setattr(
        storage,
        'BlobServiceClient',
        lambda account_url, credential: FakeBlobService(),
    )

    with app.app_context():
        app.config.update({
            'STORAGE_BACKEND': 'azure',
            'AZURE_STORAGE_ACCOUNT_URL': 'https://example.blob.core.windows.net',
            'AZURE_STORAGE_CONTAINER': 'civicpulse-photos',
        })

        app.extensions.pop('civicpulse_blob_service', None)

        photo = make_photo()
        rel = storage.save_photo(photo, 'jpg')

        assert blobs[rel]['content'] == JPEG
        assert blobs[rel]['content_type'] == 'image/jpeg'

        content, content_type = storage.read_photo(rel)

        assert content == JPEG
        assert content_type == 'image/jpeg'

        destination = tmp_path / 'azure-download.jpg'
        storage.download_photo(rel, str(destination))

        assert destination.read_bytes() == JPEG

        storage.delete_photo(rel)

        assert rel not in blobs