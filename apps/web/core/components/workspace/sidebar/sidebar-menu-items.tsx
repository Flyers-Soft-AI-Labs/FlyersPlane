/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ChevronDown,
  FileText,
  Folder,
  HelpCircle,
  Home,
  Inbox,
  Search,
  Settings,
  Ticket,
  Trash2,
  Users,
  ListTodo,
} from "lucide-react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
// plane imports
import { cn } from "@plane/utils";
// components
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
// hooks
import { usePowerK } from "@/hooks/store/use-power-k";
import { useWorkspace } from "@/hooks/store/use-workspace";

type TFlyersSidebarItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  href?: string;
  onClick?: () => void;
};

export const SidebarMenuItems = observer(function SidebarMenuItems() {
  const params = useParams();
  const pathname = usePathname();
  const { togglePowerKModal } = usePowerK();
  const { currentWorkspace } = useWorkspace();

  const workspaceSlug = params.workspaceSlug?.toString();
  const projectId = params.projectId?.toString();

  if (!workspaceSlug) return null;

  const workspaceRoot = `/${workspaceSlug}`;
  const ticketsHref = projectId
    ? `${workspaceRoot}/projects/${projectId}/issues/`
    : `${workspaceRoot}/workspace-views/all-issues/`;

  const workspaceName = currentWorkspace?.name ?? "Flyers Plane";
  const workspaceInitial = (workspaceName.trim().charAt(0) || "F").toUpperCase();

  const topItems: TFlyersSidebarItem[] = [
    {
      key: "search",
      label: "Search",
      icon: Search,
      isActive: false,
      onClick: () => togglePowerKModal(true),
    },
    {
      key: "inbox",
      label: "Inbox",
      href: `${workspaceRoot}/notifications`,
      icon: Inbox,
      isActive: pathname?.startsWith(`${workspaceRoot}/notifications`),
    },
    {
      key: "settings-members",
      label: "Settings & members",
      href: `${workspaceRoot}/settings/members`,
      icon: Settings,
      isActive: pathname?.startsWith(`${workspaceRoot}/settings/members`),
    },
  ];

  const teamspaceItems: TFlyersSidebarItem[] = [
    {
      key: "home",
      label: "Home",
      href: workspaceRoot,
      icon: Home,
      isActive: pathname === workspaceRoot || pathname === `${workspaceRoot}/`,
    },
    {
      key: "projects",
      label: "Projects",
      href: `${workspaceRoot}/projects`,
      icon: Folder,
      isActive:
        pathname?.startsWith(`${workspaceRoot}/projects`) &&
        !pathname?.includes("/issues") &&
        !pathname?.startsWith(`${workspaceRoot}/projects/archives`),
    },
    {
      key: "tasks",
      label: "To Do List",
      href: `${workspaceRoot}/workspace-views/assigned`,
      icon: ListTodo,
      isActive: pathname?.startsWith(`${workspaceRoot}/workspace-views/assigned`),
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
  ];

  const privateItems: TFlyersSidebarItem[] = [
    {
      key: "templates",
      label: "Templates",
      href: `${workspaceRoot}/workspace-views`,
      icon: FileText,
      isActive: pathname === `${workspaceRoot}/workspace-views`,
    },
    {
      key: "trash",
      label: "Trash",
      href: `${workspaceRoot}/projects/archives`,
      icon: Trash2,
      isActive: pathname?.startsWith(`${workspaceRoot}/projects/archives`),
    },
    {
      key: "help",
      label: "Help & support",
      icon: HelpCircle,
      isActive: false,
      onClick: () => window.open("https://go.plane.so/p-docs", "_blank", "noopener,noreferrer"),
    },
  ];

  return (
    <nav className="flyers-soft-sidebar-nav-group flex flex-col" aria-label="Flyers Soft navigation">
      <div className="flyers-soft-sidebar-section">
        {topItems.map((item) => (
          <FlyersSidebarItem key={item.key} item={item} />
        ))}
      </div>

      <div className="flyers-soft-sidebar-section flyers-soft-sidebar-teamspace-section">
        <div className="flyers-soft-sidebar-section-label">Teamspaces</div>
        <Link href={workspaceRoot} className="flyers-soft-sidebar-workspace-row">
          <span className="flyers-soft-sidebar-workspace-icon">{workspaceInitial}</span>
          <span className="min-w-0 flex-1 truncate">{workspaceName}</span>
          <ChevronDown className="size-3.5 flex-shrink-0" strokeWidth={2} />
        </Link>
        <div className="flyers-soft-sidebar-nested-list">
          {teamspaceItems.map((item) => (
            <FlyersSidebarItem key={item.key} item={item} nested />
          ))}
        </div>
      </div>

      <div className="flyers-soft-sidebar-section flyers-soft-sidebar-private-section">
        <div className="flyers-soft-sidebar-section-label">Private</div>
        {privateItems.map((item) => (
          <FlyersSidebarItem key={item.key} item={item} />
        ))}
      </div>
    </nav>
  );
});

function FlyersSidebarItem({ item, nested = false }: { item: TFlyersSidebarItem; nested?: boolean }) {
  const Icon = item.icon;
  const className = cn(
    "flex w-full min-w-0 items-center text-left text-13 font-medium",
    "flyers-soft-sidebar-simple-link",
    nested && "flyers-soft-sidebar-nested-link",
    item.isActive ? "text-primary" : "text-secondary"
  );
  const content = (
    <>
      <Icon className="size-4 flex-shrink-0" strokeWidth={1.8} />
      <span className="truncate">{item.label}</span>
    </>
  );

  return (
    <SidebarNavItem isActive={item.isActive} className="flyers-soft-sidebar-simple-item !px-0">
      {item.href ? (
        <Link href={item.href} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" className={className} onClick={item.onClick}>
          {content}
        </button>
      )}
    </SidebarNavItem>
  );
}
