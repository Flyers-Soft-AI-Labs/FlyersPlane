/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel, SIDEBAR_TRACKER_ELEMENTS } from "@plane/constants";
import { SidebarAddButton } from "@/components/sidebar/add-button";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";

export const SidebarQuickActions = observer(function SidebarQuickActions() {
  // router
  const { projectId: routerProjectId, workspaceSlug: routerWorkspaceSlug } = useParams();
  const router = useAppRouter();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  const projectId = routerProjectId?.toString();
  // store hooks
  const { toggleCreatePageModal } = useCommandPalette();
  const { joinedProjectIds } = useProject();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const canCreatePage = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );
  const disabled = joinedProjectIds.length === 0 || !canCreatePage;

  const handleCreatePage = () => {
    if (!workspaceSlug || disabled) return;

    toggleCreatePageModal({ isOpen: true });
    if (!projectId) router.push(`/${workspaceSlug}/projects/${joinedProjectIds[0]}/pages/`);
  };

  return (
    <div className="flex cursor-pointer items-center justify-between gap-2">
      <SidebarAddButton
        label={
          <>
            <Plus className="size-4" strokeWidth={1.8} />
            <span className="max-w-[145px] truncate text-13 font-medium">New page</span>
          </>
        }
        onClick={handleCreatePage}
        disabled={disabled}
        data-ph-element={SIDEBAR_TRACKER_ELEMENTS.CREATE_WORK_ITEM_BUTTON}
      />
    </div>
  );
});
