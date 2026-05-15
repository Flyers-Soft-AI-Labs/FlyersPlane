/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { SetStateAction } from "react";
import { useCallback } from "react";
import { observer } from "mobx-react";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
// local imports
import { AppSidebar } from "./sidebar";

export const ProjectAppSidebar = observer(function ProjectAppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppTheme();
  const { storedValue: storedSidebarWidth, setValue: setStoredSidebarWidth } = useLocalStorage<number>(
    "sidebarWidth",
    SIDEBAR_WIDTH
  );
  const sidebarWidth = storedSidebarWidth ?? SIDEBAR_WIDTH;

  const setSidebarWidth = useCallback(
    (nextWidth: SetStateAction<number>) => {
      setStoredSidebarWidth(typeof nextWidth === "function" ? nextWidth(sidebarWidth) : nextWidth);
    },
    [setStoredSidebarWidth, sidebarWidth]
  );

  return (
    <ResizableSidebar
      isCollapsed={sidebarCollapsed ?? true}
      width={sidebarWidth}
      setWidth={setSidebarWidth}
      toggleCollapsed={toggleSidebar}
    >
      <AppSidebar />
    </ResizableSidebar>
  );
});
