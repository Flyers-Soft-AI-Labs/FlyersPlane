# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Temporary diagnostic tooling for the Voice-to-Ticket audio pipeline.

When real-user transcripts come back as fluent but completely unrelated text (e.g. "So we are
in the game..." for "Frontend button not responding on mobile"), that's an acoustic recognition
failure, not a vocabulary problem - Whisper never received a usable recording of the words that
were actually spoken. To find *where* the audio degrades (client capture, encoding, upload, or
the Groq call itself), this module persists exactly what the server received so it can be played
back and compared against the original recording and the transcript it produced.

Disabled by default - enable with the VOICE_DEBUG_SAVE_AUDIO=1 environment variable. Should only
ever be turned on temporarily, on a non-production instance, while diagnosing this issue.
"""

import json
import logging
import os
import re
import uuid

logger = logging.getLogger("plane.voice")

_DEBUG_ID_RE = re.compile(r"^[0-9a-f]{12}$")

_EXTENSION_BY_CONTENT_TYPE = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
}


def is_enabled() -> bool:
    return os.environ.get("VOICE_DEBUG_SAVE_AUDIO", "0") == "1"


def _debug_dir() -> str:
    base_dir = os.getcwd()
    try:
        from django.conf import settings

        base_dir = getattr(settings, "BASE_DIR", base_dir)
    except Exception:
        pass
    path = os.path.join(base_dir, "voice_debug_audio")
    os.makedirs(path, exist_ok=True)
    return path


def _extension_for(content_type: str, filename: str) -> str:
    base_type = (content_type or "").split(";")[0].strip().lower()
    if base_type in _EXTENSION_BY_CONTENT_TYPE:
        return _EXTENSION_BY_CONTENT_TYPE[base_type]
    _, ext = os.path.splitext(filename or "")
    return ext.lstrip(".").lower() or "bin"


def save_debug_audio(
    *,
    audio_bytes: bytes,
    filename: str,
    upload_content_type: str,
    client_mime_type: str | None,
    duration_seconds,
    raw_transcript: str,
    rejected: bool,
    confidence: dict | None = None,
) -> str | None:
    """Writes the raw uploaded audio bytes plus a metadata sidecar to disk and returns a
    debug_id that can be fetched back via the debug-audio endpoint. No-op unless
    VOICE_DEBUG_SAVE_AUDIO=1. Saves every upload while enabled (not only failures) so a
    successful recording can be diffed against a failed one."""
    if not is_enabled():
        return None

    debug_id = uuid.uuid4().hex[:12]
    extension = _extension_for(upload_content_type, filename)
    debug_dir = _debug_dir()

    with open(os.path.join(debug_dir, f"{debug_id}.{extension}"), "wb") as f:
        f.write(audio_bytes)

    metadata = {
        "debug_id": debug_id,
        "original_filename": filename,
        "upload_content_type": upload_content_type,
        "client_mime_type": client_mime_type,
        "duration_seconds": duration_seconds,
        "file_size_bytes": len(audio_bytes),
        "raw_transcript": raw_transcript,
        "rejected": rejected,
        "confidence": confidence or {},
        "saved_extension": extension,
    }
    with open(os.path.join(debug_dir, f"{debug_id}.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("voice_ticket.debug_audio_saved debug_id=%s metadata=%s", debug_id, json.dumps(metadata))
    return debug_id


def load_debug_audio(debug_id: str):
    """Returns (audio_bytes, content_type, metadata) for a previously saved recording, or None
    if disabled / not found / the id is malformed."""
    if not is_enabled() or not _DEBUG_ID_RE.match(debug_id or ""):
        return None

    debug_dir = _debug_dir()
    meta_path = os.path.join(debug_dir, f"{debug_id}.json")
    if not os.path.isfile(meta_path):
        return None

    with open(meta_path, encoding="utf-8") as f:
        metadata = json.load(f)

    audio_path = os.path.join(debug_dir, f"{debug_id}.{metadata['saved_extension']}")
    if not os.path.isfile(audio_path):
        return None

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    return audio_bytes, metadata.get("upload_content_type") or "application/octet-stream", metadata
