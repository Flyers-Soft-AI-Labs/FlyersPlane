/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { cn } from "@plane/utils";

type TSidebarNavItem = {
  className?: string;
  isActive?: boolean;
  children?: React.ReactNode;
};

export function SidebarNavItem(props: TSidebarNavItem) {
  const { className, isActive, children } = props;
  return (
    <div
      className={cn(
        "flyers-soft-sidebar-nav-item group relative flex w-full items-center justify-between outline-none",
        isActive ? "text-primary" : "text-secondary",
        className
      )}
      data-active={isActive ? "true" : undefined}
    >
      {children}
    </div>
  );
}
