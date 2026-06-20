# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import json
import os

from asgiref.sync import async_to_sync
from django.conf import settings
from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE
from plane.db.models import WorkspaceMember
from plane.services.voice import voice_debug
from plane.services.voice.voice_ticket_service import process_voice_ticket
from plane.services.voice.whisper_service import VoiceTranscriptionError
from plane.services.voice.groq_ticket_service import TicketGenerationError
from plane.utils.exception_logger import log_exception

from ..base import BaseAPIView

ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "video/mp4",
    "video/webm",
    "application/octet-stream",
}

ALLOWED_AUDIO_EXTENSIONS = {
    ".aac",
    ".flac",
    ".m4a",
    ".mp3",
    ".mp4",
    ".mpeg",
    ".mpga",
    ".oga",
    ".ogg",
    ".wav",
    ".webm",
}

MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024


def _has_workspace_voice_permission(user, workspace_slug: str) -> bool:
    return WorkspaceMember.objects.filter(
        member=user,
        workspace__slug=workspace_slug,
        role__in=[ROLE.ADMIN.value, ROLE.MEMBER.value],
        is_active=True,
    ).exists()


def _validate_audio_file(audio_file):
    content_type = (getattr(audio_file, "content_type", "") or "").lower()
    filename = (getattr(audio_file, "name", "") or "").lower()
    file_extension = os.path.splitext(filename)[1]
    max_file_size = min(getattr(settings, "FILE_SIZE_LIMIT", MAX_AUDIO_FILE_SIZE), MAX_AUDIO_FILE_SIZE)

    if audio_file.size <= 0:
        return "The audio recording is empty."

    if audio_file.size > max_file_size:
        return "The audio recording is too large."

    if content_type and content_type not in ALLOWED_AUDIO_CONTENT_TYPES:
        return "Unsupported audio file type."

    if file_extension and file_extension not in ALLOWED_AUDIO_EXTENSIONS:
        return "Unsupported audio file extension."

    return None


class VoiceTicketEndpoint(BaseAPIView):
    def post(self, request):
        workspace_slug = (request.data.get("workspace_slug") or "").strip()
        if not workspace_slug:
            return Response({"error": "Workspace slug is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not _has_workspace_voice_permission(request.user, workspace_slug):
            return Response(
                {"error": "You don't have the required permissions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return Response(
                {"error": "Voice ticket creation is not configured for this instance."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        audio_file = request.FILES.get("audio")
        transcript = (request.data.get("transcript") or "").strip()
        duration_seconds = request.data.get("duration_seconds")
        client_mime_type = (request.data.get("client_mime_type") or "").strip() or None

        if not audio_file and not transcript:
            return Response(
                {"error": "An audio recording or transcript is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if audio_file:
            validation_error = _validate_audio_file(audio_file)
            if validation_error:
                return Response({"error": validation_error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fields = async_to_sync(process_voice_ticket)(
                api_key=api_key,
                audio_file=audio_file,
                transcript=transcript or None,
                duration_seconds=duration_seconds,
                client_mime_type=client_mime_type,
            )
        except (VoiceTranscriptionError, TicketGenerationError) as e:
            log_exception(e)
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Something went wrong while preparing the ticket draft from your recording."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(fields, status=status.HTTP_200_OK)


class VoiceTicketDebugAudioEndpoint(BaseAPIView):
    """Temporary diagnostic endpoint: returns the raw audio the server received for a given
    voice-ticket upload, so it can be downloaded and played back to verify whether the audio
    itself contains the spoken sentence. Only active when VOICE_DEBUG_SAVE_AUDIO=1; 404s
    otherwise. Remove once the audio-pipeline investigation is complete."""

    def get(self, request, debug_id):
        if not voice_debug.is_enabled():
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        loaded = voice_debug.load_debug_audio(debug_id)
        if not loaded:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        audio_bytes, content_type, metadata = loaded
        response = HttpResponse(audio_bytes, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{debug_id}.{metadata["saved_extension"]}"'
        response["X-Voice-Debug-Metadata"] = json.dumps(metadata)
        return response
