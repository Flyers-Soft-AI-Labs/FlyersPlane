/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { SearchIcon, CloseIcon } from "@plane/propel/icons";
// hooks
import { useProjectFilter } from "@/hooks/store/use-project-filter";

export const ProjectSearch = observer(function ProjectSearch() {
  // hooks
  const { searchQuery, updateSearchQuery } = useProjectFilter();

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && searchQuery.trim() !== "") updateSearchQuery("");
  };

  return (
    <div className="flyers-soft-dashboard-search flyers-soft-projects-search !h-9 w-[320px] max-w-full shrink-0 !gap-2 !rounded-lg !px-3 text-12 focus-within:!border-[#e5e7eb] focus-within:!shadow-[0_0_0_3px_rgba(17, 24, 39, 0.12)] lg:w-[340px]">
      <SearchIcon className="h-3.5 w-3.5 shrink-0" />
      <input
        className="min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-12 text-primary !shadow-none outline-none placeholder:text-placeholder focus:!shadow-none focus:outline-none"
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => updateSearchQuery(e.target.value)}
        onKeyDown={handleInputKeyDown}
      />
      {searchQuery.trim() !== "" && (
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
