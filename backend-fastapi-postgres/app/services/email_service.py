import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import (
    EMAIL_FROM_NAME,
    EMAIL_PASSWORD,
    EMAIL_USER,
    SMTP_HOST,
    SMTP_PORT,
    VERIFICATION_CODE_EXPIRE_MINUTES,
)

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    pass


def _is_smtp_configured() -> bool:
    return all([EMAIL_USER, EMAIL_PASSWORD, SMTP_HOST, SMTP_PORT])


def _build_html_template(username: str, code: str) -> str:
    safe_username = html.escape(username)
    safe_code = html.escape(code)
    safe_minutes = html.escape(str(VERIFICATION_CODE_EXPIRE_MINUTES))

    return f"""
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verifica tu cuenta</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
    <div style="padding:32px 16px;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(23,32,51,0.08);">
        <div style="background:linear-gradient(135deg,#102542,#1d4e89);padding:36px 32px;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:14px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;">Connect Four AI</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">Verifica tu correo</h1>
          <p style="margin:16px 0 0;font-size:15px;line-height:1.7;opacity:0.92;">
            Hola {safe_username}, usa el siguiente codigo OTP para activar tu cuenta.
          </p>
        </div>
        <div style="padding:32px;">
          <div style="margin:0 auto 24px;max-width:360px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:20px;padding:24px;text-align:center;">
            <p style="margin:0 0 12px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Codigo de verificacion</p>
            <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:10px;color:#102542;">{safe_code}</p>
          </div>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">
            Este codigo expira en <strong>{safe_minutes} minutos</strong>. Si no solicitaste esta verificacion, puedes ignorar este correo.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">
            Por seguridad, nunca compartas este codigo con otras personas.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
""".strip()


def _build_plain_text(username: str, code: str) -> str:
    return (
        f"Hola {username},\n\n"
        f"Tu codigo de verificacion es: {code}\n"
        f"Este codigo expira en {VERIFICATION_CODE_EXPIRE_MINUTES} minutos.\n\n"
        "Si no solicitaste esta verificacion, ignora este correo."
    )


def send_verification_email(recipient_email: str, username: str, code: str) -> None:
    if not _is_smtp_configured():
        logger.error("SMTP no configurado completamente. Revisa EMAIL_USER, EMAIL_PASSWORD, SMTP_HOST y SMTP_PORT.")
        raise EmailDeliveryError("El servicio de correo no esta configurado.")

    message = EmailMessage()
    message["Subject"] = "Verifica tu cuenta"
    message["From"] = formataddr((EMAIL_FROM_NAME, EMAIL_USER))
    message["To"] = recipient_email
    message.set_content(_build_plain_text(username, code))
    message.add_alternative(_build_html_template(username, code), subtype="html")

    try:
        if SMTP_PORT == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15, context=context) as server:
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.send_message(message)
        else:
            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.send_message(message)

        logger.info("Correo de verificacion enviado a %s", recipient_email)
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("No se pudo enviar el correo de verificacion a %s", recipient_email)
        raise EmailDeliveryError("No se pudo enviar el correo de verificacion.") from exc
