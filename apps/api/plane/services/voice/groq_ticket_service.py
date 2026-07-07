# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import json

from django.utils import timezone

from .groq_http import GroqAPIError, request_groq

VALID_PRIORITIES = {"urgent", "high", "medium", "low", "none"}


class TicketGenerationError(Exception):
    pass


SYSTEM_PROMPT = """You are an experienced engineering triage lead. You convert a spoken, informal description of a \
problem or task into a precise, actionable work-item ticket, the way a senior engineer would write it after \
listening to a user's report.

Return ONLY a single valid JSON object, no markdown, no commentary, with exactly these keys:

- "title": a SPECIFIC, descriptive ticket title (roughly 4-10 words, max ~80 characters). Name the concrete feature,
  screen, or component and the concrete symptom or action. Never use generic, vague titles.
  - Bad (too generic): "Password Issue", "Login Problem", "Page Error", "Bug Report"
  - Good (specific): "Password Reset Email Not Received", "Banking Dashboard Crashes After Login",
    "CSV Export Fails On Analytics Page"
- "description": 2-4 professional sentences written for an engineering ticket. State what the user was trying to do,
  what actually happened (the concrete symptom/error), and any relevant detail mentioned (browser, page, steps,
  frequency). Make it actionable for whoever picks up the ticket - avoid restating the title without new detail.
- "priority": one of "urgent", "high", "medium", "low", "none". If the speaker explicitly names a priority word,
  use it directly: "urgent" (e.g. "urgent issue", "this is urgent") -> "urgent"; "high priority" -> "high";
  "medium priority" -> "medium"; "low priority" -> "low". Otherwise, judge it realistically from the content:
  "urgent" for things like data loss, security issues, or a production system fully down/unusable for many users;
  "high" for a major feature broken or blocking the user's work; "medium" for a real but workaround-able bug or a
  meaningful task; "low" for cosmetic issues, minor annoyances, or small asks; "none" only when severity truly
  cannot be inferred. Do not default to "medium" - pick the level the description actually supports.
- "assignee_name": the exact name mentioned when the speaker assigns the work to someone (e.g. "assign this to
  Pavan", "assign it to John") - just the name itself, or null if no one is mentioned. Do not guess a name that
  isn't explicitly said.
- "labels": an array of short, relevant label names implied by the request (e.g. ["Bug"], ["Feature Request"],
  ["Performance"], ["UI/UX"]), or [] if none clearly apply
- "status_name": a workflow status mentioned in the request, or null
- "due_date": a due date in YYYY-MM-DD format when clearly implied, or null. Resolve relative dates against
  today's date: "by tomorrow" -> today + 1 day; "before/by Friday" -> the date of the next upcoming Friday;
  "in 3 days" / "in three days" -> today + 3 days; "due on June 30" / "by June 30" -> June 30 of the current
  year (or next year if that date already passed this year). If no due date is mentioned, use null.

Today's date is {today}.
"""


async def generate_ticket_fields(api_key: str, transcript: str) -> dict:
    """Use Groq Chat Completions to turn a transcript into structured ticket fields."""
    today = timezone.now().date().isoformat()
    system_prompt = SYSTEM_PROMPT.format(today=today)

    try:
        response = await request_groq(
            "POST",
            "/chat/completions",
            api_key,
            json={
                "model": "llama-3.3-70b-versatile",
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcript},
                ],
            },
        )
        raw = response.json()["choices"][0]["message"]["content"]
    except (GroqAPIError, KeyError, IndexError, TypeError, ValueError) as e:
        raise TicketGenerationError(str(e)) from e

    try:
        data = json.loads(raw)
    except (TypeError, ValueError) as e:
        raise TicketGenerationError("Received an invalid response while generating the ticket") from e

    priority = str(data.get("priority") or "none").lower()
    if priority not in VALID_PRIORITIES:
        priority = "none"

    labels = data.get("labels") or []
    if not isinstance(labels, list):
        labels = [str(labels)]

    assignee_name = data.get("assignee_name")
    status_name = data.get("status_name")
    due_date = data.get("due_date")

    fields = {
        "title": str(data.get("title") or "").strip(),
        "description": str(data.get("description") or "").strip(),
        "priority": priority,
        "assignee_name": str(assignee_name).strip() if assignee_name else None,
        "labels": [str(label).strip() for label in labels if str(label).strip()],
        "status_name": str(status_name).strip() if status_name else None,
        "due_date": str(due_date).strip() if due_date else None,
        # Start date always tracks the ticket's creation date rather than anything inferred from
        # speech - voice input is not allowed to override it (see frontend applyVoiceTicketResult).
        "start_date": today,
    }
    return fields
