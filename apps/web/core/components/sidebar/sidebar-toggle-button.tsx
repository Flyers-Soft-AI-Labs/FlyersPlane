/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { FlyersLogo } from "@/components/common/flyers-logo";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

export const AppSidebarToggleButton = observer(function AppSidebarToggleButton() {
  const { sidebarCollapsed, toggleSidebar } = useAppTheme();
  const isOpen = sidebarCollapsed === false;

  return (
    <button
      type="button"
      className="flyers-soft-sidebar-toggle-button"
      data-sidebar-menu-trigger="true"
      onClick={() => toggleSidebar(isOpen)}
      aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={isOpen}
      title="Menu"
    >
      <FlyersLogo className="flyers-soft-sidebar-toggle-logo" />
    </button>
  );
});
