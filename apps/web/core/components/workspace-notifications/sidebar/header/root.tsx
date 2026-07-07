/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";

export const NotificationSidebarHeader = observer(function NotificationSidebarHeader() {
  return (
    <header className="flyers-soft-notifications-header flex h-[86px] flex-shrink-0 items-center border-b border-subtle px-8">
      <h1 className="text-2xl tracking-normal font-semibold text-primary">Inbox</h1>
    </header>
  );
});
