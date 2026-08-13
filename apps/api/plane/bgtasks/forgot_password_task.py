# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import logging
import os
from email.utils import parseaddr

# Third party imports
import requests
from celery import shared_task

# Django imports
from django.template.loader import render_to_string

# Module imports
from plane.license.utils.instance_value import get_email_configuration
from plane.utils.email import generate_plain_text_from_html
from plane.utils.exception_logger import log_exception

BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"
RESEND_API_URL = "https://api.resend.com/emails"


def _get_brevo_api_key():
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        raise ValueError("BREVO_API_KEY is not configured")
    return api_key


def _get_brevo_sender(from_email):
    sender_name, sender_email = parseaddr(from_email)
    sender_email = sender_email or from_email
    if not sender_email:
        raise ValueError("EMAIL_FROM is not configured")

    sender = {"email": sender_email}
    if sender_name:
        sender["name"] = sender_name
    return sender


def _send_brevo_email(from_email, to_email, subject, html_content, text_content):
    response = requests.post(
        BREVO_TRANSACTIONAL_EMAIL_URL,
        headers={
            "api-key": _get_brevo_api_key(),
            "Content-Type": "application/json",
        },
        json={
            "sender": _get_brevo_sender(from_email),
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content,
        },
        timeout=10,
    )
    response.raise_for_status()


def _send_resend_email(api_key, from_email, to_email, subject, html_content, text_content):
    # Rollback helper for the previous Resend HTTPS send path.
    response = requests.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        },
        timeout=10,
    )
    response.raise_for_status()


@shared_task
def forgot_password(first_name, email, uidb64, token, current_site):
    try:
        relative_link = f"/accounts/reset-password/?uidb64={uidb64}&token={token}&email={email}"
        abs_url = str(current_site) + relative_link

        (
            _EMAIL_HOST,
            _EMAIL_HOST_USER,
            _EMAIL_HOST_PASSWORD,
            _EMAIL_PORT,
            _EMAIL_USE_TLS,
            _EMAIL_USE_SSL,
            EMAIL_FROM,
        ) = get_email_configuration()

        subject = "A new password to your Plane account has been requested"

        context = {
            "first_name": first_name,
            "forgot_password_url": abs_url,
            "email": email,
        }

        html_content = render_to_string("emails/auth/forgot_password.html", context)

        text_content = generate_plain_text_from_html(html_content)

        _send_brevo_email(EMAIL_FROM, email, subject, html_content, text_content)
        logging.getLogger("plane.worker").info("Email sent successfully")
        return
    except Exception as e:
        log_exception(e)
        return
