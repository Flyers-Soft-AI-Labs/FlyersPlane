/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { MutableRefObject } from "react";
import { observer } from "mobx-react";
// components
import { FlyersLogo } from "@/components/common/flyers-logo";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

type TAppSidebarToggleButtonProps = {
  openedByHoverRef?: MutableRefObject<boolean>;
  onHoverOpen?: () => void;
};

export const AppSidebarToggleButton = observer(function AppSidebarToggleButton(props: TAppSidebarToggleButtonProps) {
  const { openedByHoverRef, onHoverOpen } = props;
  const { sidebarCollapsed, toggleSidebar } = useAppTheme();
  const isOpen = sidebarCollapsed === false;

  return (
    <button
      type="button"
      className="flyers-soft-sidebar-toggle-button"
      data-sidebar-menu-trigger="true"
      onClick={() => {
        if (isOpen && openedByHoverRef?.current) {
          openedByHoverRef.current = false;
          return;
        }

        if (openedByHoverRef) openedByHoverRef.current = false;
        toggleSidebar(isOpen);
      }}
      onMouseEnter={() => {
        if (isOpen) return;

        if (openedByHoverRef) openedByHoverRef.current = true;
        if (onHoverOpen) onHoverOpen();
        else toggleSidebar(false);
      }}
      aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={isOpen}
      title="Menu"
    >
      <FlyersLogo className="flyers-soft-sidebar-toggle-logo" />
    </button>
  );
});
