/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
// plane imports
import { useParams, usePathname } from "next/navigation";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
// local imports
import { ExtendedAppSidebar } from "./extended-sidebar";
import { AppSidebar } from "./sidebar";

const FLYERS_SOFT_SIDEBAR_WIDTH = 256;
const FLYERS_SOFT_MIN_SIDEBAR_WIDTH = 232;
const FLYERS_SOFT_MAX_SIDEBAR_WIDTH = 288;
const resolveSidebarWidth = (width?: number | null) =>
  Math.min(Math.max(width ?? FLYERS_SOFT_SIDEBAR_WIDTH, FLYERS_SOFT_MIN_SIDEBAR_WIDTH), FLYERS_SOFT_MAX_SIDEBAR_WIDTH);

export const ProjectAppSidebar = observer(function ProjectAppSidebar() {
  // store hooks
  const {
    sidebarCollapsed,
    toggleSidebar,
    sidebarPeek,
    toggleSidebarPeek,
    isExtendedSidebarOpened,
    isAnySidebarDropdownOpen,
  } = useAppTheme();
  const { storedValue, setValue } = useLocalStorage<number>("sidebarWidth", SIDEBAR_WIDTH);
  // states
  const [sidebarWidth, setSidebarWidth] = useState<number>(resolveSidebarWidth(storedValue));
  // routes
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  // derived values
  const isAnyExtendedSidebarOpen = isExtendedSidebarOpened;

  const isNotificationsPath = pathname.includes(`/${workspaceSlug}/notifications`);

  // handlers
  const handleWidthChange = (width: number) => setValue(width);

  if (isNotificationsPath) return null;

  return (
    <>
      <ResizableSidebar
        showPeek={sidebarPeek}
        defaultWidth={resolveSidebarWidth(storedValue)}
        width={sidebarWidth}
        setWidth={setSidebarWidth}
        minWidth={FLYERS_SOFT_MIN_SIDEBAR_WIDTH}
        maxWidth={FLYERS_SOFT_MAX_SIDEBAR_WIDTH}
        defaultCollapsed={sidebarCollapsed}
        peekDuration={1500}
        onWidthChange={handleWidthChange}
        onCollapsedChange={toggleSidebar}
        isCollapsed={sidebarCollapsed}
        toggleCollapsed={toggleSidebar}
        togglePeek={toggleSidebarPeek}
        extendedSidebar={
          <>
            <ExtendedAppSidebar />
          </>
        }
        isAnyExtendedSidebarExpanded={isAnyExtendedSidebarOpen}
        isAnySidebarDropdownOpen={isAnySidebarDropdownOpen}
      >
        <AppSidebar />
      </ResizableSidebar>
    </>
  );
});
