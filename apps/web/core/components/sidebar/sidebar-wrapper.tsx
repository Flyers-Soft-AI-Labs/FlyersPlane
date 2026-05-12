/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { observer } from "mobx-react";
// plane helpers
import { useOutsideClickDetector } from "@plane/hooks";
import { ScrollArea } from "@plane/propel/scrollarea";
// components
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
import { WorkspaceMenuRoot } from "@/components/workspace/sidebar/workspace-menu-root";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import useSize from "@/hooks/use-window-size";

type TSidebarWrapperProps = {
  title: string;
  children: React.ReactNode;
  quickActions?: React.ReactNode;
};

export const SidebarWrapper = observer(function SidebarWrapper(props: TSidebarWrapperProps) {
  const { children, quickActions } = props;
  // store hooks
  const { toggleSidebar, sidebarCollapsed } = useAppTheme();
  const windowSize = useSize();
  // refs
  const ref = useRef<HTMLDivElement>(null);
  const openedByHoverRef = useRef(false);

  useOutsideClickDetector(ref, () => {
    if (sidebarCollapsed === false && window.innerWidth < 768) {
      toggleSidebar();
    }
  });

  useEffect(() => {
    if (windowSize[0] < 768 && !sidebarCollapsed) toggleSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSize]);

  const handleHoverOpen = () => {
    openedByHoverRef.current = true;
    toggleSidebar(false);
  };

  const handleShellMouseLeave = () => {
    if (!openedByHoverRef.current || sidebarCollapsed !== false) return;

    openedByHoverRef.current = false;
    toggleSidebar(true);
  };

  return (
    <>
      <div
        ref={ref}
        className="flyers-soft-sidebar-shell flex h-full w-full animate-fade-in flex-col"
        onMouseLeave={handleShellMouseLeave}
      >
        <div className="flyers-soft-sidebar-brand-wrap px-3 pt-3">
          <div className="flyers-soft-sidebar-brand flex items-center gap-2">
            <AppSidebarToggleButton openedByHoverRef={openedByHoverRef} onHoverOpen={handleHoverOpen} />
            <div className="flyers-soft-sidebar-title min-w-0 flex-1">
              <WorkspaceMenuRoot variant="sidebar-brand" label="Flyers Soft" />
            </div>
          </div>
        </div>

        <ScrollArea
          orientation="vertical"
          scrollType="hover"
          size="sm"
          rootClassName="size-full overflow-x-hidden overflow-y-auto"
          viewportClassName="flyers-soft-sidebar-scroll-viewport flex flex-col overflow-x-hidden h-full w-full overflow-y-auto px-3 pt-5 pb-3"
        >
          {children}
        </ScrollArea>
        <div className="flyers-soft-sidebar-bottom-action border-t border-subtle bg-surface-1 px-3 py-3">
          {quickActions}
        </div>
      </div>
    </>
  );
});
