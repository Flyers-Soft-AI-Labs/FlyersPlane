/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Dispatch, ReactElement, SetStateAction } from "react";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { cn } from "@plane/utils";

interface ResizableSidebarProps {
  isCollapsed?: boolean;
  width: number;
  setWidth: Dispatch<SetStateAction<number>>;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  defaultCollapsed?: boolean;
  peekDuration?: number;
  toggleCollapsed: (value?: boolean) => void;
  onWidthChange?: (width: number) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  children?: ReactElement;
  extendedSidebar?: ReactElement;
}

const COLLAPSED_SIDEBAR_WIDTH = 60;

export function ResizableSidebar({
  isCollapsed = false,
  toggleCollapsed: toggleCollapsedProp,
  onCollapsedChange,
  width,
  setWidth,
  onWidthChange,
  minWidth = 236,
  maxWidth = 350,
  className = "",
  children,
  extendedSidebar,
}: ResizableSidebarProps) {
  // states
  const [isResizing, setIsResizing] = useState(false);
  // refs
  const initialWidthRef = useRef<number>(0);
  const initialMouseXRef = useRef<number>(0);

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - initialMouseXRef.current;
      const newWidth = Math.min(Math.max(initialWidthRef.current + deltaX, minWidth), maxWidth);
      setWidth(newWidth);
    },
    [isResizing, minWidth, maxWidth, setWidth]
  );

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      setIsResizing(true);
      initialWidthRef.current = width;
      initialMouseXRef.current = e.clientX;
    },
    [width]
  );

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const toggleCollapsed = useCallback(() => {
    toggleCollapsedProp();
  }, [toggleCollapsedProp]);

  // Set up event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleResize, stopResizing]);

  // Call external handlers when state changes
  useEffect(() => {
    onWidthChange?.(width);
  }, [width, onWidthChange]);

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  const reservedWidth = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : width;
  const renderedWidth = reservedWidth;

  return (
    <>
      {/* Main Sidebar */}
      <div
        id="main-sidebar"
        className={cn(
          "flyers-soft-resizable-sidebar relative z-30 h-full border-r border-subtle bg-surface-1",
          !isResizing && "transition-all duration-300 ease-in-out",
          "translate-x-0 opacity-100",
          className
        )}
        style={{
          width: `${reservedWidth}px`,
          minWidth: `${reservedWidth}px`,
          maxWidth: `${reservedWidth}px`,
          flexBasis: `${reservedWidth}px`,
        }}
        data-collapsed={isCollapsed ? "true" : "false"}
        data-expanded={isCollapsed ? "false" : "true"}
        data-resizing={isResizing ? "true" : "false"}
        data-sidebar-panel="true"
        role="complementary"
        aria-label="Main sidebar"
      >
        <aside
          className={cn(
            "flyers-soft-main-sidebar-panel group/sidebar flex h-full flex-col overflow-hidden bg-surface-1 pt-3",
            "relative w-full"
          )}
          style={{
            width: `${renderedWidth}px`,
            minWidth: `${renderedWidth}px`,
            maxWidth: `${renderedWidth}px`,
            flexBasis: `${renderedWidth}px`,
          }}
        >
          {children}

          {/* Resize Handle */}
          {!isCollapsed && (
            <div
              className={cn(
                "absolute z-[20] h-full w-1 cursor-ew-resize transition-all duration-200",
                !isResizing && "hover:bg-surface-2",
                isResizing && "w-1.5 bg-layer-1",
                "top-0 right-0"
              )}
              // onDoubleClick toggle sidebar
              onDoubleClick={() => toggleCollapsed()}
              onMouseDown={(e) => startResizing(e)}
              role="separator"
              aria-label="Resize sidebar"
            />
          )}
        </aside>
      </div>

      {/* Extended Sidebar */}
      {extendedSidebar && extendedSidebar}
    </>
  );
}
