# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import logging
import re

from . import voice_debug
from .groq_http import GroqAPIError, request_groq

logger = logging.getLogger("plane.voice")

# Software-development vocabulary passed as a Whisper "prompt" hint so the
# model biases its decoding toward the terms voice tickets actually use.
TRANSCRIPTION_PROMPT = (
    "bug, issue, login, dashboard, backend, frontend, export, authentication, "
    "API, database, deployment, ticket, priority, crash, error"
)

MIN_MEANINGFUL_WORDS = 2
UNCLEAR_SPEECH_MESSAGE = "Speech not recognized clearly. Please try again."

# Whisper hallucinates fluent-but-unrelated sentences on silent/very-quiet/noise-only audio
# instead of returning nothing. verbose_json exposes per-segment no_speech_prob/avg_logprob,
# which is the standard signal for catching that case before it reaches the ticket draft.
NO_SPEECH_PROB_THRESHOLD = 0.5
AVG_LOGPROB_THRESHOLD = -1.0


class VoiceTranscriptionError(Exception):
    pass


# Maps common mis-transcriptions / shorthand speech onto the phrasing the
# ticket-generation prompt expects, so priority intent survives Whisper's
# transcription (e.g. "hyper" is a frequent mis-hearing of "high priority").
# "urgent" is intentionally NOT normalized here - it is its own distinct priority
# level (separate from "high"), and the LLM prompt maps it directly to "urgent".
_NORMALIZATION_RULES = [
    (re.compile(r"\bhyper\b", re.IGNORECASE), "high priority"),
    (re.compile(r"\bhi[\s-]?priority\b", re.IGNORECASE), "high priority"),
]

# Filler words Whisper frequently transcribes verbatim from hesitant speech.
_FILLER_WORD_PATTERN = re.compile(
    r"\b(?:uh+|um+|erm+|hmm+|like|you know|i mean)\b[,]?", re.IGNORECASE
)

# A run of 1-6 words immediately repeating itself (e.g. "cannot cannot reset", "the page the page").
_REPEATED_PHRASE_PATTERN = re.compile(
    r"\b(\w+(?:\s+\w+){0,5})\s+\1\b", re.IGNORECASE
)


def normalize_transcript(text: str) -> str:
    """Apply speech-normalization rules before the transcript is handed to the LLM."""
    normalized = text
    for pattern, replacement in _NORMALIZATION_RULES:
        normalized = pattern.sub(replacement, normalized)
    return normalized


def clean_transcript(text: str) -> str:
    """Strip filler words, collapsed repeats, and stray whitespace/line breaks without changing meaning."""
    cleaned = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    cleaned = _FILLER_WORD_PATTERN.sub("", cleaned)

    # Repeated phrases can chain (e.g. "the the the page"), so collapse until stable.
    previous = None
    while previous != cleaned:
        previous = cleaned
        cleaned = _REPEATED_PHRASE_PATTERN.sub(r"\1", cleaned)

    cleaned = re.sub(r"\s+([,.!?])", r"\1", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _meaningful_word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9]+", text))


def is_transcript_unclear(text: str) -> bool:
    """True when the transcript is empty, too short, or mostly noise to build a ticket from."""
    return _meaningful_word_count(text) < MIN_MEANINGFUL_WORDS


async def transcribe_audio(
    api_key: str, audio_file, duration_seconds=None, client_mime_type: str | None = None
) -> str:
    """Transcribe an uploaded audio file to text using Groq Whisper Large V3, forced to English."""
    audio_bytes = audio_file.read()
    filename = getattr(audio_file, "name", "recording.webm")
    content_type = getattr(audio_file, "content_type", None) or "application/octet-stream"

    logger.info(
        "voice_ticket.audio received file_size_bytes=%s content_type=%s client_mime_type=%s "
        "filename=%s duration_seconds=%s",
        len(audio_bytes),
        content_type,
        client_mime_type,
        filename,
        duration_seconds,
    )

    def _save_debug(raw_transcript: str, rejected: bool, confidence: dict | None = None) -> None:
        debug_id = voice_debug.save_debug_audio(
            audio_bytes=audio_bytes,
            filename=filename,
            upload_content_type=content_type,
            client_mime_type=client_mime_type,
            duration_seconds=duration_seconds,
            raw_transcript=raw_transcript,
            rejected=rejected,
            confidence=confidence,
        )
        if debug_id:
            logger.info("voice_ticket.debug_audio_id %s", debug_id)

    try:
        response = await request_groq(
            "POST",
            "/audio/transcriptions",
            api_key,
            data={
                "model": "whisper-large-v3",
                "response_format": "verbose_json",
                "language": "en",
                "prompt": TRANSCRIPTION_PROMPT,
                "temperature": 0,
            },
            files={
                "file": (filename, audio_bytes, content_type),
            },
        )
    except GroqAPIError as e:
        _save_debug("", True, {"groq_error": str(e)})
        raise VoiceTranscriptionError(str(e)) from e

    try:
        payload = response.json()
    except ValueError:
        payload = None

    if isinstance(payload, dict):
        raw_text = str(payload.get("text") or "").strip()
        segments = payload.get("segments") or []
    else:
        # Defensive fallback in case the API ever returns plain text for this format.
        raw_text = response.text.strip()
        segments = []

    logger.info("voice_ticket.transcription raw_transcript=%r", raw_text)

    confidence: dict = {}
    rejected = not raw_text or is_transcript_unclear(raw_text)

    if segments:
        avg_no_speech_prob = sum(s.get("no_speech_prob", 0) for s in segments) / len(segments)
        avg_logprob = sum(s.get("avg_logprob", 0) for s in segments) / len(segments)
        confidence = {"avg_no_speech_prob": avg_no_speech_prob, "avg_logprob": avg_logprob}
        logger.info(
            "voice_ticket.transcription confidence avg_no_speech_prob=%.3f avg_logprob=%.3f",
            avg_no_speech_prob,
            avg_logprob,
        )
        if avg_no_speech_prob > NO_SPEECH_PROB_THRESHOLD or avg_logprob < AVG_LOGPROB_THRESHOLD:
            rejected = True

    cleaned = clean_transcript(raw_text) if raw_text else ""
    if not rejected and is_transcript_unclear(cleaned):
        rejected = True

    _save_debug(raw_text, rejected, confidence)

    if rejected:
        raise VoiceTranscriptionError(UNCLEAR_SPEECH_MESSAGE)

    text = normalize_transcript(cleaned)
    logger.info("voice_ticket.transcription cleaned_transcript=%r", text)
    return text
