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
    <div className="flex h-10 w-full min-w-[220px] items-center gap-2 rounded-lg border border-subtle bg-surface-1 px-3 text-placeholder shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-colors focus-within:border-accent-strong md:w-[300px]">
      <SearchIcon className="h-3.5 w-3.5 shrink-0" />
      <input
        className="w-full border-none bg-transparent text-13 text-primary placeholder:text-placeholder focus:outline-none"
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => updateSearchQuery(e.target.value)}
        onKeyDown={handleInputKeyDown}
      />
      {searchQuery.trim() !== "" && (
        <button type="button" className="grid place-items-center text-tertiary" onClick={() => updateSearchQuery("")}>
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});
