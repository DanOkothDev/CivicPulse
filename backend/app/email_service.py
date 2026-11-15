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


def send_password_reset_email(recipient, name, reset_url):
    config = current_app.config
    host = str(config.get('SMTP_HOST') or '').strip()
    sender = str(config.get('SMTP_FROM_EMAIL') or '').strip()
    if not host or not sender:
        raise EmailDeliveryError('SMTP_HOST and SMTP_FROM_EMAIL must be configured')
    message = EmailMessage()
    message['Subject'] = 'Reset your CivicPulse password'
    message['From'] = sender
    message['To'] = recipient
    message.set_content(
        f"Hello {name},\n\nA request was made to reset your CivicPulse password. "
        f"Use this secure link within 15 minutes:\n\n{reset_url}\n\n"
        "If you did not request a password reset, ignore this email. Your password will remain unchanged."
    )
    message.add_alternative(
        '<html><body style="font-family:Arial,sans-serif;color:#334155">'
        '<div style="max-width:560px;margin:auto;padding:28px;border:1px solid #cfe9f0;border-radius:16px">'
        '<h1 style="color:#0B5A9C">CivicPulse</h1><h2>Reset your password</h2>'
        '<p>A request was made to reset your CivicPulse password.</p>'
        f'<p><a href="{reset_url}" style="display:inline-block;background:#0B5A9C;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p>'
        '<p>This link expires in 15 minutes.</p><p>If you did not request this, ignore this email. Your password will remain unchanged.</p>'
        '</div></body></html>', subtype='html'
    )
    try:
        port = int(config.get('SMTP_PORT') or 587)
        if not 1 <= port <= 65535:
            raise ValueError
        username = str(config.get('SMTP_USERNAME') or '').strip()
        smtp_password = str(config.get('SMTP_PASSWORD') or '')
        if bool(username) != bool(smtp_password):
            raise EmailDeliveryError('SMTP authentication settings are incomplete')
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
    except EmailDeliveryError:
        raise
    except (OSError, ValueError, smtplib.SMTPException) as error:
        raise EmailDeliveryError('Could not deliver the password reset email') from error
