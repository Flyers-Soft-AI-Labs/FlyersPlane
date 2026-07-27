/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useRef, useState } from "react";
// services
import { voiceTicketService, type TVoiceTicketFields } from "@/services/voice-ticket.service";

export type TVoiceTicketState = "idle" | "recording" | "processing" | "success" | "error";

const MAX_RECORDING_SECONDS = 60;

// Ordered by preference; the first one MediaRecorder.isTypeSupported() accepts is used.
const PREFERRED_AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

const RECORDING_AUDIO_BITS_PER_SECOND = 128000;

// Whisper hallucinates fluent-but-unrelated text when fed near-empty audio (a click or two of
// silence). Recordings shorter than this are rejected client-side before they ever reach the API.
const MIN_RECORDING_DURATION_MS = 700;

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return PREFERRED_AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
};

// Routes the raw mic stream through a highpass filter (cuts handling/rumble noise below speech
// range) and a dynamics compressor (normalizes loudness) before MediaRecorder encodes it. Quiet
// or noisy input is a major contributor to Whisper transcription errors.
const buildProcessedStream = (
  sourceStream: MediaStream
): { stream: MediaStream; audioContext: AudioContext | null } => {
  const AudioContextCtor =
    typeof window !== "undefined" &&
    (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AudioContextCtor) return { stream: sourceStream, audioContext: null };

  try {
    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(sourceStream);

    const highpass = audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 80;

    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const destination = audioContext.createMediaStreamDestination();
    source.connect(highpass);
    highpass.connect(compressor);
    compressor.connect(destination);

    return { stream: destination.stream, audioContext };
  } catch {
    return { stream: sourceStream, audioContext: null };
  }
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as { error?: unknown; message?: unknown };
    if (typeof maybeError.error === "string") return maybeError.error;
    if (typeof maybeError.message === "string") return maybeError.message;
  }

  return "We couldn't create a ticket from that recording. Please try again.";
};

export const useVoiceTicket = (
  workspaceSlug: string | undefined,
  options?: { maxRecordingSeconds?: number; onAutoStop?: () => void }
) => {
  const maxRecordingSeconds = options?.maxRecordingSeconds ?? MAX_RECORDING_SECONDS;
  const onAutoStop = options?.onAutoStop;
  const [state, setState] = useState<TVoiceTicketState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TVoiceTicketFields | null>(null);
  const [transcript, setTranscript] = useState("");
  const [resultVersion, setResultVersion] = useState(0);
  const [appliedResultVersion, setAppliedResultVersion] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef(0);
  const recordingMimeTypeRef = useRef<string>("audio/webm");
  const recordingStartedAtRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      stopTimer();
      stopStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
    };
  }, [stopStream, stopTimer]);

  const storeResult = useCallback((fields: TVoiceTicketFields, fallbackTranscript?: string) => {
    const resolvedTranscript = fields.transcript?.trim() ? fields.transcript : fallbackTranscript ?? "";
    const nextFields = { ...fields, transcript: resolvedTranscript };

    setTranscript(resolvedTranscript);
    setResult(nextFields);
    setResultVersion((version) => version + 1);
    setState("success");
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    stopTimer();
    stopStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setElapsedSeconds(0);
    setError(null);
    setResult(null);
    setTranscript("");
    setResultVersion(0);
    setAppliedResultVersion(0);
    setState("idle");
  }, [stopStream, stopTimer]);

  const markError = useCallback((message: string) => {
    setError(message);
    setState("error");
  }, []);

  const markResultApplied = useCallback(() => {
    setAppliedResultVersion(resultVersion);
  }, [resultVersion]);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, [stopTimer]);

  const processRecording = useCallback(async () => {
    if (!workspaceSlug) return;
    const audioBlob = new Blob(chunksRef.current, { type: recordingMimeTypeRef.current });
    if (audioBlob.size === 0) {
      setError("No audio was captured. Please check your microphone and try again.");
      setState("error");
      return;
    }

    const elapsedMs = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0;
    if (elapsedMs > 0 && elapsedMs < MIN_RECORDING_DURATION_MS) {
      setError("Recording was too short to transcribe. Please hold the mic and speak for at least a second.");
      setState("error");
      return;
    }
    const durationSeconds = elapsedMs ? Math.round(elapsedMs / 1000) : undefined;

    const requestId = (requestIdRef.current += 1);
    setState("processing");
    setError(null);
    try {
      const fields = await voiceTicketService.generateTicketFromVoice(workspaceSlug, audioBlob, durationSeconds);
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      storeResult(fields);
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      setError(getErrorMessage(err));
      setState("error");
    }
  }, [storeResult, workspaceSlug]);

  const generateFromTranscript = useCallback(
    async (nextTranscript?: string) => {
      if (!workspaceSlug) return;

      const sourceTranscript = nextTranscript ?? transcript;
      const trimmedTranscript = sourceTranscript.trim();
      setTranscript(sourceTranscript);

      if (!trimmedTranscript) {
        setError("Transcript is empty. Please record again or add transcript text.");
        setState("error");
        return;
      }

      const requestId = (requestIdRef.current += 1);
      stopTimer();
      stopStream();
      setState("processing");
      setError(null);
      setResult(null);
      try {
        const fields = await voiceTicketService.generateTicketFromTranscript(workspaceSlug, trimmedTranscript);
        if (!isMountedRef.current || requestId !== requestIdRef.current) return;
        storeResult(fields, trimmedTranscript);
      } catch (err) {
        if (!isMountedRef.current || requestId !== requestIdRef.current) return;
        setError(getErrorMessage(err));
        setState("error");
      }
    },
    [stopStream, stopTimer, storeResult, transcript, workspaceSlug]
  );

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || state === "recording" || state === "processing") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording isn't supported in this browser.");
      setState("error");
      return;
    }

    isStartingRef.current = true;
    try {
      setError(null);
      setResult(null);
      setTranscript("");
      setResultVersion(0);
      setAppliedResultVersion(0);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 16000 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const { stream: recordingStream, audioContext } = buildProcessedStream(stream);
      audioContextRef.current = audioContext;

      const mimeType = getSupportedMimeType();
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(recordingStream, { mimeType, audioBitsPerSecond: RECORDING_AUDIO_BITS_PER_SECOND })
          : new MediaRecorder(recordingStream);
      } catch {
        // Fall back to browser defaults if the preferred mimeType/bitrate combination is rejected.
        mediaRecorder = new MediaRecorder(recordingStream);
      }
      recordingMimeTypeRef.current = mediaRecorder.mimeType || "audio/webm";
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.info("[voice-ticket] recording with mimeType:", recordingMimeTypeRef.current);
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        stopStream();
        void processRecording();
      };

      recordingStartedAtRef.current = Date.now();
      // Request periodic chunks so longer recordings aren't held in a single
      // in-memory buffer until stop(), and so no audio is dropped on stop.
      mediaRecorder.start(1000);
      setState("recording");
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= maxRecordingSeconds) {
            onAutoStopRef.current?.();
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError("We couldn't access your microphone. Please check your browser permissions and try again.");
      setState("error");
    } finally {
      isStartingRef.current = false;
    }
  }, [maxRecordingSeconds, processRecording, state, stopRecording, stopStream]);

  const cancelRecording = useCallback(() => {
    stopTimer();
    stopStream();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    reset();
  }, [reset, stopStream, stopTimer]);

  return {
    state,
    elapsedSeconds,
    error,
    result,
    transcript,
    resultVersion,
    appliedResultVersion,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    markError,
    markResultApplied,
    setTranscript,
    generateFromTranscript,
  };
};
