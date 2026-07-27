/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState } from "react";
import { Check, CircleAlert, LoaderCircle, Mic, Pencil, RotateCcw, Sparkles, Square } from "lucide-react";
// ui
import { Button } from "@plane/propel/button";
import { EModalPosition, EModalWidth, ModalCore, TextArea } from "@plane/ui";
// helpers
import { cn } from "@plane/utils";
// hooks
import type { TVoiceTicketState } from "@/hooks/use-voice-ticket";
// services
import type { TVoiceTicketFields } from "@/services/voice-ticket.service";

type TVoiceTicketModalProps = {
  isOpen: boolean;
  state: TVoiceTicketState;
  elapsedSeconds: number;
  transcript: string;
  result: TVoiceTicketFields | null;
  error: string | null;
  onClose: () => void;
  onStop: () => void;
  onRetry: () => void;
  onRegenerate: () => void;
  onTranscriptChange: (value: string) => void;
};

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const ChecklistRow: React.FC<{ label: string; done: boolean }> = ({ label, done }) => (
  <div className="flex items-center gap-2 text-13">
    <span
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full",
        done ? "bg-success-subtle text-success-primary" : "bg-layer-1 text-tertiary"
      )}
    >
      <Check className="size-2.5" strokeWidth={3} />
    </span>
    <span className={cn(done ? "text-primary" : "text-tertiary")}>{label}</span>
  </div>
);

export const VoiceTicketModal: React.FC<TVoiceTicketModalProps> = (props) => {
  const {
    isOpen,
    state,
    elapsedSeconds,
    transcript,
    result,
    error,
    onClose,
    onStop,
    onRetry,
    onRegenerate,
    onTranscriptChange,
  } = props;
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  const handleClose = () => {
    setIsTranscriptOpen(false);
    setIsEditingTranscript(false);
    onClose();
  };

  const hasTranscript = transcript.trim().length > 0;

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XL}>
      <div className="flex flex-col items-center gap-5 px-6 py-9 text-center sm:px-10">
        {state === "recording" && (
          <>
            <span className="relative grid size-20 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-danger-subtle" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-danger-subtle" />
              <span className="relative grid size-12 place-items-center rounded-full bg-danger-primary text-white">
                <Mic className="size-5" />
              </span>
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-18 font-semibold text-primary">Listening...</h3>
              <p className="text-13 text-secondary">Describe your issue naturally.</p>
              <p className="text-13 text-secondary">We&apos;ll generate a ticket draft.</p>
            </div>
            <span className="rounded-full bg-layer-1 px-3 py-1 text-13 font-medium tabular-nums text-secondary">
              {formatTime(elapsedSeconds)}
            </span>
            <Button variant="error-fill" size="base" prependIcon={<Square className="size-3.5" />} onClick={onStop}>
              Stop Recording
            </Button>
          </>
        )}

        {state === "processing" && (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-layer-1">
              <LoaderCircle className="size-7 animate-spin text-secondary" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-18 font-semibold text-primary">Processing...</h3>
              <p className="text-13 text-secondary">Turning your recording into a ticket draft.</p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-success-subtle">
              <Sparkles className="size-7 text-success-primary" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-18 font-semibold text-primary">Ticket Draft Generated</h3>
              <p className="text-13 text-secondary">Review the generated ticket before creating it.</p>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-lg border border-subtle bg-layer-1 px-4 py-3 text-left">
              <ChecklistRow label="Title generated" done={Boolean(result?.title?.trim())} />
              <ChecklistRow label="Description generated" done={Boolean(result?.description?.trim())} />
              <ChecklistRow label="Priority detected" done={Boolean(result?.priority && result.priority !== "none")} />
              <ChecklistRow label="Labels suggested" done={Boolean(result?.labels?.length)} />
            </div>

            {isTranscriptOpen && (
              <div className="w-full rounded-lg border border-subtle bg-layer-1 px-4 py-3 text-left">
                <span className="text-12 font-medium uppercase tracking-wide text-tertiary">Transcript</span>
                {isEditingTranscript ? (
                  <TextArea
                    id="voice-ticket-transcript"
                    value={transcript}
                    onChange={(event) => onTranscriptChange(event.target.value)}
                    rows={4}
                    mode="primary"
                    className="mt-2 w-full text-13"
                    autoFocus
                  />
                ) : (
                  <p className="mt-2 text-13 italic text-secondary">
                    {hasTranscript ? `"${transcript.trim()}"` : "No transcript captured."}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    prependIcon={<Pencil className="size-3.5" />}
                    onClick={() => setIsEditingTranscript((prev) => !prev)}
                  >
                    {isEditingTranscript ? "Done Editing" : "Edit Transcript"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    prependIcon={<RotateCcw className="size-3.5" />}
                    onClick={onRegenerate}
                    disabled={!hasTranscript}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            )}

            <div className="flex w-full items-center gap-3">
              <Button
                variant="secondary"
                size="base"
                className="flex-1"
                onClick={() => setIsTranscriptOpen((prev) => !prev)}
              >
                {isTranscriptOpen ? "Hide Transcript" : "Review Transcript"}
              </Button>
              <Button variant="primary" size="base" className="flex-1" onClick={handleClose}>
                Continue
              </Button>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-danger-subtle">
              <CircleAlert className="size-7 text-danger-primary" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-18 font-semibold text-primary">We couldn&apos;t generate that ticket</h3>
              <p className="text-13 text-secondary">{error}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="base" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" size="base" prependIcon={<Mic className="size-3.5" />} onClick={onRetry}>
                Try Again
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalCore>
  );
};
