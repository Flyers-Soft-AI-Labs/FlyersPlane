/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Fragment, useState, useEffect } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
// icons
import { CirclePlus, LogOut, Mails } from "lucide-react";
// ui
import { Menu, Transition } from "@headlessui/react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { ChevronDownIcon } from "@plane/propel/icons";
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
  const { toggleSidebar, toggleAnySidebarDropdown } = useAppTheme();
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
  // TODO: fix workspaces list scroll

  // Toggle sidebar dropdown state when either menu is open
  useEffect(() => {
    toggleAnySidebarDropdown(isWorkspaceMenuOpen);
  }, [isWorkspaceMenuOpen, toggleAnySidebarDropdown]);

  return (
    <Menu
      as="div"
      className={cn("relative flex h-full w-fit max-w-48 truncate whitespace-nowrap", {
        "w-full justify-center text-center": variant === "sidebar",
        "h-auto w-full max-w-full justify-start text-left": variant === "sidebar-brand",
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
            {variant === "sidebar-brand" && (
              <Menu.Button
                className={cn(
                  "group/menu-button flex max-w-full min-w-0 items-center justify-between gap-2 rounded-md text-13 text-secondary transition hover:text-primary focus:outline-none",
                  {
                    "text-primary": open,
                  }
                )}
                aria-label={t("aria_labels.projects_sidebar.open_workspace_switcher")}
              >
                <span className="min-w-0 truncate">{label ?? activeWorkspace?.name ?? t("loading")}</span>
                <ChevronDownIcon
                  className={cn("size-3.5 flex-shrink-0 text-placeholder duration-300", {
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
                      "top-[4.5rem] left-4": variant === "sidebar-brand",
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
