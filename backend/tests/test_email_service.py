import smtplib

import pytest
from flask import Flask

from app.email_service import EmailDeliveryError, send_temporary_password


class FakeSMTP:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        self.sent = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def ehlo(self):
        pass

    def starttls(self, **kwargs):
        pass

    def login(self, username, password):
        self.credentials = username, password

    def send_message(self, message):
        self.sent.append(message)


@pytest.fixture
def smtp_app():
    app = Flask(__name__)
    app.config.update(
        SMTP_HOST='smtp.gmail.com', SMTP_PORT=587,
        SMTP_USERNAME='mailer@example.test', SMTP_PASSWORD='fake-secret',
        SMTP_FROM_EMAIL='mailer@example.test', SMTP_USE_SSL=False,
    )
    return app


def test_smtp_delivery_uses_starttls_and_auth(smtp_app, monkeypatch):
    clients = []

    def smtp_factory(*args, **kwargs):
        client = FakeSMTP(*args, **kwargs)
        clients.append(client)
        return client

    monkeypatch.setattr('app.email_service.smtplib.SMTP', smtp_factory)
    with smtp_app.app_context():
        send_temporary_password('person@example.test', 'Staff', 'verifier', 'Nairobi', 'one-time')
    smtp = clients[0]
    assert smtp.args == ('smtp.gmail.com', 587)
    assert smtp.credentials == ('mailer@example.test', 'fake-secret')
    assert 'one-time' in smtp.sent[0].get_content()


def test_missing_smtp_configuration_fails_without_exposing_secrets(smtp_app):
    smtp_app.config.update(SMTP_HOST='', SMTP_FROM_EMAIL='', SMTP_PASSWORD='must-not-leak')
    with smtp_app.app_context(), pytest.raises(EmailDeliveryError) as error:
        send_temporary_password('person@example.test', 'Staff', 'verifier', 'Nairobi', 'pw')
    assert 'must-not-leak' not in str(error.value)


@pytest.mark.parametrize('failure', [
    smtplib.SMTPAuthenticationError(535, b'private auth response'),
    TimeoutError('private connection detail'),
])
def test_smtp_authentication_and_timeout_errors_are_sanitized(smtp_app, monkeypatch, failure):
    class BrokenSMTP(FakeSMTP):
        def login(self, *args):
            raise failure

        def ehlo(self):
            if isinstance(failure, TimeoutError):
                raise failure

    monkeypatch.setattr('app.email_service.smtplib.SMTP', BrokenSMTP)
    with smtp_app.app_context(), pytest.raises(EmailDeliveryError) as error:
        send_temporary_password('person@example.test', 'Staff', 'verifier', 'Nairobi', 'pw')
    assert 'private' not in str(error.value)
    assert 'fake-secret' not in str(error.value)
