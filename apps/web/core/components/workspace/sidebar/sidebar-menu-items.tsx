/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Dialog, Transition } from "@headlessui/react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ChevronDown,
  FileText,
  Folder,
  HelpCircle,
  Home,
  Inbox,
  Mail,
  Search,
  Settings,
  Ticket,
  Trash2,
  Users,
  ListTodo,
  X,
} from "lucide-react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
// plane imports
import { cn, orderWorkspacesList } from "@plane/utils";
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

const HELP_CONTACTS = [
  {
    name: "Krishna Kompalli",
    email: "krishna.kompalli@flyerssoft.com",
    initials: "KK",
  },
  {
    name: "Shalini Priya",
    email: "shalini.p@flyerssoft.com",
    initials: "SP",
  },
  {
    name: "Pavan Kumar",
    email: "pavankumarduddi@gmail.com",
    initials: "PK",
  },
] as const;

export const SidebarMenuItems = observer(function SidebarMenuItems() {
  const params = useParams();
  const pathname = usePathname();
  const { togglePowerKModal } = usePowerK();
  const { currentWorkspace, workspaces } = useWorkspace();
  const [isTeamspaceOpen, setIsTeamspaceOpen] = useState(true);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const workspacesList = orderWorkspacesList(Object.values(workspaces ?? {}));
  const fallbackWorkspace = currentWorkspace ?? workspacesList[0];
  const workspaceSlug = params.workspaceSlug?.toString() ?? fallbackWorkspace?.slug;
  const projectId = params.projectId?.toString();

  const workspaceRoot = workspaceSlug ? `/${workspaceSlug}` : "";
  const ticketsHref = projectId
    ? `${workspaceRoot}/projects/${projectId}/issues/`
    : `${workspaceRoot}/workspace-views/all-issues/`;

  const workspaceName = fallbackWorkspace?.name ?? "Flyers Plane";
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
  const hasActiveTeamspaceItem = teamspaceItems.some((item) => item.isActive);

  useEffect(() => {
    if (hasActiveTeamspaceItem) setIsTeamspaceOpen(true);
  }, [hasActiveTeamspaceItem]);

  if (!workspaceSlug) return null;

  const privateItems: TFlyersSidebarItem[] = [
    {
      key: "templates",
      label: "Templates",
      href: `${workspaceRoot}/templates`,
      icon: FileText,
      isActive: pathname === `${workspaceRoot}/templates` || pathname === `${workspaceRoot}/templates/`,
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
      onClick: () => setIsHelpModalOpen(true),
    },
  ];

  return (
    <>
      <HelpSupportModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />

      <nav className="flyers-soft-sidebar-nav-group flex flex-col" aria-label="Flyers Soft navigation">
        <div className="flyers-soft-sidebar-section">
          {topItems.map((item) => (
            <FlyersSidebarItem key={item.key} item={item} />
          ))}
        </div>

        <div className="flyers-soft-sidebar-section flyers-soft-sidebar-teamspace-section">
          <div className="flyers-soft-sidebar-section-label">Teamspaces</div>
          <button
            type="button"
            className="flyers-soft-sidebar-workspace-row w-full text-left"
            onClick={() => setIsTeamspaceOpen((prev) => !prev)}
            aria-expanded={isTeamspaceOpen}
            aria-controls="flyers-soft-sidebar-teamspace-list"
          >
            <span className="flyers-soft-sidebar-workspace-icon">{workspaceInitial}</span>
            <span className="min-w-0 flex-1 truncate">{workspaceName}</span>
            <ChevronDown
              className={cn("size-3.5 flex-shrink-0 transition-transform duration-200", {
                "rotate-180": isTeamspaceOpen,
              })}
              style={{ transform: isTeamspaceOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              strokeWidth={2}
            />
          </button>
          <div
            id="flyers-soft-sidebar-teamspace-list"
            className={cn(
              "flyers-soft-sidebar-nested-list overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out",
              isTeamspaceOpen ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0"
            )}
            style={{
              maxHeight: isTeamspaceOpen ? "384px" : "0px",
              opacity: isTeamspaceOpen ? 1 : 0,
            }}
          >
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
    </>
  );
});

function HelpSupportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[rgba(0,0,0,0.25)] backdrop-blur-[1px] transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-2 scale-95 opacity-0"
              enterTo="translate-y-0 scale-100 opacity-100"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0 scale-100 opacity-100"
              leaveTo="translate-y-2 scale-95 opacity-0"
            >
              <Dialog.Panel className="border-neutral-200 relative w-full max-w-[30rem] overflow-hidden rounded-2xl border bg-white p-6 text-left shadow-[0_20px_72px_rgba(0,0,0,0.16)]">
                <button
                  type="button"
                  className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 absolute top-4 right-4 grid size-8 place-items-center rounded-md transition"
                  onClick={onClose}
                  aria-label="Close help and support"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>

                <div className="flex items-center gap-4 pr-9">
                  <div className="bg-neutral-100 text-neutral-600 grid size-12 flex-shrink-0 place-items-center rounded-xl">
                    <HelpCircle className="size-6" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <Dialog.Title className="text-xl text-neutral-950 leading-7 font-semibold">Need help?</Dialog.Title>
                    <p className="text-sm text-neutral-600 mt-1">Reach out to us.</p>
                  </div>
                </div>

                <div className="divide-neutral-200 border-neutral-200 mt-6 divide-y border-y">
                  {HELP_CONTACTS.map((contact) => (
                    <div key={contact.email} className="flex items-center gap-3 py-3.5">
                      <div className="bg-neutral-100 text-sm text-neutral-900 grid size-10 flex-shrink-0 place-items-center rounded-full font-medium">
                        {contact.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-neutral-950 truncate font-semibold">{contact.name}</div>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm text-neutral-600 hover:text-neutral-950 block truncate transition"
                        >
                          {contact.email}
                        </a>
                      </div>
                      <a
                        href={`mailto:${contact.email}`}
                        className="border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 grid size-10 flex-shrink-0 place-items-center rounded-xl border transition"
                        aria-label={`Email ${contact.name}`}
                      >
                        <Mail className="size-4" strokeWidth={1.8} />
                      </a>
                    </div>
                  ))}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

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
