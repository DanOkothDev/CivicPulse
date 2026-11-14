"""Small SMTP mailer for account onboarding messages."""
import smtplib
import ssl
from email.message import EmailMessage

from flask import current_app


class EmailDeliveryError(RuntimeError):
    pass


def send_temporary_password(recipient, name, role, county, password):
    config = current_app.config
    host = str(config.get('SMTP_HOST') or '').strip()
    sender = str(config.get('SMTP_FROM_EMAIL') or '').strip()
    if not host or not sender:
        raise EmailDeliveryError('SMTP_HOST and SMTP_FROM_EMAIL must be configured')

    message = EmailMessage()
    message['Subject'] = 'Your CivicPulse staff account'
    message['From'] = sender
    message['To'] = recipient
    role_label = {'admin': 'county admin', 'verifier': 'verifier', 'authority': 'authority'}[role]
    message.set_content(
        f"Hello {name},\n\n"
        f"A CivicPulse {role_label} account has been created for {county}.\n\n"
        f"Temporary password: {password}\n\n"
        "Sign in using your email address and this temporary password. CivicPulse will ask you to create a new password before you can continue.\n\n"
        "If you did not expect this account, contact your CivicPulse administrator."
    )

    try:
        port = int(config.get('SMTP_PORT') or 587)
    except (TypeError, ValueError):
        raise EmailDeliveryError('SMTP_PORT must be a valid port number') from None
    if not 1 <= port <= 65535:
        raise EmailDeliveryError('SMTP_PORT must be a valid port number')
    username = str(config.get('SMTP_USERNAME') or '').strip()
    smtp_password = str(config.get('SMTP_PASSWORD') or '')
    if bool(username) != bool(smtp_password):
        raise EmailDeliveryError('SMTP_USERNAME and SMTP_PASSWORD must both be configured for authentication')
    try:
        if config.get('SMTP_USE_SSL'):
            with smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context()) as smtp:
                if username:
                    smtp.login(username, smtp_password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
                if username:
                    smtp.login(username, smtp_password)
                smtp.send_message(message)
    except (OSError, ValueError, smtplib.SMTPException) as error:
        raise EmailDeliveryError('Could not deliver the staff account email') from error
