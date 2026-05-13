/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Fragment, useState, useEffect } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
// icons
import { CirclePlus, LogOut, Mails, Settings, UserPlus } from "lucide-react";
// ui
import { Menu, Transition } from "@headlessui/react";
// plane imports
import { EUserPermissions } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { CheckIcon, ChevronDownIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspace } from "@plane/types";
import { Loader } from "@plane/ui";
import { orderWorkspacesList, cn } from "@plane/utils";
// helpers
import { AppSidebarItem } from "@/components/sidebar/sidebar-item";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUser, useUserProfile } from "@/hooks/store/user";
import { useInstance } from "@/hooks/store/use-instance";
// components
import { WorkspaceLogo } from "../logo";
import SidebarDropdownItem from "./dropdown-item";

type WorkspaceMenuRootProps = {
  variant: "sidebar" | "sidebar-brand" | "top-navigation";
  label?: string;
};

function WorkspaceMenuOpenSync(props: { open: boolean; onChange: (open: boolean) => void }) {
  const { open, onChange } = props;

  useEffect(() => {
    onChange(open);
  }, [open, onChange]);

  return null;
}

export const WorkspaceMenuRoot = observer(function WorkspaceMenuRoot(props: WorkspaceMenuRootProps) {
  const { label, variant } = props;
  // store hooks
  const { toggleSidebar, toggleAnySidebarDropdown, sidebarCollapsed } = useAppTheme();
  const { config } = useInstance();
  const { data: currentUser } = useUser();
  const { signOut } = useUser();
  const { updateUserProfile } = useUserProfile();
  const { currentWorkspace: activeWorkspace, workspaces } = useWorkspace();
  // derived values
  const isWorkspaceCreationDisabled = config?.is_workspace_creation_disabled ?? false;
  // translation
  const { t } = useTranslation();
  // local state
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  // inline brand dropdown state (sidebar-brand variant only)
  const [isBrandOpen, setIsBrandOpen] = useState(false);

  const handleWorkspaceNavigation = (workspace: IWorkspace) => updateUserProfile({ last_workspace_id: workspace?.id });

  const handleSignOut = async () => {
    await signOut().catch(() =>
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("sign_out.toast.error.title"),
        message: t("sign_out.toast.error.message"),
      })
    );
  };

  const handleItemClick = () => {
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };
  const workspacesList = orderWorkspacesList(Object.values(workspaces ?? {}));

  // Close inline dropdown when sidebar collapses
  useEffect(() => {
    if (sidebarCollapsed) setIsBrandOpen(false);
  }, [sidebarCollapsed]);

  // Toggle sidebar dropdown state when either menu is open
  useEffect(() => {
    toggleAnySidebarDropdown(variant === "sidebar-brand" ? isBrandOpen : isWorkspaceMenuOpen);
  }, [isWorkspaceMenuOpen, isBrandOpen, variant, toggleAnySidebarDropdown]);

  // ── sidebar-brand: inline accordion (no floating popup) ──────────────────
  if (variant === "sidebar-brand") {
    const handleClose = () => setIsBrandOpen(false);

    const orderedWorkspaces = workspacesList
      ? activeWorkspace
        ? [activeWorkspace, ...workspacesList.filter((w) => w.id !== activeWorkspace?.id)]
        : workspacesList
      : [];

    const canManageWorkspace =
      !!activeWorkspace &&
      [EUserPermissions.ADMIN, EUserPermissions.MEMBER].includes(activeWorkspace.role as EUserPermissions);
    const canInviteMembers =
      !!activeWorkspace && [EUserPermissions.ADMIN].includes(activeWorkspace.role as EUserPermissions);

    return (
      <div className="w-full">
        {/* Trigger button — vertically offset to align with logo center */}
        <button
          type="button"
          onClick={() => setIsBrandOpen((prev) => !prev)}
          className={cn(
            "group/menu-button mt-[6px] flex max-w-full min-w-0 w-full items-center justify-between gap-2 rounded-md text-13 text-secondary transition hover:text-primary focus:outline-none",
            { "text-primary": isBrandOpen }
          )}
          aria-label={t("aria_labels.projects_sidebar.open_workspace_switcher")}
          aria-expanded={isBrandOpen}
        >
          <span className="min-w-0 truncate">{label ?? activeWorkspace?.name ?? t("loading")}</span>
          <ChevronDownIcon
            className={cn("size-3.5 flex-shrink-0 text-placeholder duration-300", {
              "rotate-180": isBrandOpen,
            })}
          />
        </button>

        {/* Inline collapsible panel — pushes content below, no overlap */}
        <div
          className="overflow-hidden"
          style={{
            display: "grid",
            gridTemplateRows: isBrandOpen ? "1fr" : "0fr",
            transition: "grid-template-rows 220ms ease",
          }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="pt-3 pb-2">
              {/* Current user email */}
              <p className="px-1 pb-3 text-11 text-[#9ca3af] truncate select-none leading-none">
                {currentUser?.email}
              </p>

              {/* Workspace list */}
              {workspacesList ? (
                <div className="flex flex-col gap-0.5 mb-2">
                  {orderedWorkspaces.map((workspace) => {
                    const isActive = workspace.id === activeWorkspace?.id;
                    return (
                      <Link
                        key={workspace.id}
                        href={`/${workspace.slug}`}
                        onClick={() => {
                          handleWorkspaceNavigation(workspace);
                          handleItemClick();
                          handleClose();
                        }}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2 py-2 text-13 transition-colors duration-100",
                          { "bg-[#f1f1ef]": isActive, "hover:bg-[#f5f5f4]": !isActive }
                        )}
                      >
                        <WorkspaceLogo
                          logo={workspace?.logo_url}
                          name={workspace?.name}
                          classNames="size-6 flex-shrink-0 rounded-md border border-[#ebebeb]"
                        />
                        <span
                          className={cn("min-w-0 flex-1 truncate text-13 font-medium", {
                            "text-[#111827]": isActive,
                            "text-[#374151]": !isActive,
                          })}
                        >
                          {workspace.name}
                        </span>
                        {isActive && <CheckIcon className="size-3.5 flex-shrink-0 text-[#374151]" />}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-1 py-2">
                  <Loader className="space-y-2">
                    <Loader.Item height="32px" />
                    <Loader.Item height="32px" />
                  </Loader>
                </div>
              )}

              {/* Active workspace quick-actions: Settings / Invite */}
              {activeWorkspace && (canManageWorkspace || canInviteMembers) && (
                <div className="flex gap-1.5 px-1 pb-3 pt-0.5">
                  {canManageWorkspace && (
                    <Link
                      href={`/${activeWorkspace.slug}/settings`}
                      onClick={() => { handleItemClick(); handleClose(); }}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2 py-1.5 text-12 font-medium text-[#374151] transition-colors hover:bg-[#f5f5f4]"
                    >
                      <Settings className="size-3.5 flex-shrink-0" />
                      <span className="truncate">{t("settings")}</span>
                    </Link>
                  )}
                  {canInviteMembers && (
                    <Link
                      href={`/${activeWorkspace.slug}/settings/members`}
                      onClick={() => { handleItemClick(); handleClose(); }}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2 py-1.5 text-12 font-medium text-[#374151] transition-colors hover:bg-[#f5f5f4]"
                    >
                      <UserPlus className="size-3.5 flex-shrink-0" />
                      <span className="truncate">Invite</span>
                    </Link>
                  )}
                </div>
              )}

              {/* Footer actions */}
              <div className="border-t border-[#ebebeb] pt-2 mt-0 flex flex-col gap-0.5">
                {!isWorkspaceCreationDisabled && (
                  <Link
                    href="/create-workspace"
                    onClick={() => { handleItemClick(); handleClose(); }}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-13 font-medium text-[#374151] transition-colors hover:bg-[#f5f5f4]"
                  >
                    <CirclePlus className="size-4 flex-shrink-0" />
                    <span>{t("create_workspace")}</span>
                  </Link>
                )}
                <Link
                  href="/invitations"
                  onClick={() => { handleItemClick(); handleClose(); }}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-13 font-medium text-[#374151] transition-colors hover:bg-[#f5f5f4]"
                >
                  <Mails className="size-4 flex-shrink-0" />
                  <span>{t("workspace_invites")}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-13 font-medium text-[#374151] transition-colors hover:bg-[#f5f5f4]"
                >
                  <LogOut className="size-4 flex-shrink-0" />
                  <span>{t("sign_out")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── sidebar / top-navigation: original floating Menu (unchanged) ─────────
  return (
    <Menu
      as="div"
      className={cn("relative flex h-full w-fit max-w-48 truncate whitespace-nowrap", {
        "w-full justify-center text-center": variant === "sidebar",
        "flex-grow justify-stretch truncate text-left": variant === "top-navigation",
      })}
    >
      {({ open, close }: { open: boolean; close: () => void }) => {
        return (
          <>
            <WorkspaceMenuOpenSync open={open} onChange={setIsWorkspaceMenuOpen} />
            {variant === "sidebar" && (
              <Menu.Button
                className={cn("flex size-8 w-full items-center justify-center rounded-md", {
                  "bg-layer-1": open,
                })}
              >
                <AppSidebarItem
                  variant="content"
                  item={{
                    icon: (
                      <WorkspaceLogo
                        logo={activeWorkspace?.logo_url}
                        name={activeWorkspace?.name}
                        classNames="size-8 rounded-md border border-subtle"
                      />
                    ),
                  }}
                />
              </Menu.Button>
            )}
            {variant === "top-navigation" && (
              <Menu.Button
                className={cn(
                  "group/menu-button flex flex-grow items-center justify-between gap-1 truncate rounded-sm p-1 text-13 font-medium text-secondary hover:bg-layer-1 focus:outline-none",
                  {
                    "bg-layer-1": open,
                  }
                )}
                aria-label={t("aria_labels.projects_sidebar.open_workspace_switcher")}
              >
                <div className="flex flex-grow items-center gap-2 truncate">
                  <WorkspaceLogo
                    logo={activeWorkspace?.logo_url}
                    name={activeWorkspace?.name}
                    classNames="border border-subtle rounded-md size-7"
                  />
                  <h4 className="truncate text-14 font-medium text-primary">{activeWorkspace?.name ?? t("loading")}</h4>
                </div>
                <ChevronDownIcon
                  className={cn("size-4 flex-shrink-0 text-placeholder duration-300", {
                    "rotate-180": open,
                  })}
                />
              </Menu.Button>
            )}
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="trnsform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items as={Fragment}>
                <div
                  className={cn(
                    "flyers-soft-workspace-switcher fixed z-21 mt-1 flex w-[24rem] max-w-[calc(100vw-2rem)] origin-top-left flex-col overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-[0_22px_54px_rgba(17, 24, 39, 0.18)] outline-none",
                    {
                      "top-11 left-14": variant === "sidebar",
                      "top-10 left-4": variant === "top-navigation",
                    }
                  )}
                >
                  <div className="flyers-soft-workspace-switcher-scroll vertical-scrollbar scrollbar-sm flex max-h-96 flex-col items-start justify-start overflow-x-hidden overflow-y-auto">
                    <span className="flyers-soft-workspace-switcher-email sticky top-0 z-21 h-full w-full flex-shrink-0 truncate bg-white px-4 pt-3 pb-2 text-left text-13 font-medium text-[#6b7280]">
                      {currentUser?.email}
                    </span>
                    {workspacesList ? (
                      <div className="flyers-soft-workspace-switcher-list flex size-full flex-col items-start justify-start gap-1 px-2 pb-2">
                        {(activeWorkspace
                          ? [
                              activeWorkspace,
                              ...workspacesList.filter((workspace) => workspace.id !== activeWorkspace?.id),
                            ]
                          : workspacesList
                        ).map((workspace) => (
                          <SidebarDropdownItem
                            key={workspace.id}
                            workspace={workspace}
                            activeWorkspace={activeWorkspace}
                            handleItemClick={handleItemClick}
                            handleWorkspaceNavigation={handleWorkspaceNavigation}
                            handleClose={close}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full">
                        <Loader className="space-y-2">
                          <Loader.Item height="30px" />
                          <Loader.Item height="30px" />
                        </Loader>
                      </div>
                    )}
                  </div>
                  <div className="flyers-soft-workspace-switcher-footer flex w-full flex-col items-start justify-start gap-1.5 border-t border-[#ebebeb] px-3 py-3 text-13">
                    {!isWorkspaceCreationDisabled && (
                      <Link href="/create-workspace" className="w-full">
                        <Menu.Item
                          as="div"
                          className="flyers-soft-workspace-switcher-footer-item flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-13 font-semibold text-[#374151] hover:bg-[#f5f5f4]"
                        >
                          <CirclePlus className="size-4 flex-shrink-0" />
                          <span className="min-w-0 truncate">{t("create_workspace")}</span>
                        </Menu.Item>
                      </Link>
                    )}

                    <Link href="/invitations" className="w-full" onClick={handleItemClick}>
                      <Menu.Item
                        as="div"
                        className="flyers-soft-workspace-switcher-footer-item flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-13 font-semibold text-[#374151] hover:bg-[#f5f5f4]"
                      >
                        <Mails className="h-4 w-4 flex-shrink-0" />
                        <span className="min-w-0 truncate">{t("workspace_invites")}</span>
                      </Menu.Item>
                    </Link>

                    <div className="w-full">
                      <Menu.Item
                        as="button"
                        type="button"
                        className="flyers-soft-workspace-switcher-footer-item flyers-soft-workspace-switcher-signout flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-13 font-semibold text-[#374151] hover:bg-[#f5f5f4]"
                        onClick={handleSignOut}
                      >
                        <LogOut className="size-4 flex-shrink-0" />
                        <span className="min-w-0 truncate">{t("sign_out")}</span>
                      </Menu.Item>
                    </div>
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </>
        );
      }}
    </Menu>
  );
});
