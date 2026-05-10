/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, Settings2 } from "lucide-react";
// plane imports
import { GOD_MODE_URL } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Avatar, CustomMenu } from "@plane/ui";
import { getFileURL } from "@plane/utils";
// components
import { CoverImage } from "@/components/common/cover-image";
import { AppSidebarItem } from "@/components/sidebar/sidebar-item";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useUser } from "@/hooks/store/user";

type UserMenuRootProps = {
  variant?: "sidebar" | "header";
};

export const UserMenuRoot = observer(function UserMenuRoot(props: UserMenuRootProps) {
  const { variant = "sidebar" } = props;
  // states
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  // router
  const router = useRouter();
  // store hooks
  const { toggleAnySidebarDropdown } = useAppTheme();
  const { data: currentUser } = useUser();
  const { signOut } = useUser();
  const { toggleProfileSettingsModal } = useCommandPalette();
  // derived values
  const isUserInstanceAdmin = false;
  // translation
  const { t } = useTranslation();
  const userName = currentUser?.first_name || currentUser?.display_name || currentUser?.email || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSignOut = () => {
    signOut().catch(() =>
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("sign_out.toast.error.title"),
        message: t("sign_out.toast.error.message"),
      })
    );
  };

  // Toggle sidebar dropdown state when menu is open
  useEffect(() => {
    if (isUserMenuOpen) toggleAnySidebarDropdown(true);
    else toggleAnySidebarDropdown(false);
  }, [isUserMenuOpen, toggleAnySidebarDropdown]);

  return (
    <CustomMenu
      ariaLabel={userName}
      className="flex items-center"
      customButton={
        variant === "header" ? (
          <span className="flyers-soft-user-menu-initial" aria-hidden="true">
            {userInitial}
          </span>
        ) : (
          <AppSidebarItem
            variant="content"
            item={{
              icon: (
                <Avatar
                  name={currentUser?.display_name}
                  src={getFileURL(currentUser?.avatar_url ?? "")}
                  size={20}
                  shape="circle"
                />
              ),
              isActive: isUserMenuOpen,
            }}
          />
        )
      }
      customButtonClassName={variant === "header" ? "flyers-soft-user-menu-trigger" : ""}
      menuButtonOnClick={() => !isUserMenuOpen && setIsUserMenuOpen(true)}
      onMenuClose={() => setIsUserMenuOpen(false)}
      placement="bottom-end"
      maxHeight="2xl"
      menuItemsClassName="flyers-soft-user-profile-menu-layer"
      optionsClassName="flyers-soft-user-profile-menu w-[20rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#eadfcb] bg-white p-2 shadow-[0_22px_54px_rgba(84,61,12,0.18)] flex flex-col gap-y-2"
      closeOnSelect
    >
      <div className="flyers-soft-user-profile-card relative h-29 w-full overflow-hidden rounded-xl">
        <CoverImage
          src={currentUser?.cover_image_url ?? undefined}
          alt={currentUser?.display_name}
          className="h-29 w-full rounded-xl"
          showDefaultWhenEmpty
        />
        <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-y-2">
            <div>
              <Avatar
                name={currentUser?.display_name}
                src={getFileURL(currentUser?.avatar_url ?? "")}
                size={40}
                shape="circle"
                className="text-18 font-medium ring-2 ring-white"
              />
            </div>
            <div className="text-center">
              <p className="max-w-[16rem] truncate text-14 font-semibold text-[#111827]">
                {currentUser?.first_name} {currentUser?.last_name}
              </p>
              <p className="max-w-[16rem] truncate text-12 font-medium text-[#6b7280]">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <CustomMenu.MenuItem
          onClick={() =>
            toggleProfileSettingsModal({
              activeTab: "general",
              isOpen: true,
            })
          }
          className="flyers-soft-user-profile-menu-item flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-13 font-semibold text-[#374151]"
        >
          <Settings className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{t("settings")}</span>
        </CustomMenu.MenuItem>
        <CustomMenu.MenuItem
          onClick={() =>
            toggleProfileSettingsModal({
              activeTab: "preferences",
              isOpen: true,
            })
          }
          className="flyers-soft-user-profile-menu-item flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-13 font-semibold text-[#374151]"
        >
          <Settings2 className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{t("preferences")}</span>
        </CustomMenu.MenuItem>
      </div>
      <CustomMenu.MenuItem
        onClick={handleSignOut}
        className="flyers-soft-user-profile-menu-item flyers-soft-user-profile-signout flex min-h-10 items-center gap-3 rounded-lg border-t border-[#f3e5ab] px-3 py-2 pt-3 text-13 font-semibold text-[#d14343]"
      >
        <LogOut className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{t("sign_out")}</span>
      </CustomMenu.MenuItem>
      {isUserInstanceAdmin && (
        <CustomMenu.MenuItem
          onClick={() => router.push(GOD_MODE_URL)}
          className="bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 hover:text-accent-secondary"
        >
          {t("enter_god_mode")}
        </CustomMenu.MenuItem>
      )}
    </CustomMenu>
  );
});
