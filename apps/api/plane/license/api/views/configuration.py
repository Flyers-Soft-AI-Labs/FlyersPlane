# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import os
from email.utils import parseaddr

# Django imports
from django.db.models import Q, Case, When, Value

# Third party imports
import requests
from rest_framework import status
from rest_framework.response import Response

# Module imports
from .base import BaseAPIView
from plane.license.api.permissions import InstanceAdminPermission
from plane.license.models import InstanceConfiguration
from plane.license.api.serializers import InstanceConfigurationSerializer
from plane.license.utils.encryption import encrypt_data
from plane.utils.cache import cache_response, invalidate_cache
from plane.license.utils.instance_value import get_email_configuration


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


def _get_brevo_error(response):
    try:
        response_data = response.json()
        return response_data.get("message") or response_data.get("error") or "Brevo API rejected the email."
    except ValueError:
        return response.text or "Brevo API rejected the email."


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


class InstanceConfigurationEndpoint(BaseAPIView):
    permission_classes = [InstanceAdminPermission]

    @cache_response(60 * 60 * 2, user=False)
    def get(self, request):
        instance_configurations = InstanceConfiguration.objects.all()
        serializer = InstanceConfigurationSerializer(instance_configurations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @invalidate_cache(path="/api/instances/configurations/", user=False)
    @invalidate_cache(path="/api/instances/", user=False)
    def patch(self, request):
        configurations = InstanceConfiguration.objects.filter(key__in=request.data.keys())

        bulk_configurations = []
        for configuration in configurations:
            raw_value = request.data.get(configuration.key, configuration.value)
            value = "" if raw_value is None else str(raw_value).strip()
            if configuration.is_encrypted:
                configuration.value = encrypt_data(value)
            else:
                configuration.value = value
            bulk_configurations.append(configuration)

        InstanceConfiguration.objects.bulk_update(bulk_configurations, ["value"], batch_size=100)

        serializer = InstanceConfigurationSerializer(configurations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DisableEmailFeatureEndpoint(BaseAPIView):
    permission_classes = [InstanceAdminPermission]

    @invalidate_cache(path="/api/instances/", user=False)
    def delete(self, request):
        try:
            InstanceConfiguration.objects.filter(
                Q(
                    key__in=[
                        "EMAIL_HOST",
                        "EMAIL_HOST_USER",
                        "EMAIL_HOST_PASSWORD",
                        "ENABLE_SMTP",
                        "EMAIL_PORT",
                        "EMAIL_FROM",
                    ]
                )
            ).update(value=Case(When(key="ENABLE_SMTP", then=Value("0")), default=Value("")))
            return Response(status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {"error": "Failed to disable email configuration"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class EmailCredentialCheckEndpoint(BaseAPIView):
    def post(self, request):
        receiver_email = request.data.get("receiver_email", False)
        if not receiver_email:
            return Response(
                {"error": "Receiver email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        *_, EMAIL_FROM = get_email_configuration()

        # Prepare email details
        subject = "Email Notification from Plane"
        message = "This is a sample email notification sent from Plane application."
        html_message = f"<p>{message}</p>"
        # Send the email
        try:
            _send_brevo_email(EMAIL_FROM, receiver_email, subject, html_message, message)
            return Response({"message": "Email successfully sent."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except requests.exceptions.HTTPError as e:
            error_message = (
                _get_brevo_error(e.response) if e.response is not None else "Brevo API rejected the email."
            )
            return Response(
                {"error": error_message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except requests.exceptions.Timeout:
            return Response(
                {"error": "Timeout error while trying to connect to Brevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "Network connection error. Please check your internet connection."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except requests.exceptions.RequestException:
            return Response(
                {"error": "Could not send email through Brevo. Please check your configuration."},
                status=status.HTTP_400_BAD_REQUEST,
            )
