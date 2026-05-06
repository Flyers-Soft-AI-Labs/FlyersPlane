/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Button } from "@plane/propel/button";

type Props = {
  onInviteClick?: () => void;
  canInvite?: boolean;
};

export const MembersWorkspaceSettingsHeader = observer(function MembersWorkspaceSettingsHeader({
  onInviteClick,
  canInvite,
}: Props) {
  return (
    <div className="flyers-soft-teams-page-header flex w-full items-center justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="flyers-soft-teams-page-title">Teams</h1>
        <p className="flyers-soft-teams-page-subtitle">Manage members, roles, and invites</p>
      </div>
      {canInvite && onInviteClick && (
        <Button variant="primary" size="sm" className="flyers-soft-teams-add-button shrink-0" onClick={onInviteClick}>
          Add Team Member
        </Button>
      )}
    </div>
  );
});
