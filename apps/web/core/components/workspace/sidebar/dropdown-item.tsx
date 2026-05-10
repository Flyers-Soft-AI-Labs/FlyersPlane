/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Settings, UserPlus } from "lucide-react";
import { Menu } from "@headlessui/react";
// plane imports
import { EUserPermissions } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { CheckIcon } from "@plane/propel/icons";
import type { IWorkspace } from "@plane/types";
import { cn, getFileURL, getUserRole } from "@plane/utils";
// plane web imports
import { SubscriptionPill } from "@/plane-web/components/common/subscription/subscription-pill";

type TProps = {
  workspace: IWorkspace;
  activeWorkspace: IWorkspace | null;
  handleItemClick: () => void;
  handleWorkspaceNavigation: (workspace: IWorkspace) => void;
  handleClose: () => void;
};
const SidebarDropdownItem = observer(function SidebarDropdownItem(props: TProps) {
  const { workspace, activeWorkspace, handleItemClick, handleWorkspaceNavigation, handleClose } = props;
  // router
  const { workspaceSlug } = useParams();
  // hooks
  const { t } = useTranslation();
  // derived values
  const isActive = workspace.id === activeWorkspace?.id;
  const canManageWorkspace = [EUserPermissions.ADMIN, EUserPermissions.MEMBER].includes(workspace?.role);
  const canInviteMembers = [EUserPermissions.ADMIN].includes(workspace?.role);

  return (
    <Link
      key={workspace.id}
      href={`/${workspace.slug}`}
      onClick={() => {
        handleWorkspaceNavigation(workspace);
        handleItemClick();
      }}
      className="w-full"
      id={workspace.id}
    >
      <Menu.Item
        as="div"
        className={cn("flyers-soft-workspace-option rounded-xl px-3 py-2 transition-colors", {
          "is-active bg-[#fff8e1]": isActive,
          "hover:bg-[#fffdf4]": !isActive,
        })}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 text-13 text-[#1f2937]">
          <div className="relative flex min-w-0 flex-1 items-center justify-start gap-3">
            <span
              className={`flyers-soft-workspace-option-logo relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#f0dfb7] bg-[#fff4cf] p-2 text-14 font-bold uppercase text-[#8a5b00] ${
                !workspace?.logo_url && ""
              }`}
            >
              {workspace?.logo_url && workspace.logo_url !== "" ? (
                <img
                  src={getFileURL(workspace.logo_url)}
                  className="absolute top-0 left-0 h-full w-full object-cover"
                  alt={t("workspace_logo")}
                />
              ) : (
                (workspace?.name?.[0] ?? "...")
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-left text-14 font-semibold text-ellipsis ${workspaceSlug === workspace.slug ? "text-[#111827]" : "text-[#374151]"}`}
              >
                {workspace.name}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-12 text-[#6b7280] capitalize">
                <span>{getUserRole(workspace.role)?.toLowerCase() || "guest"}</span>
                <div className="h-1 w-1 rounded-full bg-[#d6c8aa]" />
                <span className="capitalize">{t("member", { count: workspace.total_members || 0 })}</span>
              </div>
            </div>
          </div>
          {isActive ? (
            <span className="flyers-soft-workspace-check flex-shrink-0 rounded-full bg-[#ffc400] p-1 text-[#1f2937]">
              <CheckIcon className="h-4 w-4" />
            </span>
          ) : (
            <SubscriptionPill workspace={workspace} />
          )}
        </div>
        {isActive && (canManageWorkspace || canInviteMembers) && (
          <>
            <div className="flyers-soft-workspace-option-actions mt-3 flex w-full flex-wrap gap-2 pl-12">
              {canManageWorkspace && (
                <Link
                  href={`/${workspace.slug}/settings`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="flyers-soft-workspace-action-button inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#eadfcb] bg-white px-3 py-2 text-13 font-semibold text-[#374151] transition-colors hover:border-[#ffd75c] hover:bg-[#fff8e1]"
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t("settings")}</span>
                </Link>
              )}
              {canInviteMembers && (
                <Link
                  href={`/${workspace.slug}/settings/members`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="flyers-soft-workspace-action-button inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#eadfcb] bg-white px-3 py-2 text-13 font-semibold text-[#374151] transition-colors hover:border-[#ffd75c] hover:bg-[#fff8e1]"
                >
                  <UserPlus className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {t("project_settings.members.invite_members.title")}
                  </span>
                </Link>
              )}
            </div>
          </>
        )}
      </Menu.Item>
    </Link>
  );
});

export default SidebarDropdownItem;
