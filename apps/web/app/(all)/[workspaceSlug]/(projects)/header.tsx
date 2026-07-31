/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Bell, Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { getNumberCount } from "@plane/utils";
// components
import { UserMenuRoot } from "@/components/workspace/sidebar/user-menu-root";
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import { usePowerK } from "@/hooks/store/use-power-k";

/**
 * Persistent top bar shared by every route under the (projects) layout — home, time sheet,
 * drafts, analytics, etc. Only "Home" is a real nav item today, so it is styled as an
 * active-state link (highlighted only while the user is actually on the workspace home
 * route) rather than assuming the dashboard is always the current page.
 */
export const WorkspaceTopBar = observer(function WorkspaceTopBar() {
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  // hooks
  const { togglePowerKModal } = usePowerK();
  const { unreadNotificationsCount, getUnreadNotificationsCount } = useWorkspaceNotifications();

  const workspaceSlugString = workspaceSlug?.toString();
  const homeHref = workspaceSlugString ? `/${workspaceSlugString}` : "#";
  const isHomeActive = pathname === homeHref;
  const totalNotifications =
    unreadNotificationsCount.mention_unread_notifications_count > 0
      ? unreadNotificationsCount.mention_unread_notifications_count
      : unreadNotificationsCount.total_unread_notifications_count;

  useSWR(
    workspaceSlugString ? "WORKSPACE_UNREAD_NOTIFICATION_COUNT" : null,
    workspaceSlugString ? () => getUnreadNotificationsCount(workspaceSlugString) : null
  );

  return (
    <div className="flyers-soft-dashboard-header">
      <nav className="flyers-soft-dashboard-main-tab" aria-label="Primary">
        <Link
          href={homeHref}
          className="flyers-soft-dashboard-home-tab"
          aria-current={isHomeActive ? "page" : undefined}
          data-active={isHomeActive || undefined}
        >
          <Home className="size-4" strokeWidth={2} />
          <span>Home</span>
        </Link>
      </nav>

      <button type="button" className="flyers-soft-dashboard-search" onClick={() => togglePowerKModal(true)}>
        <Search className="size-4" strokeWidth={2} />
        <span>Search</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className="flyers-soft-dashboard-header-actions">
        <Link
          href={workspaceSlugString ? `/${workspaceSlugString}/notifications` : "#"}
          className="flyers-soft-dashboard-notification"
          aria-label="Notifications"
        >
          <Bell className="size-4" strokeWidth={2} />
          {totalNotifications > 0 && <span>{getNumberCount(totalNotifications)}</span>}
        </Link>
        <UserMenuRoot variant="header" />
      </div>
    </div>
  );
});
