/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { observer } from "mobx-react";
// plane helpers
import { useOutsideClickDetector } from "@plane/hooks";
import { ScrollArea } from "@plane/propel/scrollarea";
// components
import { FlyersLogo } from "@/components/common/flyers-logo";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import useSize from "@/hooks/use-window-size";

type TSidebarWrapperProps = {
  title: string;
  children: React.ReactNode;
  quickActions?: React.ReactNode;
};

export const SidebarWrapper = observer(function SidebarWrapper(props: TSidebarWrapperProps) {
  const { title, children, quickActions } = props;
  // store hooks
  const { toggleSidebar, sidebarCollapsed } = useAppTheme();
  const windowSize = useSize();
  // refs
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClickDetector(ref, () => {
    if (sidebarCollapsed === false && window.innerWidth < 768) {
      toggleSidebar();
    }
  });

  useEffect(() => {
    if (windowSize[0] < 768 && !sidebarCollapsed) toggleSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSize]);

  return (
    <>
      <div ref={ref} className="flyers-soft-sidebar-shell flex h-full w-full animate-fade-in flex-col">
        <div className="flex flex-col gap-3 px-3">
          {/* Workspace switcher and settings */}

          <div className="flyers-soft-sidebar-brand flex items-start justify-between gap-2 px-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <FlyersLogo className="h-10 max-w-[120px] min-w-0 object-contain" />
              <div className="min-w-0">
                <span className="flyers-soft-sidebar-brand-text text-15 block min-w-0 truncate font-semibold text-primary">
                  Flyers Soft
                </span>
                <span className="flyers-soft-sidebar-title flex min-w-0 items-center gap-1 text-13">
                  <span className="truncate">{title}</span>
                  <ChevronDown className="size-3.5 flex-shrink-0" strokeWidth={2} />
                </span>
              </div>
            </div>
          </div>
          {/* Quick actions */}
          {quickActions}
        </div>

        <ScrollArea
          orientation="vertical"
          scrollType="hover"
          size="sm"
          rootClassName="size-full overflow-x-hidden overflow-y-auto"
          viewportClassName="flex flex-col gap-3 overflow-x-hidden h-full w-full overflow-y-auto px-3 pt-3 pb-0.5"
        >
          {children}
        </ScrollArea>
        <div className="flyers-soft-sidebar-promo">
          <div className="flyers-soft-sidebar-promo-rocket" aria-hidden="true" />
          <p className="text-13 font-semibold uppercase">Flyers Soft</p>
          <p className="mt-2 text-14 leading-5">Making work first smarter.</p>
        </div>
      </div>
    </>
  );
});
