/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { ENotificationTab } from "@plane/constants";

type TNotificationEmptyStateProps = {
  currentNotificationTab: ENotificationTab;
};

export const NotificationEmptyState = observer(function NotificationEmptyState({
  currentNotificationTab,
}: TNotificationEmptyStateProps) {
  const title = currentNotificationTab === ENotificationTab.ALL ? "No notifications" : "No mentions";

  return (
    <div className="flyers-soft-notifications-list-empty px-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-subtle text-[#5b3cc4]">
        <span className="h-2 w-2 rounded-full bg-[#5b3cc4]" />
      </div>
      <h2 className="text-15 font-semibold text-primary">{title}</h2>
      <p className="mt-2 text-13 leading-5 text-secondary">New updates will appear here.</p>
    </div>
  );
});
