/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import type { TNotificationTab } from "@plane/constants";
import { NOTIFICATION_TABS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { cn, getNumberCount } from "@plane/utils";
// hooks
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import { useWorkspace } from "@/hooks/store/use-workspace";
// plane web components
import { NotificationListRoot } from "@/plane-web/components/workspace-notifications/list-root";
// local imports
import { NotificationEmptyState } from "./empty-state";
import { AppliedFilters } from "./filters/applied-filter";
import { NotificationSidebarHeader } from "./header";
import { NotificationsLoader } from "./loader";

export const NotificationsSidebarRoot = observer(function NotificationsSidebarRoot() {
  const { workspaceSlug } = useParams();
  // hooks
  const { getWorkspaceBySlug } = useWorkspace();
  const {
    currentSelectedNotificationId,
    unreadNotificationsCount,
    loader,
    notificationIdsByWorkspaceId,
    currentNotificationTab,
    setCurrentNotificationTab,
  } = useWorkspaceNotifications();

  const { t } = useTranslation();
  // derived values
  const workspace = workspaceSlug ? getWorkspaceBySlug(workspaceSlug.toString()) : undefined;
  const notificationIds = workspace ? notificationIdsByWorkspaceId(workspace.id) : undefined;

  const handleTabClick = useCallback(
    (tabValue: TNotificationTab) => {
      if (currentNotificationTab !== tabValue) {
        setCurrentNotificationTab(tabValue);
      }
    },
    [currentNotificationTab, setCurrentNotificationTab]
  );

  if (!workspaceSlug || !workspace) return <></>;

  return (
    <div
      className={cn(
        "flyers-soft-notifications-sidebar relative z-[10] h-full flex-shrink-0 bg-surface-1 transition-all max-md:overflow-hidden md:border-r",
        currentSelectedNotificationId ? "w-0 md:w-[420px] xl:w-[440px]" : "w-full md:w-[420px] xl:w-[440px]"
      )}
    >
      <div className="relative flex h-full w-full flex-col">
        <NotificationSidebarHeader />

        <div className="flyers-soft-notifications-tabs flex h-14 flex-shrink-0 items-end gap-7 border-b border-subtle px-8">
          {NOTIFICATION_TABS.map((tab) => (
            <button
              type="button"
              key={tab.value}
              className="relative flex h-full cursor-pointer items-center border-0 bg-transparent p-0 text-14 transition-colors outline-none"
              onClick={() => handleTabClick(tab.value)}
            >
              <span
                className={cn("relative flex h-full items-center justify-center gap-2 font-medium transition-all", {
                  "text-[#3d2aa6]": currentNotificationTab === tab.value,
                  "text-secondary hover:text-primary": currentNotificationTab !== tab.value,
                })}
              >
                <span>{t(tab.i18n_label)}</span>
                {tab.count(unreadNotificationsCount) > 0 && (
                  <span className="flyers-soft-notifications-tab-count">
                    {getNumberCount(tab.count(unreadNotificationsCount))}
                  </span>
                )}
              </span>
              {currentNotificationTab === tab.value && (
                <span className="absolute right-0 bottom-0 left-0 h-px rounded-full bg-[#5b3cc4]" />
              )}
            </button>
          ))}
        </div>

        {/* applied filters */}
        <AppliedFilters workspaceSlug={workspaceSlug.toString()} />

        {/* rendering notifications */}
        {loader === "init-loader" ? (
          <div className="relative min-h-0 w-full flex-1 overflow-hidden">
            <NotificationsLoader />
          </div>
        ) : (
          <>
            {notificationIds && notificationIds.length > 0 ? (
              <div className="flyers-soft-notifications-list-scroll vertical-scrollbar scrollbar-sm min-h-0 flex-1 overflow-y-auto">
                <NotificationListRoot workspaceSlug={workspaceSlug.toString()} workspaceId={workspace?.id} />
              </div>
            ) : (
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                <NotificationEmptyState currentNotificationTab={currentNotificationTab} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
