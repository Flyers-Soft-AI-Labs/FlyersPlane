/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { SearchIcon, CloseIcon } from "@plane/propel/icons";
// hooks
import { useProjectFilter } from "@/hooks/store/use-project-filter";

export const ProjectSearch = observer(function ProjectSearch() {
  // states
  const [isExpanded, setIsExpanded] = useState(false);
  // refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  // hooks
  const { searchQuery, updateSearchQuery } = useProjectFilter();

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (searchQuery.trim() !== "") updateSearchQuery("");
      setIsExpanded(false);
    }
  };

  const shouldShowInput = isExpanded || searchQuery.trim() !== "";

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [isExpanded]);

  return (
    <div
      className={`flyers-soft-dashboard-search flyers-soft-projects-search !h-9 max-w-full shrink-0 !gap-2 !rounded-lg text-12 focus-within:!border-[#e5e7eb] focus-within:!shadow-none ${
        shouldShowInput ? "is-expanded w-[220px] !px-3" : "is-collapsed !px-0"
      }`}
    >
      <button
        type="button"
        className="flyers-soft-projects-search-trigger"
        onClick={() => setIsExpanded(true)}
        aria-label="Search projects"
      >
        <SearchIcon className="h-3.5 w-3.5 shrink-0" />
      </button>
      {shouldShowInput && (
        <input
          ref={inputRef}
          className="min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-12 text-primary !shadow-none outline-none placeholder:text-placeholder focus:!shadow-none focus:outline-none"
          placeholder="Search projects..."
          value={searchQuery}
          onBlur={() => {
            if (searchQuery.trim() === "") setIsExpanded(false);
          }}
          onChange={(e) => updateSearchQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
      )}
      {shouldShowInput && searchQuery.trim() !== "" && (
        <button
          type="button"
          className="grid size-6 shrink-0 place-items-center rounded-md text-tertiary transition hover:bg-layer-transparent-hover hover:text-primary"
          onClick={() => updateSearchQuery("")}
          aria-label="Clear project search"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});
