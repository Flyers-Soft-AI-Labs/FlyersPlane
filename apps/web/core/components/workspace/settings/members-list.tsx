/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { EUserPermissions } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// components
import { CountChip } from "@/components/common/count-chip";
import { MembersSettingsLoader } from "@/components/ui/loader/settings/members";
// hooks
import { useMember } from "@/hooks/store/use-member";
// local imports
import { WorkspaceInvitationsListItem } from "./invitations-list-item";
import { WorkspaceMembersListItem } from "./members-list-item";

export const WorkspaceMembersList = observer(function WorkspaceMembersList(props: {
  searchQuery: string;
  isAdmin: boolean;
}) {
  const { searchQuery, isAdmin } = props;

  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const {
    workspace: {
      fetchWorkspaceMembers,
      fetchWorkspaceMemberInvitations,
      workspaceMemberIds,
      getFilteredWorkspaceMemberIds,
      getSearchedWorkspaceMemberIds,
      workspaceMemberInvitationIds,
      getSearchedWorkspaceInvitationIds,
      getWorkspaceMemberDetails,
    },
  } = useMember();
  const { t } = useTranslation();

  // fetching workspace invitations
  useSWR(
    workspaceSlug ? `WORKSPACE_MEMBERS_AND_MEMBER_INVITATIONS_${workspaceSlug.toString()}` : null,
    workspaceSlug
      ? async () => {
          await fetchWorkspaceMemberInvitations(workspaceSlug.toString());
          await fetchWorkspaceMembers(workspaceSlug.toString());
        }
      : null
  );

  if (!workspaceMemberIds && !workspaceMemberInvitationIds) return <MembersSettingsLoader />;

  // derived values
  const filteredMemberIds = workspaceSlug ? getFilteredWorkspaceMemberIds(workspaceSlug.toString()) : [];
  const searchedMemberIds = searchQuery ? getSearchedWorkspaceMemberIds(searchQuery) : filteredMemberIds;
  const searchedInvitationsIds = getSearchedWorkspaceInvitationIds(searchQuery);
  const memberDetails = searchedMemberIds
    ?.map((memberId) => getWorkspaceMemberDetails(memberId))
    .sort((a, b) => {
      if (a?.is_active && !b?.is_active) return -1;
      if (!a?.is_active && b?.is_active) return 1;
      return 0;
    });

  // stat counts (always from unfiltered totals)
  const totalMembers = workspaceMemberIds?.length ?? 0;
  const pendingInvites = workspaceMemberInvitationIds?.length ?? 0;
  const adminCount =
    workspaceMemberIds?.filter((id) => {
      const d = getWorkspaceMemberDetails(id);
      return d?.role === EUserPermissions.ADMIN;
    }).length ?? 0;

  return (
    <>
      {/* ── Stat cards ── */}
      <div className="flyers-soft-teams-stats">
        <div className="flyers-soft-teams-stat-card">
          <span className="flyers-soft-teams-stat-label">Active Members</span>
          <span className="flyers-soft-teams-stat-value">{totalMembers}</span>
        </div>
        <div className="flyers-soft-teams-stat-card">
          <span className="flyers-soft-teams-stat-label">Pending Invites</span>
          <span className="flyers-soft-teams-stat-value">{pendingInvites}</span>
        </div>
        <div className="flyers-soft-teams-stat-card">
          <span className="flyers-soft-teams-stat-label">Admins</span>
          <span className="flyers-soft-teams-stat-value">{adminCount}</span>
        </div>
      </div>

      {/* ── Team Members card ── */}
      <div className="flyers-soft-teams-members-panel">
        {searchedMemberIds?.length !== 0 && <WorkspaceMembersListItem memberDetails={memberDetails ?? []} />}
        {searchedInvitationsIds?.length === 0 && searchedMemberIds?.length === 0 && (
          <h4 className="flyers-soft-teams-empty-state text-center text-body-xs-regular text-placeholder">
            {t("no_matching_members")}
          </h4>
        )}
      </div>

      {/* ── Pending Invites card ── */}
      {isAdmin && searchedInvitationsIds && searchedInvitationsIds.length > 0 && (
        <div className="flyers-soft-teams-invites-card">
          <div className="flyers-soft-teams-invites-header">
            <h4 className="text-13 font-semibold text-primary">Pending Invites</h4>
            <CountChip count={searchedInvitationsIds.length} className="m-auto ml-2 h-5" />
          </div>
          <div className="flyers-soft-teams-invites-list">
            {searchedInvitationsIds.map((invitationId) => (
              <WorkspaceInvitationsListItem key={invitationId} invitationId={invitationId} />
            ))}
          </div>
        </div>
      )}
    </>
  );
});
