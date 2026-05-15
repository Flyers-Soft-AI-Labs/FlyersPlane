/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
// types
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspaceBulkInviteFormData } from "@plane/types";
import { cn } from "@plane/utils";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { MemberListFiltersDropdown } from "@/components/project/dropdowns/filters/member-list";
import { WorkspaceMembersList } from "@/components/workspace/settings/members-list";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUserPermissions } from "@/hooks/store/user";
// plane web components
import { SendWorkspaceInvitationModal } from "@/plane-web/components/workspace/members";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
// local imports
import type { Route } from "./+types/page";
import { MembersWorkspaceSettingsHeader } from "./header";

const WorkspaceMembersSettingsPage = observer(function WorkspaceMembersSettingsPage({ params }: Route.ComponentProps) {
  // states
  const [inviteModal, setInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // router
  const { workspaceSlug } = params;
  // store hooks
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const {
    workspace: { inviteMembersToWorkspace, filtersStore },
  } = useMember();
  const { currentWorkspace } = useWorkspace();
  const { t } = useTranslation();

  // derived values
  const canPerformWorkspaceAdminActions = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  const canPerformWorkspaceMemberActions = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  const handleWorkspaceInvite = async (data: IWorkspaceBulkInviteFormData) => {
    try {
      await inviteMembersToWorkspace(workspaceSlug, data);

      setInviteModal(false);

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Success!",
        message: t("workspace_settings.settings.members.invitations_sent_successfully"),
      });
    } catch (error: unknown) {
      let message = undefined;
      if (error instanceof Error) {
        const err = error as Error & { error?: string };
        message = err.error;
      }
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: `${message ?? t("something_went_wrong_please_try_again")}`,
      });

      throw error;
    }
  };

  // Handler for role filter updates
  const handleRoleFilterUpdate = (role: string) => {
    const currentFilters = filtersStore.filters;
    const currentRoles = currentFilters?.roles || [];
    const updatedRoles = currentRoles.includes(role) ? currentRoles.filter((r) => r !== role) : [...currentRoles, role];

    filtersStore.updateFilters({
      roles: updatedRoles.length > 0 ? updatedRoles : undefined,
    });
  };

  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Teams` : undefined;
  const appliedRoleFilters = filtersStore.filters?.roles || [];

  // if user is not authorized to view this page
  if (workspaceUserInfo && !canPerformWorkspaceMemberActions) {
    return <NotAuthorizedView section="settings" className="h-auto" />;
  }

  return (
    <SettingsContentWrapper
      header={
        <MembersWorkspaceSettingsHeader
          onInviteClick={() => setInviteModal(true)}
          canInvite={canPerformWorkspaceAdminActions}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={
            <MemberListFiltersDropdown
              appliedFilters={appliedRoleFilters}
              handleUpdate={handleRoleFilterUpdate}
              memberType="workspace"
            />
          }
        />
      }
      hugging
    >
      <PageHead title={pageTitle} />
      <SendWorkspaceInvitationModal
        isOpen={inviteModal}
        onClose={() => setInviteModal(false)}
        onSubmit={handleWorkspaceInvite}
      />
      <section
        className={cn("flyers-soft-teams-page size-full", {
          "opacity-60": !canPerformWorkspaceMemberActions,
        })}
      >
        <WorkspaceMembersList searchQuery={searchQuery} isAdmin={canPerformWorkspaceAdminActions} />
      </section>
    </SettingsContentWrapper>
  );
});

export default WorkspaceMembersSettingsPage;
