/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react";
// components
import { cancelSidebarClose, scheduleSidebarClose } from "@/components/sidebar/sidebar-toggle-button";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
// local imports
import { AppSidebar } from "./sidebar";

export const ProjectAppSidebar = observer(function ProjectAppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppTheme();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const isOpen = sidebarCollapsed === false;
  const closeSidebar = useCallback(() => toggleSidebar(true), [toggleSidebar]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (sidebarRef.current?.contains(target) || target.closest("[data-sidebar-menu-trigger='true']")) return;

      cancelSidebarClose();
      closeSidebar();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeSidebar, isOpen]);

  return (
    <aside
      ref={sidebarRef}
      id="main-sidebar"
      className="flyers-soft-notion-sidebar"
      data-sidebar-panel="true"
      data-open={isOpen ? "true" : "false"}
      aria-hidden={!isOpen}
      onMouseEnter={cancelSidebarClose}
      onMouseLeave={(event) => scheduleSidebarClose(closeSidebar, { x: event.clientX, y: event.clientY })}
    >
      <AppSidebar />
    </aside>
  );
});
