/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { Mail, ShieldCheck, Users, UsersRound } from "lucide-react";
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

type TMembersTab = "members" | "invites";

export const WorkspaceMembersList = observer(function WorkspaceMembersList(props: {
  searchQuery: string;
  isAdmin: boolean;
}) {
  const { searchQuery, isAdmin } = props;
  const [activeTab, setActiveTab] = useState<TMembersTab>("members");

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
      getWorkspaceInvitationDetails,
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
  const pendingInvitationIds =
    workspaceMemberInvitationIds?.filter((invitationId) => {
      const invitation = getWorkspaceInvitationDetails(invitationId);
      return invitation && !invitation.responded_at && !invitation.accepted;
    }) ?? [];
  const searchedPendingInvitationIds =
    searchedInvitationsIds?.filter((invitationId) => pendingInvitationIds.includes(invitationId)) ?? [];
  const searchedMemberDetails = searchedMemberIds?.map((memberId) => getWorkspaceMemberDetails(memberId)) ?? [];
  const memberDetails = [
    ...searchedMemberDetails.filter((member) => member?.is_active !== false),
    ...searchedMemberDetails.filter((member) => member?.is_active === false),
  ];

  // stat counts (always from unfiltered totals)
  const totalMembers = workspaceMemberIds?.length ?? 0;
  const activeMembers =
    workspaceMemberIds?.filter((id) => {
      const d = getWorkspaceMemberDetails(id);
      return d?.is_active !== false;
    }).length ?? 0;
  const pendingInvites = pendingInvitationIds.length;
  const adminCount =
    workspaceMemberIds?.filter((id) => {
      const d = getWorkspaceMemberDetails(id);
      return d?.role === EUserPermissions.ADMIN && d?.is_active !== false;
    }).length ?? 0;
  const statCards = [
    {
      title: "Active Members",
      value: activeMembers,
      icon: Users,
      className: "flyers-soft-teams-stat-icon-purple",
    },
    {
      title: "Pending Invites",
      value: pendingInvites,
      icon: Mail,
      className: "flyers-soft-teams-stat-icon-neutral",
    },
    {
      title: "Admins",
      value: adminCount,
      icon: ShieldCheck,
      className: "flyers-soft-teams-stat-icon-blue",
    },
    {
      title: "Total Members",
      value: totalMembers,
      icon: UsersRound,
      className: "flyers-soft-teams-stat-icon-green",
    },
  ];
  const hasMembers = (memberDetails?.length ?? 0) > 0;
  const hasPendingInvites = searchedPendingInvitationIds.length > 0;
  const activeView: TMembersTab = isAdmin ? activeTab : "members";

  return (
    <>
      {/* ── Stat cards ── */}
      <div className="flyers-soft-teams-stats">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.title} className="flyers-soft-teams-stat-card">
              <span className={`flyers-soft-teams-stat-icon ${stat.className}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="flyers-soft-teams-stat-label">{stat.title}</span>
                <span className="flyers-soft-teams-stat-value">{stat.value}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Team Members card ── */}
      <div className="flyers-soft-teams-tabs" role="tablist" aria-label="Teams members views">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "members"}
          className="flyers-soft-teams-tab"
          onClick={() => setActiveTab("members")}
        >
          <span>All Members</span>
          <CountChip count={memberDetails?.length ?? 0} className="h-5" />
        </button>
        {isAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "invites"}
            className="flyers-soft-teams-tab"
            onClick={() => setActiveTab("invites")}
          >
            <span>Pending Invites</span>
            <CountChip count={searchedPendingInvitationIds.length} className="h-5" />
          </button>
        )}
      </div>

      {activeView === "members" && (
        <div className="flyers-soft-teams-members-panel">
          {hasMembers && <WorkspaceMembersListItem memberDetails={memberDetails ?? []} />}
          {!hasMembers && (
            <h4 className="flyers-soft-teams-empty-state text-center text-body-xs-regular text-placeholder">
              {t("no_matching_members")}
            </h4>
          )}
        </div>
      )}

      {/* ── Pending Invites card ── */}
      {isAdmin && activeView === "invites" && (
        <div className="flyers-soft-teams-invites-card">
          <div className="flyers-soft-teams-invites-header">
            <h4 className="text-13 font-semibold text-primary">Pending Invites</h4>
            <CountChip count={searchedPendingInvitationIds.length} className="m-auto ml-2 h-5" />
          </div>
          <div className="flyers-soft-teams-invites-table-header">
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Sent</span>
            <span>Actions</span>
          </div>
          <div className="flyers-soft-teams-invites-list">
            {hasPendingInvites ? (
              searchedPendingInvitationIds.map((invitationId) => (
                <WorkspaceInvitationsListItem key={invitationId} invitationId={invitationId} />
              ))
            ) : (
              <h4 className="flyers-soft-teams-empty-state text-center text-body-xs-regular text-placeholder">
                No pending invites
              </h4>
            )}
          </div>
        </div>
      )}
    </>
  );
});
