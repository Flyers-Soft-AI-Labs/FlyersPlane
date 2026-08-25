# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""
Shared transactional email sender.

Every outbound email in this codebase is sent over Brevo's HTTPS transactional
email API rather than Django's SMTP backend (EmailMultiAlternatives /
get_connection). Do not "helpfully" revert this to SMTP: several of the hosts
this app runs on block outbound SMTP ports (25/465/587), so an SMTP connection
just hangs until it times out with no useful error. HTTPS on port 443 is not
affected, and Brevo's API gives back a real error body we can log and surface
instead of a generic exception.

The Brevo API key and the Brevo SMTP key are different credentials and are
NOT interchangeable - this module authenticates with the header `api-key:
<key>`, not `Authorization: Bearer`, which is the single most common mistake
when wiring Brevo up.
"""

# Python imports
import logging
import os
from email.utils import parseaddr
from typing import Iterable, Union

# Third party imports
import requests

# Module imports
from plane.license.utils.instance_value import get_email_configuration

logger = logging.getLogger("plane.worker")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_TIMEOUT = 15


class EmailSendError(Exception):
    """Raised when Brevo rejects a send, or the request to Brevo fails outright."""

    def __init__(self, message, code=None, status_code=None):
        self.code = code
        self.status_code = status_code
        super().__init__(message)


def _get_api_key():
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        raise EmailSendError("BREVO_API_KEY is not configured")
    return api_key


def _get_sender():
    *_, email_from = get_email_configuration()
    sender_name, sender_email = parseaddr(email_from)
    sender_email = sender_email or email_from
    if not sender_email:
        raise EmailSendError("EMAIL_FROM is not configured")

    sender = {"email": sender_email}
    if sender_name:
        sender["name"] = sender_name
    return sender


def _parse_error_body(response):
    try:
        return response.json()
    except ValueError:
        return {"message": response.text or "Brevo API rejected the email."}


def send_email(
    to: Union[str, Iterable[str]],
    subject: str,
    html_content: str,
    text_content: str | None = None,
    reply_to: str | None = None,
    attachments: list[dict] | None = None,
):
    """
    Send a transactional email through Brevo.

    `to` accepts a single email address or an iterable of addresses.
    `attachments`, if given, is a list of Brevo attachment dicts:
    [{"name": "file.csv", "content": "<base64-encoded bytes>"}, ...]

    Returns Brevo's parsed JSON response (contains "messageId") on success.
    Raises EmailSendError on any non-2xx response, timeout, or connection error.
    """
    recipients = [to] if isinstance(to, str) else list(to)

    payload = {
        "sender": _get_sender(),
        "to": [{"email": address} for address in recipients],
        "subject": subject,
        "htmlContent": html_content,
    }
    if text_content is not None:
        payload["textContent"] = text_content
    if reply_to is not None:
        payload["replyTo"] = {"email": reply_to}
    if attachments:
        payload["attachment"] = attachments

    try:
        response = requests.post(
            BREVO_API_URL,
            headers={"api-key": _get_api_key(), "Content-Type": "application/json"},
            json=payload,
            timeout=BREVO_TIMEOUT,
        )
    except requests.exceptions.Timeout as e:
        logger.error(f"Brevo email send timed out for {recipients}: {e}")
        raise EmailSendError("Timed out while connecting to Brevo.") from e
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Brevo email send connection failed for {recipients}: {e}")
        raise EmailSendError("Could not connect to Brevo.") from e

    if response.status_code not in (200, 201, 202):
        error_body = _parse_error_body(response)
        logger.error(f"Brevo rejected email to {recipients} (status {response.status_code}): {error_body}")
        raise EmailSendError(
            error_body.get("message", "Brevo API rejected the email."),
            code=error_body.get("code"),
            status_code=response.status_code,
        )

    return response.json()
