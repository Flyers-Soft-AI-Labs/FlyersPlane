/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Dispatch, ReactElement, SetStateAction } from "react";
import React, { useCallback, useEffect, useState, useRef } from "react";
// helpers
import { usePlatformOS } from "@plane/hooks";
import { cn } from "@plane/utils";

interface ResizableSidebarProps {
  showPeek?: boolean;
  togglePeek: (value?: boolean) => void;
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
  isAnyExtendedSidebarExpanded?: boolean;
  isAnySidebarDropdownOpen?: boolean;
}

const COLLAPSED_SIDEBAR_WIDTH = 60;

export function ResizableSidebar({
  showPeek = false,
  togglePeek,
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
  isAnyExtendedSidebarExpanded = false,
  isAnySidebarDropdownOpen = false,
}: ResizableSidebarProps) {
  // states
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  // refs
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const initialWidthRef = useRef<number>(0);
  const initialMouseXRef = useRef<number>(0);
  // hooks
  const { isMobile } = usePlatformOS();
  // handlers
  const setShowPeek = useCallback(
    (value: boolean) => {
      togglePeek(value);
    },
    [togglePeek]
  );

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
    setShowPeek(false);
    setIsHoveringTrigger(false);
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
    }
  }, [toggleCollapsedProp, setShowPeek]);

  const handleSidebarEnter = useCallback(() => {
    if (!isCollapsed) return;
    setIsHoveringTrigger(true);
    setShowPeek(true);
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
    }
  }, [isCollapsed, setShowPeek]);

  const handleSidebarLeave = useCallback(() => {
    setIsHoveringTrigger(false);
    if (isCollapsed && !hasFocusWithin && !isAnyExtendedSidebarExpanded && !isAnySidebarDropdownOpen) {
      peekTimeoutRef.current = setTimeout(() => {
        setShowPeek(false);
      }, 120);
    }
  }, [
    hasFocusWithin,
    isAnyExtendedSidebarExpanded,
    isAnySidebarDropdownOpen,
    isCollapsed,
    setShowPeek,
  ]);

  const handleSidebarFocus = useCallback(() => {
    if (!isCollapsed) return;
    setHasFocusWithin(true);
    setShowPeek(true);
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
    }
  }, [isCollapsed, setShowPeek]);

  const handleSidebarBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;

      setHasFocusWithin(false);
      if (isCollapsed && !isHoveringTrigger && !isAnyExtendedSidebarExpanded && !isAnySidebarDropdownOpen) {
        peekTimeoutRef.current = setTimeout(() => {
          setShowPeek(false);
        }, 120);
      }
    },
    [isAnyExtendedSidebarExpanded, isAnySidebarDropdownOpen, isCollapsed, isHoveringTrigger, setShowPeek]
  );

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

  // Clean up timeout on unmount
  useEffect(
    () => () => {
      if (peekTimeoutRef.current) {
        clearTimeout(peekTimeoutRef.current);
      }
    },
    []
  );

  // Reset peek when sidebar is expanded
  useEffect(() => {
    if (!isCollapsed) {
      setShowPeek(false);
      setIsHoveringTrigger(false);
      setHasFocusWithin(false);
      if (peekTimeoutRef.current) {
        clearTimeout(peekTimeoutRef.current);
      }
    }
  }, [isCollapsed, setShowPeek]);

  // Call external handlers when state changes
  useEffect(() => {
    onWidthChange?.(width);
  }, [width, onWidthChange]);

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  const shouldExpandCollapsedSidebar =
    isCollapsed && (isHoveringTrigger || hasFocusWithin || !!showPeek || isAnyExtendedSidebarExpanded || isAnySidebarDropdownOpen);
  const reservedWidth = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : width;
  const renderedWidth = shouldExpandCollapsedSidebar ? width : reservedWidth;

  return (
    <>
      {/* Main Sidebar */}
      <div
        id="main-sidebar"
        className={cn(
          "flyers-soft-resizable-sidebar relative z-30 h-full border-r border-subtle bg-surface-1",
          !isResizing && "transition-all duration-300 ease-in-out",
          "translate-x-0 opacity-100",
          isMobile && "absolute",
          className
        )}
        style={{
          width: `${reservedWidth}px`,
          minWidth: `${reservedWidth}px`,
          maxWidth: `${reservedWidth}px`,
        }}
        data-collapsed={isCollapsed ? "true" : "false"}
        data-expanded={isCollapsed ? (shouldExpandCollapsedSidebar ? "true" : "false") : "true"}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        onFocusCapture={handleSidebarFocus}
        onBlurCapture={handleSidebarBlur}
        tabIndex={isCollapsed ? 0 : undefined}
        role="complementary"
        aria-label="Main sidebar"
        data-prevent-outside-click={isMobile}
      >
        <aside
          className={cn(
            "flyers-soft-main-sidebar-panel group/sidebar flex h-full flex-col overflow-hidden bg-surface-1 pt-3",
            isCollapsed ? "absolute top-0 left-0" : "relative w-full",
            shouldExpandCollapsedSidebar && "flyers-soft-sidebar-hover-expanded",
            isAnyExtendedSidebarExpanded && "rounded-none"
          )}
          style={{
            width: `${renderedWidth}px`,
            minWidth: `${renderedWidth}px`,
            maxWidth: `${renderedWidth}px`,
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
