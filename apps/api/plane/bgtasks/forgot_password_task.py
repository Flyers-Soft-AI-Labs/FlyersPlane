# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import logging

# Third party imports
import requests
from celery import shared_task

# Django imports
from django.template.loader import render_to_string

# Module imports
from plane.license.utils.instance_value import get_email_configuration
from plane.utils.email import generate_plain_text_from_html
from plane.utils.exception_logger import log_exception

# Sent over HTTPS instead of SMTP: Render's free tier blocks outbound SMTP,
# same reasoning as the EmailCredentialCheckEndpoint test-email path.
RESEND_API_URL = "https://api.resend.com/emails"


@shared_task
def forgot_password(first_name, email, uidb64, token, current_site):
    try:
        relative_link = f"/accounts/reset-password/?uidb64={uidb64}&token={token}&email={email}"
        abs_url = str(current_site) + relative_link

        (
            _EMAIL_HOST,
            _EMAIL_HOST_USER,
            EMAIL_HOST_PASSWORD,
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

        # EMAIL_HOST_PASSWORD doubles as the Resend API key for this send path
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {EMAIL_HOST_PASSWORD}",
                "Content-Type": "application/json",
            },
            json={
                "from": EMAIL_FROM,
                "to": [email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            },
            timeout=10,
        )
        response.raise_for_status()
        logging.getLogger("plane.worker").info("Email sent successfully")
        return
    except Exception as e:
        log_exception(e)
        return
