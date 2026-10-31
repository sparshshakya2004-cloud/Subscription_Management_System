import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "no-reply@brightloop.com")

def send_password_reset_email(to_email: str, reset_token: str, base_url: str = "http://localhost:5173") -> dict:
    reset_url = f"{base_url}/reset-password?token={reset_token}"
    subject = "Brightloop Software - Password Reset Request"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-top: 0;">Brightloop Software</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the link below to set a new password:</p>
                <p style="margin: 25px 0;">
                    <a href="{reset_url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </p>
                <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #3b82f6; word-break: break-all;">{reset_url}</p>
                <p style="font-size: 13px; color: #64748b; margin-top: 30px;">This link will expire in 1 hour. If you did not make this request, please disregard this email.</p>
            </div>
        </body>
    </html>
    """

    if not SMTP_HOST or not SMTP_USER:
        # Development mode fallback
        print("\n" + "="*70)
        print(" [DEVELOPMENT EMAIL DISPATCH - SMTP NOT CONFIGURED]")
        print(f" To: {to_email}")
        print(f" Subject: {subject}")
        print(f" Reset Link: {reset_url}")
        print(f" Token: {reset_token}")
        print("="*70 + "\n")
        return {
            "delivered": True,
            "mode": "development",
            "reset_url": reset_url,
            "token": reset_token,
            "message": "Email logged to development console."
        }

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        return {"delivered": True, "mode": "smtp", "message": "Email sent successfully via SMTP."}
    except Exception as e:
        print(f"[SMTP Error] Failed to send email to {to_email}: {e}")
        return {
            "delivered": False,
            "mode": "smtp_failed",
            "reset_url": reset_url,
            "token": reset_token,
            "error": str(e)
        }
