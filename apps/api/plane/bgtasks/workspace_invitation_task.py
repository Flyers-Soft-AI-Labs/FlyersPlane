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
from plane.db.models import User, Workspace, WorkspaceMemberInvite
from plane.license.utils.instance_value import get_email_configuration
from plane.utils.email import generate_plain_text_from_html
from plane.utils.exception_logger import log_exception


BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"


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


@shared_task
def workspace_invitation(email, workspace_id, token, current_site, inviter):
    try:
        user = User.objects.get(email=inviter)

        workspace = Workspace.objects.get(pk=workspace_id)
        workspace_member_invite = WorkspaceMemberInvite.objects.get(token=token, email=email)

        # Relative link
        relative_link = (
            f"/workspace-invitations/?invitation_id={workspace_member_invite.id}&slug={workspace.slug}&token={token}"  # noqa: E501
        )

        # The complete url including the domain
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

        # Subject of the email
        subject = f"{user.first_name or user.display_name or user.email} has invited you to join them in {workspace.name} on Plane"  # noqa: E501

        context = {
            "email": email,
            "first_name": user.first_name or user.display_name or user.email,
            "workspace_name": workspace.name,
            "abs_url": abs_url,
        }

        html_content = render_to_string("emails/invitations/workspace_invitation.html", context)

        text_content = generate_plain_text_from_html(html_content)

        workspace_member_invite.message = text_content
        workspace_member_invite.save()

        _send_brevo_email(EMAIL_FROM, email, subject, html_content, text_content)
        logging.getLogger("plane.worker").info("Email sent successfully")
        return
    except (Workspace.DoesNotExist, WorkspaceMemberInvite.DoesNotExist):
        return
    except Exception as e:
        log_exception(e)
        return
