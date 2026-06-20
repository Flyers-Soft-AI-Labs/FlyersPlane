/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// helpers
import { API_BASE_URL } from "@plane/constants";
// services
import { APIService } from "@/services/api.service";

export type TVoiceTicketFields = {
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low" | "none";
  assignee_name: string | null;
  labels: string[];
  status_name: string | null;
  due_date: string | null;
  transcript: string;
};

// Maps the actual recorded mimeType to a matching file extension. Sending a mismatched
// container/extension (e.g. an mp4-encoded blob named "recording.webm") makes the upstream
// decoder mis-parse the audio, which is a frequent cause of garbled/hallucinated transcripts.
const AUDIO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

const getAudioFileExtension = (mimeType: string) => {
  const base = mimeType.split(";")[0]?.trim().toLowerCase();
  return AUDIO_EXTENSION_BY_MIME_TYPE[base] ?? "webm";
};

export class VoiceTicketService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  private async generateTicket(workspaceSlug: string, formData: FormData): Promise<TVoiceTicketFields> {
    formData.set("workspace_slug", workspaceSlug);

    return this.post("/api/issues/voice-transcribe/", formData)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async generateTicketFromVoice(
    workspaceSlug: string,
    audioBlob: Blob,
    durationSeconds?: number
  ): Promise<TVoiceTicketFields> {
    const formData = new FormData();
    const filename = `recording.${getAudioFileExtension(audioBlob.type)}`;
    formData.append("audio", audioBlob, filename);
    // Sent alongside the blob's own Content-Type so the server can log/compare the two -
    // diagnostic signal for whether the recorder's selected mimeType ever diverges in transit.
    formData.append("client_mime_type", audioBlob.type);
    if (typeof durationSeconds === "number") {
      formData.append("duration_seconds", String(durationSeconds));
    }

    // Don't set Content-Type manually for FormData; the browser/axios needs
    // to generate the multipart boundary itself.
    return this.generateTicket(workspaceSlug, formData);
  }

  async generateTicketFromTranscript(workspaceSlug: string, transcript: string): Promise<TVoiceTicketFields> {
    const formData = new FormData();
    formData.append("transcript", transcript);

    return this.generateTicket(workspaceSlug, formData);
  }
}

export const voiceTicketService = new VoiceTicketService();
