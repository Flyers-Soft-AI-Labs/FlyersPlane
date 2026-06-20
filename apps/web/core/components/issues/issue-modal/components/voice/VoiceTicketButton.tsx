/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { Mic } from "lucide-react";
// ui
import { Tooltip } from "@plane/ui";
// helpers
import { cn } from "@plane/utils";
// hooks
import type { TVoiceTicketState } from "@/hooks/use-voice-ticket";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  state?: TVoiceTicketState;
};

export const VoiceTicketButton = React.forwardRef<HTMLButtonElement, Props>(function VoiceTicketButton(
  { onClick, disabled, state = "idle" },
  ref
) {
  const isRecording = state === "recording";
  const tooltipContent =
    state === "recording" ? "Stop recording" : state === "processing" ? "Processing..." : "Record a voice ticket";

  return (
    <Tooltip tooltipContent={tooltipContent}>
      <button
        ref={ref}
        type="button"
        tabIndex={-1}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flyers-soft-voice-ticket-trigger my-auto grid size-10 shrink-0 place-items-center self-center rounded-full text-tertiary hover:text-primary hover:bg-layer-1 transition-colors disabled:opacity-50 disabled:pointer-events-none",
          isRecording && "flyers-soft-voice-ticket-trigger-recording text-danger-primary"
        )}
        aria-label={tooltipContent}
      >
        <Mic className={cn("size-[18px]", isRecording && "animate-pulse")} />
      </button>
    </Tooltip>
  );
});
