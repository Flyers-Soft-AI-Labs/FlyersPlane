/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
import type { Control, FormState } from "react-hook-form";
import { Controller } from "react-hook-form";
// plane imports
import { ETabIndices } from "@plane/constants";
// types
import { useTranslation } from "@plane/i18n";
import type { TIssue } from "@plane/types";
// ui
import { Input } from "@plane/ui";
// helpers
import { cn, getTabIndex } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
import type { TVoiceTicketState } from "@/hooks/use-voice-ticket";
// components
import { VoiceTicketButton } from "./voice";

type TIssueTitleInputProps = {
  control: Control<TIssue>;
  issueTitleRef: React.MutableRefObject<HTMLInputElement | null>;
  formState: FormState<TIssue>;
  handleFormChange: () => void;
  onVoiceClick?: () => void;
  voiceState?: TVoiceTicketState;
  isVoiceDisabled?: boolean;
};

export const IssueTitleInput = observer(function IssueTitleInput(props: TIssueTitleInputProps) {
  const {
    control,
    issueTitleRef,
    formState: { errors },
    handleFormChange,
    onVoiceClick,
    voiceState = "idle",
    isVoiceDisabled,
  } = props;
  // store hooks
  const { isMobile } = usePlatformOS();
  const { t } = useTranslation();

  const { getIndex } = getTabIndex(ETabIndices.ISSUE_FORM, isMobile);

  const validateWhitespace = (value: string) => {
    if (value.trim() === "") {
      return t("title_is_required");
    }
    return undefined;
  };
  return (
    <div>
      <Controller
        control={control}
        name="name"
        rules={{
          validate: validateWhitespace,
          required: t("title_is_required"),
          maxLength: {
            value: 255,
            message: t("title_should_be_less_than_255_characters"),
          },
        }}
        render={({ field: { value, onChange, ref } }) => (
          <div className="flyers-soft-title-input-shell relative flex w-full items-stretch">
            <Input
              id="name"
              name="name"
              type="text"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                handleFormChange();
              }}
              ref={issueTitleRef || ref}
              hasError={Boolean(errors.name)}
              placeholder={t("title")}
              className={cn(
                "w-full min-w-0 flex-1 text-body-sm-regular",
                onVoiceClick && "flyers-soft-title-input-with-voice pr-1"
              )}
              autoFocus
              tabIndex={getIndex("name")}
            />
            {onVoiceClick && (
              <VoiceTicketButton onClick={onVoiceClick} disabled={isVoiceDisabled} state={voiceState} />
            )}
          </div>
        )}
      />
      <span className="text-caption-sm-medium text-danger-primary">{errors?.name?.message}</span>
    </div>
  );
});
