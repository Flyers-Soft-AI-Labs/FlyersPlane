/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
import { useParams } from "react-router";
// plane imports
import {
  EUserPermissionsLevel,
  GROUPED_WORKSPACE_SETTINGS,
  WORKSPACE_SETTINGS,
  WORKSPACE_SETTINGS_CATEGORIES,
} from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { joinUrlPath } from "@plane/utils";
// components
import { SettingsSidebarItem } from "@/components/settings/sidebar/item";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import { WORKSPACE_SETTINGS_ICONS } from "./item-icon";

const TEAMS_SETTINGS_KEYS = ["general", "members", "billing-and-plans", "export"] as const;

const TEAMS_SETTINGS_LABELS: Record<(typeof TEAMS_SETTINGS_KEYS)[number], string> = {
  general: "General",
  members: "Teams",
  "billing-and-plans": "Billing",
  export: "Exports",
};

export const WorkspaceSettingsSidebarItemCategories = observer(function WorkspaceSettingsSidebarItemCategories() {
  // params
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  // store hooks
  const { allowPermissions } = useUserPermissions();
  // translation
  const { t } = useTranslation();
  const isTeamsSettingsPage = /\/settings\/members\/?$/.test(pathname ?? "");

  if (isTeamsSettingsPage) {
    const visibleItems = TEAMS_SETTINGS_KEYS.map((key) => WORKSPACE_SETTINGS[key]).filter((item) =>
      allowPermissions(item.access, EUserPermissionsLevel.WORKSPACE, workspaceSlug)
    );

    return (
      <div className="flyers-soft-teams-settings-nav mt-3 flex flex-col gap-1 px-3">
        {visibleItems.map((item) => {
          const isItemActive =
            item.href === "/settings"
              ? pathname === `/${workspaceSlug}${item.href}/`
              : new RegExp(`^/${workspaceSlug}${item.href}/`).test(pathname);

          return (
            <SettingsSidebarItem
              key={item.key}
              as="link"
              href={joinUrlPath(workspaceSlug ?? "", item.href)}
              isActive={isItemActive}
              icon={WORKSPACE_SETTINGS_ICONS[item.key]}
              label={TEAMS_SETTINGS_LABELS[item.key as (typeof TEAMS_SETTINGS_KEYS)[number]]}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col divide-y divide-subtle px-3">
      {WORKSPACE_SETTINGS_CATEGORIES.map((category) => {
        const categoryItems = GROUPED_WORKSPACE_SETTINGS[category];
        const accessibleItems = categoryItems.filter((item) =>
          allowPermissions(item.access, EUserPermissionsLevel.WORKSPACE, workspaceSlug)
        );

        if (accessibleItems.length === 0) return null;

        return (
          <div key={category} className="shrink-0 py-3 first:pt-0 last:pb-0">
            <div className="p-2 text-caption-md-medium text-tertiary capitalize">{t(category)}</div>
            <div className="flex flex-col">
              {accessibleItems.map((item) => {
                const isItemActive =
                  item.href === "/settings"
                    ? pathname === `/${workspaceSlug}${item.href}/`
                    : new RegExp(`^/${workspaceSlug}${item.href}/`).test(pathname);

                return (
                  <SettingsSidebarItem
                    key={item.key}
                    as="link"
                    href={joinUrlPath(workspaceSlug ?? "", item.href)}
                    isActive={isItemActive}
                    icon={WORKSPACE_SETTINGS_ICONS[item.key]}
                    label={t(item.i18n_label)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});
