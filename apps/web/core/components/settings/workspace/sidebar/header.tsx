/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ArrowLeft } from "lucide-react";
import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
// plane imports
import { ROLE_DETAILS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { IconButton } from "@plane/propel/icon-button";
// components
import { WorkspaceLogo } from "@/components/workspace/logo";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { useWorkspace } from "@/hooks/store/use-workspace";
// plane web imports
import { SubscriptionPill } from "@/plane-web/components/common/subscription/subscription-pill";

export const WorkspaceSettingsSidebarHeader = observer(function WorkspaceSettingsSidebarHeader() {
  // router
  const router = useAppRouter();
  const pathname = usePathname();
  // store hooks
  const { getWorkspaceRoleByWorkspaceSlug } = useUserPermissions();
  const { currentWorkspace } = useWorkspace();
  // derived values
  const currentWorkspaceRole = currentWorkspace?.slug
    ? getWorkspaceRoleByWorkspaceSlug(currentWorkspace.slug)
    : undefined;
  // translation
  const { t } = useTranslation();
  const isTeamsSettingsPage = /\/settings\/members\/?$/.test(pathname ?? "");

  if (!currentWorkspaceRole) return null;

  if (isTeamsSettingsPage) {
    return (
      <div className="flyers-soft-teams-settings-sidebar-header shrink-0">
        {/* Back row */}
        <div className="flyers-soft-teams-settings-back-row flex items-center gap-0.5 px-2 pt-2 pb-1">
          <IconButton
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => router.push(`/${currentWorkspace?.slug}/`)}
          />
          <p className="text-13 font-semibold leading-none text-primary">Teams</p>
        </div>
        {/* Compact workspace card */}
        <div className="flyers-soft-teams-settings-workspace-card flex items-center gap-2 px-3 pb-3 pt-1">
          <WorkspaceLogo
            logo={currentWorkspace?.logo_url}
            name={currentWorkspace?.name}
            classNames="shrink-0 size-6 rounded-md border border-subtle"
          />
          <div className="min-w-0">
            <p className="truncate text-12 font-semibold text-primary">{currentWorkspace?.name}</p>
            <p className="truncate text-11 text-tertiary">Team workspace</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-1 py-3 pr-5 pl-4 text-body-md-medium">
        <IconButton
          variant="ghost"
          size="base"
          icon={ArrowLeft}
          onClick={() => router.push(`/${currentWorkspace?.slug}/`)}
        />
        <p>Workspace settings</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 px-5 py-0.5">
        <div className="flex items-center gap-2 truncate">
          <WorkspaceLogo
            logo={currentWorkspace?.logo_url}
            name={currentWorkspace?.name}
            classNames="shrink-0 size-8 border border-subtle"
          />
          <div className="truncate">
            <p className="truncate text-body-sm-medium">{currentWorkspace?.name}</p>
            <p className="truncate text-caption-md-regular">
              {t(ROLE_DETAILS[currentWorkspaceRole].i18n_title)}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <SubscriptionPill />
        </div>
      </div>
    </div>
  );
});
