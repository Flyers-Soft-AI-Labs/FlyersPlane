/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { observer } from "mobx-react";
// components
import { FlyersLogo } from "@/components/common/flyers-logo";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

const SIDEBAR_CLOSE_DELAY_MS = 260;
let sidebarCloseTimeout: ReturnType<typeof setTimeout> | undefined;

function isPointerInsideSidebarZone(x: number, y: number) {
  const target = document.elementFromPoint(x, y);
  if (!(target instanceof HTMLElement)) return false;

  return !!target.closest("[data-sidebar-menu-trigger='true'], [data-sidebar-panel='true']");
}

export function cancelSidebarClose() {
  if (!sidebarCloseTimeout) return;

  clearTimeout(sidebarCloseTimeout);
  sidebarCloseTimeout = undefined;
}

export function scheduleSidebarClose(closeSidebar: () => void, point?: { x: number; y: number }) {
  cancelSidebarClose();
  sidebarCloseTimeout = setTimeout(() => {
    if (point && isPointerInsideSidebarZone(point.x, point.y)) {
      sidebarCloseTimeout = undefined;
      return;
    }

    closeSidebar();
    sidebarCloseTimeout = undefined;
  }, SIDEBAR_CLOSE_DELAY_MS);
}

export const AppSidebarToggleButton = observer(function AppSidebarToggleButton() {
  const { sidebarCollapsed, toggleSidebar } = useAppTheme();
  const openedByHoverRef = useRef(false);
  const isOpen = sidebarCollapsed === false;
  const closeSidebar = () => toggleSidebar(true);

  useEffect(() => {
    if (!isOpen) openedByHoverRef.current = false;
  }, [isOpen]);

  return (
    <button
      type="button"
      className="flyers-soft-sidebar-toggle-button"
      data-sidebar-menu-trigger="true"
      onClick={() => {
        cancelSidebarClose();
        if (isOpen && openedByHoverRef.current) {
          openedByHoverRef.current = false;
          return;
        }
        openedByHoverRef.current = false;
        toggleSidebar(isOpen);
      }}
      onMouseEnter={() => {
        cancelSidebarClose();
        if (!isOpen) {
          openedByHoverRef.current = true;
          toggleSidebar(false);
        }
      }}
      onMouseLeave={(event) => scheduleSidebarClose(closeSidebar, { x: event.clientX, y: event.clientY })}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      aria-expanded={isOpen}
    >
      <FlyersLogo className="flyers-soft-sidebar-toggle-logo" />
      <span>Menu</span>
      <ChevronDown className="flyers-soft-sidebar-toggle-chevron" strokeWidth={1.8} />
    </button>
  );
});
