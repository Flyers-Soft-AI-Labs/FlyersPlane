/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { Command } from "cmdk";
import { X } from "lucide-react";
import { useTranslation } from "@plane/i18n";
// plane imports
import { SearchIcon } from "@plane/propel/icons";
// local imports
import type { TPowerKContext, TPowerKPageType } from "../../core/types";
import { POWER_K_MODAL_PAGE_DETAILS } from "./constants";
import { PowerKModalContextIndicator } from "./context-indicator";

type Props = {
  activePage: TPowerKPageType | null;
  context: TPowerKContext;
  inputRef?: React.Ref<HTMLInputElement>;
  onSearchChange: (value: string) => void;
  searchTerm: string;
};

export function PowerKModalHeader(props: Props) {
  const { activePage, context, inputRef, onSearchChange, searchTerm } = props;
  // translation
  const { t } = useTranslation();
  // derived values
  const placeholder = activePage
    ? t(POWER_K_MODAL_PAGE_DETAILS[activePage].i18n_placeholder)
    : t("power_k.page_placeholders.default");

  return (
    <div className="flyers-soft-command-palette-header border-b border-subtle">
      {/* Context Indicator */}
      {context.shouldShowContextBasedActions && !activePage && (
        <PowerKModalContextIndicator
          activeContext={context.activeContext}
          handleClearContext={() => context.setShouldShowContextBasedActions(false)}
        />
      )}

      {/* Search Input */}
      <div className="flyers-soft-command-palette-search-row flex items-center gap-2 px-4 py-3">
        <SearchIcon className="size-4 shrink-0 text-placeholder" />
        <Command.Input
          aria-label="Search commands"
          ref={inputRef}
          value={searchTerm}
          onValueChange={onSearchChange}
          placeholder={placeholder}
          className="flyers-soft-command-palette-search-input flex-1 bg-transparent text-13 text-primary placeholder-(--text-color-placeholder) outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
            className="flyers-soft-command-palette-clear flex-shrink-0 rounded-sm p-1 text-placeholder hover:bg-layer-1 hover:text-secondary"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
