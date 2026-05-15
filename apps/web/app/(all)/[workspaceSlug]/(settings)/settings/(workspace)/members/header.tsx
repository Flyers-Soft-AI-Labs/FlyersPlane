/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { observer } from "mobx-react";
import { UserPlus } from "lucide-react";
import { Button } from "@plane/propel/button";
import { SearchIcon } from "@plane/propel/icons";

type Props = {
  onInviteClick?: () => void;
  canInvite?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: ReactNode;
};

export const MembersWorkspaceSettingsHeader = observer(function MembersWorkspaceSettingsHeader({
  onInviteClick,
  canInvite,
  searchQuery,
  onSearchChange,
  filters,
}: Props) {
  return (
    <div className="flyers-soft-teams-page-header flex w-full items-center justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="flyers-soft-teams-page-title">Teams</h1>
        <p className="flyers-soft-teams-page-subtitle">Manage members, roles, and invites</p>
      </div>
      <div className="flyers-soft-teams-header-actions flex items-center gap-2">
        <label className="flyers-soft-teams-search flex items-center gap-2">
          <SearchIcon className="h-3.5 w-3.5 text-placeholder" />
          <input
            className="min-w-0 flex-1 border-none bg-transparent text-body-xs-regular outline-none placeholder:text-placeholder"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
        <div className="flyers-soft-teams-filter">{filters}</div>
        {canInvite && onInviteClick && (
          <Button variant="primary" size="sm" className="flyers-soft-teams-add-button shrink-0" onClick={onInviteClick}>
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Team Member</span>
          </Button>
        )}
      </div>
    </div>
  );
});
