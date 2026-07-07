/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Outlet } from "react-router";
// components
import { NotificationsSidebarRoot } from "@/components/workspace-notifications/sidebar";

export default function ProjectInboxIssuesLayout() {
  return (
    <div className="flyers-soft-notifications-layout relative flex h-full w-full overflow-hidden">
      <NotificationsSidebarRoot />
      <div className="flyers-soft-notifications-detail-panel h-full w-full overflow-hidden overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
