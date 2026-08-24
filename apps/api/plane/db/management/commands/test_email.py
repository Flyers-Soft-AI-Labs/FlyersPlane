# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.core.management import BaseCommand, CommandError
from django.template.loader import render_to_string
from django.utils.html import strip_tags

# Module imports
from plane.utils.email_provider import EmailSendError, send_email


class Command(BaseCommand):
    """Django command to pause execution until db is available"""

    def add_arguments(self, parser):
        # Positional argument
        parser.add_argument("to_email", type=str, help="receiver's email")

    def handle(self, *args, **options):
        receiver_email = options.get("to_email")

        if not receiver_email:
            raise CommandError("Receiver email is required")

        # Prepare email details
        subject = "Test email from Plane"

        html_content = render_to_string("emails/test_email.html")
        text_content = strip_tags(html_content)

        self.stdout.write(self.style.SUCCESS("Trying to send test email..."))

        # Send the email
        try:
            send_email(receiver_email, subject, html_content, text_content)
            self.stdout.write(self.style.SUCCESS("Email successfully sent"))
        except EmailSendError as e:
            self.stdout.write(self.style.ERROR(f"Error: Email could not be delivered due to {e}"))
