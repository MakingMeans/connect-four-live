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
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    SMTP_HOST,
    SMTP_PORT,
    VERIFICATION_CODE_EXPIRE_MINUTES,
)

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    pass


def _is_smtp_configured() -> bool:
    return all([EMAIL_USER, EMAIL_PASSWORD, SMTP_HOST, SMTP_PORT])


def _build_html_template(
    *,
    username: str,
    code: str,
    title: str,
    intro: str,
    code_label: str,
    expire_minutes: int,
) -> str:
    safe_username = html.escape(username)
    safe_code = html.escape(code)
    safe_title = html.escape(title)
    safe_intro = html.escape(intro)
    safe_code_label = html.escape(code_label)
    safe_minutes = html.escape(str(expire_minutes))

    return f"""
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{safe_title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
    <div style="padding:32px 16px;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(23,32,51,0.08);">
        <div style="background:linear-gradient(135deg,#102542,#1d4e89);padding:36px 32px;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:14px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;">Connect Four AI</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">{safe_title}</h1>
          <p style="margin:16px 0 0;font-size:15px;line-height:1.7;opacity:0.92;">
            Hola {safe_username}, {safe_intro}
          </p>
        </div>
        <div style="padding:32px;">
          <div style="margin:0 auto 24px;max-width:360px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:20px;padding:24px;text-align:center;">
            <p style="margin:0 0 12px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">{safe_code_label}</p>
            <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:10px;color:#102542;">{safe_code}</p>
          </div>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">
            Este codigo expira en <strong>{safe_minutes} minutos</strong>. Si no solicitaste esta accion, puedes ignorar este correo.
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


def _build_plain_text(
    *,
    username: str,
    code: str,
    title: str,
    expire_minutes: int,
) -> str:
    return (
        f"Hola {username},\n\n"
        f"{title}: {code}\n"
        f"Este codigo expira en {expire_minutes} minutos.\n\n"
        "Si no solicitaste esta accion, ignora este correo."
    )


def _send_code_email(
    *,
    recipient_email: str,
    username: str,
    code: str,
    subject: str,
    title: str,
    intro: str,
    code_label: str,
    expire_minutes: int,
) -> None:
    if not _is_smtp_configured():
        logger.error("SMTP no configurado completamente. Revisa EMAIL_USER, EMAIL_PASSWORD, SMTP_HOST y SMTP_PORT.")
        raise EmailDeliveryError("El servicio de correo no esta configurado.")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((EMAIL_FROM_NAME, EMAIL_USER))
    message["To"] = recipient_email
    message.set_content(
        _build_plain_text(
            username=username,
            code=code,
            title=title,
            expire_minutes=expire_minutes,
        )
    )
    message.add_alternative(
        _build_html_template(
            username=username,
            code=code,
            title=title,
            intro=intro,
            code_label=code_label,
            expire_minutes=expire_minutes,
        ),
        subtype="html",
    )

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

        logger.info("Correo transaccional enviado a %s", recipient_email)
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("No se pudo enviar el correo transaccional a %s", recipient_email)
        raise EmailDeliveryError("No se pudo enviar el correo transaccional.") from exc


def send_verification_email(recipient_email: str, username: str, code: str) -> None:
    _send_code_email(
        recipient_email=recipient_email,
        username=username,
        code=code,
        subject="Verifica tu cuenta",
        title="Verifica tu correo",
        intro="usa el siguiente codigo OTP para activar tu cuenta.",
        code_label="Codigo de verificacion",
        expire_minutes=VERIFICATION_CODE_EXPIRE_MINUTES,
    )


def send_password_reset_email(recipient_email: str, username: str, code: str) -> None:
    _send_code_email(
        recipient_email=recipient_email,
        username=username,
        code=code,
        subject="Restablece tu contrasena",
        title="Restablece tu contrasena",
        intro="usa el siguiente codigo OTP para restablecer tu contrasena.",
        code_label="Codigo de restablecimiento",
        expire_minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    )
