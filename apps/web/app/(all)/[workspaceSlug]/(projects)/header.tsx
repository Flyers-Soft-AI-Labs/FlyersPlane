/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Bell, Home, Plus, Search, Sun } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import useSWR from "swr";
// plane imports
import { getNumberCount } from "@plane/utils";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import { usePowerK } from "@/hooks/store/use-power-k";
import { useUser } from "@/hooks/store/user";

export const WorkspaceDashboardHeader = observer(function WorkspaceDashboardHeader() {
  const { workspaceSlug } = useParams();
  // hooks
  const { toggleCreateIssueModal } = useCommandPalette();
  const { togglePowerKModal } = usePowerK();
  const { setTheme } = useTheme();
  const { data: currentUser } = useUser();
  const { unreadNotificationsCount, getUnreadNotificationsCount } = useWorkspaceNotifications();

  const workspaceSlugString = workspaceSlug?.toString();
  const userName = currentUser?.first_name || currentUser?.display_name || currentUser?.email || "Shalini";
  const userInitial = userName.charAt(0).toUpperCase();
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
        <Link href={workspaceSlugString ? `/${workspaceSlugString}` : "#"} className="flyers-soft-dashboard-home-tab">
          <Home className="size-4" strokeWidth={2} />
          <span>Home</span>
        </Link>
      </nav>

      <button type="button" className="flyers-soft-dashboard-search" onClick={() => togglePowerKModal(true)}>
        <Search className="size-4" strokeWidth={2} />
        <span>Search tickets, projects, teams...</span>
        <kbd>Ctrl + K</kbd>
      </button>

      <div className="flyers-soft-dashboard-header-actions">
        <button
          type="button"
          className="flyers-soft-dashboard-icon-button"
          onClick={() => setTheme("light")}
          aria-label="Use light theme"
        >
          <Sun className="size-4" strokeWidth={2.2} />
        </button>
        <Link
          href={workspaceSlugString ? `/${workspaceSlugString}/notifications` : "#"}
          className="flyers-soft-dashboard-notification"
          aria-label="Notifications"
        >
          <Bell className="size-4" strokeWidth={2} />
          {totalNotifications > 0 && <span>{getNumberCount(totalNotifications)}</span>}
        </Link>
        <button
          type="button"
          className="flyers-soft-dashboard-create-button"
          onClick={() => toggleCreateIssueModal(true)}
        >
          <Plus className="size-4" strokeWidth={2} />
          <span>Create Ticket</span>
        </button>
        <div className="flyers-soft-dashboard-avatar" aria-label={userName}>
          {userInitial}
        </div>
      </div>
    </div>
  );
});
