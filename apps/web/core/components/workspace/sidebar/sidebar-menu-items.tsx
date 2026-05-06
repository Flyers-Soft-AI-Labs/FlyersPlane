/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { LucideIcon } from "lucide-react";
import { BarChart3, FolderKanban, LayoutDashboard, Settings, Ticket, Users } from "lucide-react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
// plane imports
import { cn } from "@plane/utils";
// components
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";

type TFlyersSidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
};

export const SidebarMenuItems = observer(function SidebarMenuItems() {
  const params = useParams();
  const pathname = usePathname();

  const workspaceSlug = params.workspaceSlug?.toString();
  const projectId = params.projectId?.toString();

  if (!workspaceSlug) return null;

  const workspaceRoot = `/${workspaceSlug}`;
  const ticketsHref = projectId
    ? `${workspaceRoot}/projects/${projectId}/issues/`
    : `${workspaceRoot}/workspace-views/all-issues/`;

  const items: TFlyersSidebarItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: workspaceRoot,
      icon: LayoutDashboard,
      isActive: pathname === workspaceRoot || pathname === `${workspaceRoot}/`,
    },
    {
      key: "tickets",
      label: "Tickets",
      href: ticketsHref,
      icon: Ticket,
      isActive:
        pathname?.includes("/issues") ||
        pathname?.includes("/workspace-views/all-issues") ||
        pathname?.includes("/browse/"),
    },
    {
      key: "projects",
      label: "Projects",
      href: `${workspaceRoot}/projects`,
      icon: FolderKanban,
      isActive: pathname?.startsWith(`${workspaceRoot}/projects`) && !pathname?.includes("/issues"),
    },
    {
      key: "teams",
      label: "Teams",
      href: `${workspaceRoot}/settings/members`,
      icon: Users,
      isActive: pathname?.startsWith(`${workspaceRoot}/settings/members`),
    },
    {
      key: "reports",
      label: "Reports",
      href: `${workspaceRoot}/analytics/overview`,
      icon: BarChart3,
      isActive: pathname?.startsWith(`${workspaceRoot}/analytics`),
    },
    {
      key: "settings",
      label: "Settings",
      href: `${workspaceRoot}/settings`,
      icon: Settings,
      isActive: pathname?.startsWith(`${workspaceRoot}/settings`) && !pathname?.includes("/settings/members"),
    },
  ];

  return (
    <nav className="flyers-soft-sidebar-nav-group flex flex-col gap-1" aria-label="Flyers Soft navigation">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <SidebarNavItem key={item.key} isActive={item.isActive} className="flyers-soft-sidebar-simple-item !px-0">
            <Link
              href={item.href}
              className={cn(
                "flex min-h-10 w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-13 font-medium",
                "flyers-soft-sidebar-simple-link",
                item.isActive ? "text-primary" : "text-secondary"
              )}
            >
              <Icon className="size-4 flex-shrink-0" strokeWidth={2} />
              <span className="truncate">{item.label}</span>
            </Link>
          </SidebarNavItem>
        );
      })}
    </nav>
  );
});
