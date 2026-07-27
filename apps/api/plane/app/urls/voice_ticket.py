# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views import VoiceTicketEndpoint, VoiceTicketDebugAudioEndpoint

urlpatterns = [
    path(
        "issues/voice-transcribe/",
        VoiceTicketEndpoint.as_view(),
        name="voice-transcribe",
    ),
    # Temporary diagnostic endpoint for the audio-pipeline investigation; 404s unless
    # VOICE_DEBUG_SAVE_AUDIO=1 is set. Remove once the investigation is complete.
    path(
        "issues/voice-transcribe/debug-audio/<str:debug_id>/",
        VoiceTicketDebugAudioEndpoint.as_view(),
        name="voice-transcribe-debug-audio",
    ),
]
