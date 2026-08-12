# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import json
from html import escape

# Third party imports
from celery import shared_task

# Django imports
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone

# Module imports
from plane.app.serializers.issue import IssueCreateSerializer
from plane.bgtasks.issue_activities_task import issue_activity
from plane.db.models import CSVImportHistory, Issue, Project, State, User
from plane.utils.exception_logger import log_exception

VALID_PRIORITIES = {"none", "low", "medium", "high", "urgent"}
MAX_ROWS_PER_IMPORT = 5000


def _resolve_state_id(project_id, status_value):
    """Match a CSV status cell to a project state by name. Returns (state_id, warning)."""
    if not status_value or not str(status_value).strip():
        return None, None

    state = State.objects.filter(project_id=project_id, name__iexact=str(status_value).strip()).first()
    if state:
        return state.id, None

    return (
        None,
        f"Status '{status_value}' did not match any state in this project; the default state was used instead.",
    )


def _format_serializer_errors(errors):
    """Flatten DRF's {field: [messages]} error dict into a single readable line."""
    parts = []
    for field, messages in errors.items():
        joined = "; ".join(str(message) for message in messages) if isinstance(messages, list) else str(messages)
        parts.append(f"{field}: {joined}" if field != "non_field_errors" else joined)
    return " | ".join(parts) if parts else "This row could not be validated."


def _resolve_assignee_ids(assignee_value):
    """Match a CSV assignee cell (email) to a user. Returns (assignee_ids, warning)."""
    if not assignee_value or not str(assignee_value).strip():
        return [], None

    email = str(assignee_value).strip()
    user = User.objects.filter(email__iexact=email).first()
    if user:
        return [str(user.id)], None

    return [], f"No user found with email '{email}'; the row was imported without an assignee."


@shared_task
def csv_import_task(import_id, workspace_id, project_id, rows, actor_id):
    csv_import = CSVImportHistory.objects.filter(pk=import_id).first()
    if csv_import is None:
        return

    csv_import.status = "processing"
    csv_import.save(update_fields=["status"])

    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        csv_import.status = "failed"
        csv_import.error_report = [{"row": 0, "message": "The target project no longer exists."}]
        csv_import.save(update_fields=["status", "error_report"])
        return

    error_report = []
    imported_count = 0

    for index, row in enumerate(rows, start=1):
        title = str(row.get("title") or "").strip()
        if not title:
            error_report.append({"row": index, "field": "title", "message": "Title is required.", "level": "error"})
            continue

        description = str(row.get("description") or "").strip()
        priority = str(row.get("priority") or "none").strip().lower()
        if priority not in VALID_PRIORITIES:
            priority = "none"

        state_id, state_warning = _resolve_state_id(project_id, row.get("status"))
        assignee_ids, assignee_warning = _resolve_assignee_ids(row.get("assignee"))

        payload = {
            "name": title[:255],
            "description_html": f"<p>{escape(description)}</p>" if description else "<p></p>",
            "priority": priority,
        }
        if state_id:
            payload["state_id"] = state_id
        if assignee_ids:
            payload["assignee_ids"] = assignee_ids

        serializer = IssueCreateSerializer(
            data=payload,
            context={
                "project_id": project_id,
                "workspace_id": workspace_id,
                "default_assignee_id": project.default_assignee_id,
            },
        )

        if not serializer.is_valid():
            error_report.append(
                {"row": index, "message": _format_serializer_errors(serializer.errors), "level": "error"}
            )
            continue

        try:
            issue = serializer.save()
            # `save()` runs outside of a request, so there is no request-scoped user for
            # crum to auto-attribute created_by to; set it explicitly via update() to
            # avoid re-triggering Issue.save()'s sequencing/locking logic.
            Issue.objects.filter(pk=issue.pk).update(created_by_id=actor_id)
        except Exception as exc:
            log_exception(exc)
            error_report.append({"row": index, "message": "Could not create this work item.", "level": "error"})
            continue

        imported_count += 1

        for warning in filter(None, [state_warning, assignee_warning]):
            error_report.append({"row": index, "message": warning, "level": "warning"})

        issue_activity.delay(
            type="issue.activity.created",
            requested_data=json.dumps(payload, cls=DjangoJSONEncoder),
            actor_id=str(actor_id),
            issue_id=str(issue.id),
            project_id=str(project_id),
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=None,
        )

    csv_import.imported_count = imported_count
    csv_import.failed_count = len([entry for entry in error_report if entry.get("level") == "error"])
    csv_import.error_report = error_report
    csv_import.status = "completed"
    csv_import.save(update_fields=["imported_count", "failed_count", "error_report", "status"])
