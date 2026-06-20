# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import logging

from .groq_ticket_service import generate_ticket_fields
from .transcript_correction_service import correct_transcript
from .whisper_service import (
    UNCLEAR_SPEECH_MESSAGE,
    VoiceTranscriptionError,
    clean_transcript,
    is_transcript_unclear,
    normalize_transcript,
    transcribe_audio,
)

logger = logging.getLogger("plane.voice")


async def process_voice_ticket(
    api_key: str,
    audio_file=None,
    transcript: str | None = None,
    duration_seconds=None,
    client_mime_type: str | None = None,
) -> dict:
    """Transcribe audio when needed, then generate structured ticket draft fields."""
    if transcript:
        transcript = clean_transcript(transcript.strip())
        if is_transcript_unclear(transcript):
            raise VoiceTranscriptionError(UNCLEAR_SPEECH_MESSAGE)
        transcript = normalize_transcript(transcript)
    elif audio_file:
        transcript = await transcribe_audio(
            api_key, audio_file, duration_seconds=duration_seconds, client_mime_type=client_mime_type
        )
    else:
        transcript = ""

    if not transcript:
        raise ValueError("An audio recording or transcript is required.")

    transcript, _corrections_applied = correct_transcript(transcript)

    fields = await generate_ticket_fields(api_key, transcript)
    fields["transcript"] = transcript
    logger.info("voice_ticket.extraction generated_title=%r", fields.get("title"))
    return fields
