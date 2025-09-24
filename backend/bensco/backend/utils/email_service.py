# utils/email_service.py
import os
import threading
import logging
import re
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

# Optional import of Brevo SDK
try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
except Exception:
    sib_api_v3_sdk = None
    ApiException = Exception


def _parse_sender():
    """
    Returns (name, email) from settings.DEFAULT_FROM_EMAIL.
    Accepts formats like:
      - "Name <email@domain.com>"
      - "email@domain.com"
      - "Name"
    """
    raw = getattr(settings, "DEFAULT_FROM_EMAIL", "") or ""
    # If format "Name <email>"
    m = re.search(r'^(.*?)<([^>]+)>$', raw)
    if m:
        name = m.group(1).strip().strip('"') or "Bensco Susu"
        email = m.group(2).strip()
        return name, email
    # if it's just an email
    if "@" in raw:
        return "Bensco Susu", raw.strip()
    # fallback
    return "Bensco Susu", raw.strip() or "no-reply@yourdomain.com"


def _build_messages(user, temp_password):
    """Return (subject, text_message, html_message) preserving original styling."""
    subject = 'Welcome to Bensco Susu - Your Account is Ready!'
    text_message = (
        f"Welcome {user.full_name or user.username}!\n\n"
        f"Your collector account has been successfully created.\n\n"
        f"Username: {user.username}\n"
        f"Email: {user.email}\n"
        f"Employee ID: {user.unique_code}\n"
        f"Password: {temp_password}\n\n"
        "Please change your password after first login.\n\n"
        "© 2024 Bensco Susu Limited"
    )

    html_message = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Bensco Susu</title>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 2px;">BENSCO</h1>
            <p style="color: #fecaca; font-size: 14px; font-weight: 600; margin: 4px 0 0 0;">SUSU LIMITED</p>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Welcome, {user.full_name or user.username}!</h2>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Your collector account has been successfully created.</p>
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 30px 0; border-left: 4px solid #dc2626;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">🔑 Your Login Credentials</h3>
                <div style="margin-bottom: 12px;"><strong>Username:</strong> {user.username}</div>
                <div style="margin-bottom: 12px;"><strong>Email:</strong> {user.email}</div>
                <div style="margin-bottom: 12px;"><strong>Employee ID:</strong> {user.unique_code}</div>
                <div><strong>Password:</strong> {temp_password}</div>
            </div>
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">🔒 Please change your password after first login.</p>
            </div>
        </div>
        <div style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Bensco Susu Limited</p>
        </div>
    </div>
</body>
</html>"""
    return subject, text_message, html_message


def _send_email_smtp(user, temp_password, subject, html_message, text_message):
    """Send via Django's SMTP backend (Brevo SMTP)"""
    try:
        # Basic config checks
        if not getattr(settings, "EMAIL_HOST", None):
            logger.warning("EMAIL_HOST not configured; skipping SMTP send")
            return False

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_message, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"✅ SMTP email sent to {user.email}")
        return True
    except Exception as e:
        logger.exception(f"❌ SMTP email failed for {user.email}: {e}")
        return False


def _send_email_api(user, temp_password, subject, html_message, text_message):
    """Send via Brevo HTTP API (sib-api-v3-sdk)"""
    if not sib_api_v3_sdk:
        logger.error("Brevo SDK not installed. Install with: pip install sib-api-v3-sdk")
        return False

    api_key = getattr(settings, "BREVO_API_KEY", None) or os.getenv("BREVO_API_KEY")
    if not api_key:
        logger.error("BREVO_API_KEY not set in settings or environment")
        return False

    try:
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key["api-key"] = api_key
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

        sender_name, sender_email = _parse_sender()
        sender = {"email": sender_email, "name": sender_name}
        to = [{"email": user.email, "name": user.full_name or user.username}]

        email = sib_api_v3_sdk.SendSmtpEmail(
            to=to,
            sender=sender,
            subject=subject,
            html_content=html_message,
            text_content=text_message,
        )

        response = api_instance.send_transac_email(email)
        logger.info(f"✅ API email sent to {user.email}: {response}")
        return True
    except ApiException as e:
        logger.exception(f"❌ Brevo API error for {user.email}: {e}")
        return False
    except Exception as e:
        logger.exception(f"❌ Unexpected error sending API email for {user.email}: {e}")
        return False


def send_credentials_email_async(user, temp_password):
    """
    Public entry point. Uses settings.EMAIL_PROVIDER to choose backend.
    Returns True as soon as the send thread is started.
    """
    subject, text_message, html_message = _build_messages(user, temp_password)

    def _worker():
        provider = getattr(settings, "EMAIL_PROVIDER", "smtp").lower()
        logger.debug(f"Email provider selected: {provider} (to={user.email})")

        if provider == "api":
            ok = _send_email_api(user, temp_password, subject, html_message, text_message)
            if not ok:
                logger.warning("API send failed; attempting SMTP fallback")
                _send_email_smtp(user, temp_password, subject, html_message, text_message)
            return

        # default smtp
        ok = _send_email_smtp(user, temp_password, subject, html_message, text_message)
        if not ok and getattr(settings, "EMAIL_PROVIDER_FALLBACK", False):
            logger.warning("SMTP send failed; attempting API fallback")
            _send_email_api(user, temp_password, subject, html_message, text_message)

    thread = threading.Thread(target=_worker)
    thread.daemon = True
    thread.start()
    return True
