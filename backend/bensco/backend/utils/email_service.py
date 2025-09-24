# utils/email_service.py
import threading
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)

def send_credentials_email_async(user, temp_password):
    """Send email in a separate thread to avoid blocking"""
    def send_email():
        try:
            # Check if email is configured
            if not settings.EMAIL_HOST_USER:
                logger.warning("Email not configured - skipping send")
                return False
                
            subject = 'Welcome to Bensco Susu - Your Account is Ready!'
            html_message = f"""
<!DOCTYPE html>
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
</html>
            """
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=f"Welcome {user.full_name or user.username}!\n\nUsername: {user.username}\nPassword: {temp_password}\nEmployee ID: {user.unique_code}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            msg.attach_alternative(html_message, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"✅ Email sent successfully to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Email failed for {user.email}: {str(e)}")
            return False
    
    # Start email sending in a separate thread
    email_thread = threading.Thread(target=send_email)
    email_thread.daemon = True
    email_thread.start()
    return True