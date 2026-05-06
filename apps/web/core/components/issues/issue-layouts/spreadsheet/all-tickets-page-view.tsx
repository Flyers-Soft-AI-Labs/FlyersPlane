/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  LayoutList,
  ListChecks,
  Minus,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Sun,
  Ticket,
  X,
} from "lucide-react";
import useSWR from "swr";
import { EIssueFilterType, ISSUE_DISPLAY_FILTERS_BY_PAGE } from "@plane/constants";
import type { IIssueDisplayFilterOptions, IIssueDisplayProperties, IState, TIssue } from "@plane/types";
import { EIssueLayoutTypes, EIssueServiceType, EIssuesStoreType } from "@plane/types";
import { Avatar } from "@plane/ui";
import { calculateTimeAgoShort, cn, generateWorkItemLink, getFileURL, getNumberCount } from "@plane/utils";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import { useUser } from "@/hooks/store/user";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local imports
import { DisplayFiltersSelection, FiltersDropdown } from "../filters";
import type { TRenderQuickActions } from "../list/list-view-types";

const COL_TEMPLATE = "40px 40px 106px minmax(260px,1fr) 184px 166px 158px 130px 52px";
const PAGE_SIZE = 5;
const SKELETON_ROW_KEYS = ["loading-row-1", "loading-row-2", "loading-row-3"];

type FilterTab = "all" | "mine" | "unassigned" | "starred";
type StatAccent = "slate" | "amber" | "blue" | "green" | "rose";

interface AllTicketsPageViewProps {
  issueIds: string[];
  quickActions: TRenderQuickActions;
  updateIssue: ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>) | undefined;
  canEditProperties: (projectId: string | undefined) => boolean;
  canLoadMoreIssues: boolean;
  loadMoreIssues: () => void;
}

type TStatCard = {
  accent: StatAccent;
  count: number;
  icon: typeof Ticket;
  label: string;
  subtitle: string;
};

const statAccentClasses: Record<StatAccent, string> = {
  slate: "bg-[#f0f2f5] text-[#64748b]",
  amber: "bg-[#fff4cf] text-[#f5a400]",
  blue: "bg-[#e8f2ff] text-[#1677ff]",
  green: "bg-[#e8f8ef] text-[#079669]",
  rose: "bg-[#ffe8ec] text-[#e5485d]",
};

function getStateTone(state: IState | undefined) {
  const name = state?.name?.toLowerCase() ?? "";
  const group = state?.group;

  if (name.includes("review")) return "border-[#cfe3ff] bg-[#edf6ff] text-[#1169d8]";
  if (group === "completed") return "border-[#ccefdc] bg-[#effaf4] text-[#087a50]";
  if (group === "started") return "border-[#ffe3a3] bg-[#fff8e7] text-[#9a6400]";
  if (group === "cancelled" || name.includes("blocked")) return "border-[#ffd4dc] bg-[#fff1f3] text-[#c52f48]";
  return "border-[#e3e7ef] bg-[#f3f4f6] text-[#475569]";
}

function getPriorityTone(priority: TIssue["priority"]) {
  switch (priority) {
    case "urgent":
    case "high":
      return {
        className: "text-[#e11d48]",
        icon: ArrowUp,
        label: priority,
      };
    case "medium":
      return {
        className: "text-[#f97316]",
        icon: Minus,
        label: priority,
      };
    case "low":
      return {
        className: "text-[#16a34a]",
        icon: ArrowDown,
        label: priority,
      };
    default:
      return {
        className: "text-[#64748b]",
        icon: Minus,
        label: "None",
      };
  }
}

export const AllTicketsPageView = observer(function AllTicketsPageView(props: AllTicketsPageViewProps) {
  const { issueIds, quickActions, canEditProperties, canLoadMoreIssues, loadMoreIssues } = props;

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const { workspaceSlug } = useParams();
  const workspaceSlugString = workspaceSlug?.toString() ?? "";
  const { setTheme, resolvedTheme } = useTheme();
  const { toggleCreateIssueModal } = useCommandPalette();
  const {
    issueMap,
    issuesFilter: { issueFilters, updateFilters },
  } = useIssues(EIssuesStoreType.GLOBAL);
  const { getStateById } = useProjectState();
  const { currentWorkspace, getWorkspaceBySlug } = useWorkspace();
  const { unreadNotificationsCount, getUnreadNotificationsCount } = useWorkspaceNotifications();
  const { data: currentUser } = useUser();
  const currentUserId = currentUser?.id;
  const workspace = currentWorkspace ?? (workspaceSlugString ? getWorkspaceBySlug(workspaceSlugString) : null);
  const workspaceName = workspace?.name ?? workspaceSlugString ?? "Workspace";
  const notificationCount = unreadNotificationsCount.total_unread_notifications_count;

  useIntersectionObserver(containerRef, canLoadMoreIssues ? sentinelEl : null, loadMoreIssues, "100% 0% 100% 0%");

  useSWR(
    workspaceSlugString ? `ALL_TICKETS_UNREAD_NOTIFICATION_COUNT_${workspaceSlugString}` : null,
    workspaceSlugString ? () => getUnreadNotificationsCount(workspaceSlugString) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const stats = useMemo(() => {
    let total = 0;
    let inProgress = 0;
    let inReview = 0;
    let done = 0;
    let blocked = 0;

    for (const id of issueIds) {
      const issue = issueMap[id];
      if (!issue) continue;

      total++;
      const state = getStateById(issue.state_id);
      const name = state?.name?.toLowerCase() ?? "";

      if (state?.group === "completed") done++;
      else if (state?.group === "cancelled" || name.includes("blocked")) blocked++;
      else if (name.includes("review")) inReview++;
      else if (state?.group === "started") inProgress++;
    }

    return { total, inProgress, inReview, done, blocked };
  }, [getStateById, issueIds, issueMap]);

  const filteredIds = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return issueIds.filter((id) => {
      const issue = issueMap[id];
      if (!issue) return false;
      if (query && !issue.name.toLowerCase().includes(query)) return false;
      if (activeFilter === "mine") return issue.assignee_ids?.includes(currentUserId ?? "") ?? false;
      if (activeFilter === "unassigned") return !issue.assignee_ids?.length;
      if (activeFilter === "starred") return starredIds.has(id);
      return true;
    });
  }, [activeFilter, currentUserId, issueIds, issueMap, searchText, starredIds]);

  const totalPages = Math.max(1, Math.ceil(filteredIds.length / PAGE_SIZE));
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleIssueIds = filteredIds.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const showingStart = filteredIds.length > 0 ? pageStartIndex + 1 : 0;
  const showingEnd = Math.min(pageStartIndex + visibleIssueIds.length, filteredIds.length);
  const allVisibleSelected = visibleIssueIds.length > 0 && visibleIssueIds.every((issueId) => selectedIds.has(issueId));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchText]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const toggleStar = (id: string) =>
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectVisible = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIssueIds.forEach((id) => next.delete(id));
      else visibleIssueIds.forEach((id) => next.add(id));
      return next;
    });

  const clearFilters = () => {
    setActiveFilter("all");
    setSearchText("");
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((page) => page + 1);
    else if (canLoadMoreIssues) loadMoreIssues();
  };

  const handleLayoutChange = () => {
    if (!workspaceSlugString) return;

    updateFilters(
      workspaceSlugString,
      undefined,
      EIssueFilterType.DISPLAY_FILTERS,
      {
        layout: EIssueLayoutTypes.SPREADSHEET,
      },
      "all-issues"
    );
  };

  const handleDisplayFiltersUpdate = (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => {
    if (!workspaceSlugString) return;

    updateFilters(workspaceSlugString, undefined, EIssueFilterType.DISPLAY_FILTERS, updatedDisplayFilter, "all-issues");
  };

  const handleDisplayPropertiesUpdate = (updatedDisplayProperties: Partial<IIssueDisplayProperties>) => {
    if (!workspaceSlugString) return;

    updateFilters(
      workspaceSlugString,
      undefined,
      EIssueFilterType.DISPLAY_PROPERTIES,
      updatedDisplayProperties,
      "all-issues"
    );
  };

  const statCards: TStatCard[] = [
    {
      accent: "slate",
      count: stats.total,
      icon: Ticket,
      label: "Total Tickets",
      subtitle: "All created tickets",
    },
    {
      accent: "amber",
      count: stats.inProgress,
      icon: Clock3,
      label: "In Progress",
      subtitle: "Currently in progress",
    },
    {
      accent: "blue",
      count: stats.inReview,
      icon: ListChecks,
      label: "In Review",
      subtitle: "In review states",
    },
    {
      accent: "green",
      count: stats.done,
      icon: CheckCircle2,
      label: "Done",
      subtitle: "Completed tickets",
    },
    {
      accent: "rose",
      count: stats.blocked,
      icon: ShieldAlert,
      label: "Blocked",
      subtitle: "Currently blocked",
    },
  ];

  return (
    <div className="flyers-soft-all-issues-view-body h-full overflow-hidden bg-[#fbf7ef] text-[#111827]">
      <div ref={portalRef} className="spreadsheet-menu-portal" />

      <div className="flex h-[70px] items-center justify-between border-b border-[#eadfca] bg-white/95 px-6">
        <div className="flex items-center gap-3">
          <div className="shadow-sm grid size-9 place-items-center rounded-xl bg-[#ffc42e] font-semibold text-white">
            {workspaceName.charAt(0).toUpperCase()}
          </div>
          <button type="button" className="text-15 flex items-center gap-2 font-semibold text-[#111827]">
            <span className="max-w-56 truncate">{workspaceName}</span>
            <ChevronDown className="size-4 text-[#64748b]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-[#f5a400] transition hover:bg-[#fff4cf]"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
          </button>
          <Link
            href={workspaceSlugString ? `/${workspaceSlugString}/notifications/` : "#"}
            className="relative grid size-9 place-items-center rounded-full text-[#111827] transition hover:bg-[#fff4cf]"
            aria-label="Notifications"
          >
            <Bell className="size-5" strokeWidth={2} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#ffc107] px-1 text-10 font-bold text-[#111827]">
                {getNumberCount(notificationCount)}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="shadow-sm hover:shadow-md flex h-10 items-center gap-2 rounded-lg bg-[#ffc42e] px-5 text-14 font-semibold text-[#111827] transition hover:-translate-y-0.5 hover:bg-[#ffbd14]"
            onClick={() => toggleCreateIssueModal(true)}
          >
            <Plus className="size-4" strokeWidth={2.3} />
            Create Ticket
          </button>
          <Avatar
            name={currentUser?.display_name}
            src={getFileURL(currentUser?.avatar_url ?? "")}
            size={40}
            shape="circle"
            className="font-semibold"
          />
        </div>
      </div>

      <main ref={containerRef} className="h-[calc(100%-70px)] min-h-0 overflow-y-auto px-6 py-7">
        <section className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-6">
            <h1 className="text-24 font-semibold tracking-tight text-[#111827]">Tickets</h1>
            <div className="shadow-sm flex h-12 w-[420px] items-center gap-3 rounded-xl border border-[#eadfca] bg-white px-4 focus-within:border-[#ffc42e]">
              <Search className="size-5 flex-shrink-0 text-[#334155]" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search tickets, projects, teams..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-14 text-[#111827] outline-none placeholder:text-[#64748b]"
              />
              <span className="rounded-md bg-[#fff4cf] px-2 py-1 text-11 font-medium text-[#8a5b00]">Ctrl + K</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="shadow-sm flex h-12 items-center gap-1 rounded-xl border border-[#eadfca] bg-white px-3">
              <button
                type="button"
                title="List view"
                aria-pressed="true"
                className="grid size-8 place-items-center rounded-lg bg-[#fff4cf] text-[#f5a400]"
                onClick={handleLayoutChange}
              >
                <LayoutList className="size-4" strokeWidth={2} />
              </button>
            </div>
            <DisplayMenu
              displayFilters={issueFilters?.displayFilters}
              displayProperties={issueFilters?.displayProperties ?? {}}
              onDisplayFiltersUpdate={handleDisplayFiltersUpdate}
              onDisplayPropertiesUpdate={handleDisplayPropertiesUpdate}
            />
            {workspaceSlugString && (
              <Link
                href={`/${workspaceSlugString}/analytics/overview/`}
                className="shadow-sm flex h-12 items-center gap-2 rounded-xl border border-[#eadfca] bg-white px-5 text-14 font-medium text-[#334155] transition hover:-translate-y-0.5 hover:bg-[#fffaf0]"
              >
                <BarChart3 className="size-4" strokeWidth={2} />
                Analytics
              </Link>
            )}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-5 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        <section className="mt-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FilterPill label="All Tickets" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            <FilterPill label="My Tickets" active={activeFilter === "mine"} onClick={() => setActiveFilter("mine")} />
            <FilterPill
              label="Unassigned"
              active={activeFilter === "unassigned"}
              onClick={() => setActiveFilter("unassigned")}
            />
            <FilterPill
              label="Starred"
              active={activeFilter === "starred"}
              onClick={() => setActiveFilter("starred")}
            />
          </div>
          <div className="flex items-center gap-3">
            <FilterButton icon={Filter} label="Filter" />
            <FilterButton label="Status" />
            <FilterButton label="Priority" />
            <FilterButton label="Assignee" />
            <button type="button" onClick={clearFilters} className="px-3 text-14 font-medium text-[#334155]">
              Clear
            </button>
          </div>
        </section>

        <section className="shadow-sm mt-6 overflow-hidden rounded-xl border border-[#dfe5ef] bg-white">
          <TicketTableHeader allSelected={allVisibleSelected} onToggleSelectAll={toggleSelectVisible} />

          {visibleIssueIds.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-14 text-[#64748b]">
              No tickets match your filters.
            </div>
          ) : (
            visibleIssueIds.map((id) => (
              <TicketTableRow
                key={id}
                canEditProperties={canEditProperties}
                isSelected={selectedIds.has(id)}
                isStarred={starredIds.has(id)}
                issueId={id}
                onToggleSelect={() => toggleSelect(id)}
                onToggleStar={() => toggleStar(id)}
                portalRef={portalRef}
                quickActions={quickActions}
              />
            ))
          )}

          <div className="flex min-h-[76px] items-center justify-between border-t border-[#dfe5ef] px-6 text-13 text-[#475569]">
            <span>
              Showing {showingStart} to {showingEnd} of {filteredIds.length} tickets
            </span>
            <div className="flex items-center gap-2">
              <PaginationButton
                icon={ChevronLeft}
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              />
              {[1, 2, 3].map((page) => (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => setCurrentPage(Math.min(page, totalPages))}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg border text-13 font-semibold transition",
                    currentPage === page
                      ? "border-[#ffc42e] bg-[#ffc42e] text-[#111827]"
                      : "border-[#dfe5ef] bg-white text-[#334155] hover:bg-[#fffaf0]"
                  )}
                >
                  {page}
                </button>
              ))}
              <PaginationButton
                icon={ChevronRight}
                isDisabled={!canLoadMoreIssues && currentPage >= totalPages}
                onClick={handleNextPage}
              />
              <button
                type="button"
                className="ml-4 flex h-9 items-center gap-2 rounded-lg border border-[#dfe5ef] bg-white px-3 text-13 font-medium text-[#334155]"
              >
                {PAGE_SIZE} / page
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>

          {canLoadMoreIssues && (
            <div ref={setSentinelEl} className="space-y-2 px-6 pb-4">
              {SKELETON_ROW_KEYS.map((key) => (
                <div key={key} className="h-12 animate-pulse rounded-lg bg-[#fffaf0]" />
              ))}
            </div>
          )}
        </section>

        <div className="mt-5 flex min-h-16 items-center justify-between rounded-xl border border-[#f0d58a] bg-white/70 px-6 text-13 text-[#475569]">
          <div className="flex items-center gap-3">
            <Sun className="size-4 text-[#f5a400]" />
            <span>
              <span className="font-semibold text-[#334155]">Tip:</span> Use filters to quickly find the tickets you
              need.
            </span>
          </div>
          <X className="size-4 text-[#64748b]" />
        </div>
      </main>
    </div>
  );
});

function DisplayMenu({
  displayFilters,
  displayProperties,
  onDisplayFiltersUpdate,
  onDisplayPropertiesUpdate,
}: {
  displayFilters: IIssueDisplayFilterOptions | undefined;
  displayProperties: IIssueDisplayProperties;
  onDisplayFiltersUpdate: (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => void;
  onDisplayPropertiesUpdate: (updatedDisplayProperties: Partial<IIssueDisplayProperties>) => void;
}) {
  return (
    <FiltersDropdown
      menuButton={
        <span className="shadow-sm flex h-12 items-center gap-2 rounded-xl border border-[#eadfca] bg-white px-5 text-14 font-medium text-[#334155] transition hover:-translate-y-0.5 hover:bg-[#fffaf0]">
          <SlidersHorizontal className="size-4" strokeWidth={2} />
          Display
        </span>
      }
      placement="bottom-end"
    >
      <DisplayFiltersSelection
        layoutDisplayFiltersOptions={
          ISSUE_DISPLAY_FILTERS_BY_PAGE.my_issues.layoutOptions[EIssueLayoutTypes.SPREADSHEET]
        }
        displayFilters={displayFilters}
        displayProperties={displayProperties}
        handleDisplayFiltersUpdate={onDisplayFiltersUpdate}
        handleDisplayPropertiesUpdate={onDisplayPropertiesUpdate}
      />
    </FiltersDropdown>
  );
}

function StatCard({ accent, count, icon: Icon, label, subtitle }: TStatCard) {
  return (
    <div className="flex min-h-[134px] items-center gap-4 rounded-xl border border-[#edf0f5] bg-white p-5 shadow-[0_12px_32px_rgba(17,24,39,0.06)] transition duration-150 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(17,24,39,0.12)]">
      <div className={cn("grid size-12 flex-shrink-0 place-items-center rounded-full", statAccentClasses[accent])}>
        <Icon className="size-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-14 font-medium text-[#334155]">{label}</div>
        <div className="text-26 mt-2 leading-none font-bold text-[#111827] tabular-nums">{count.toLocaleString()}</div>
        <div className="mt-4 truncate text-13 text-[#64748b]">{subtitle}</div>
      </div>
    </div>
  );
}

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-15 h-11 rounded-xl px-5 font-medium transition",
        active ? "bg-[#fff1c2] text-[#d68a00]" : "text-[#111827] hover:bg-[#fffaf0]"
      )}
    >
      {label}
    </button>
  );
}

function FilterButton({ icon: Icon, label }: { icon?: typeof Filter; label: string }) {
  return (
    <button
      type="button"
      className="shadow-sm flex h-11 min-w-30 items-center justify-center gap-2 rounded-xl border border-[#dfe5ef] bg-white px-4 text-14 font-medium text-[#111827] transition hover:bg-[#fffaf0]"
    >
      {Icon && <Icon className="size-4 text-[#475569]" strokeWidth={2} />}
      {label}
      {!Icon && <ChevronDown className="size-4 text-[#64748b]" />}
    </button>
  );
}

function TicketTableHeader({
  allSelected,
  onToggleSelectAll,
}: {
  allSelected: boolean;
  onToggleSelectAll: () => void;
}) {
  return (
    <div
      className="grid h-16 items-center border-b border-[#dfe5ef] px-5 text-14 font-medium text-[#475569]"
      style={{ gridTemplateColumns: COL_TEMPLATE }}
    >
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          className="size-4 rounded border-[#cbd5e1] accent-[#ffc42e]"
        />
      </div>
      <div />
      <div>Ticket</div>
      <div />
      <div>Status</div>
      <div>Priority</div>
      <div>Assignee</div>
      <div>Updated</div>
      <div className="flex justify-center">
        <SlidersHorizontal className="size-4 text-[#64748b]" />
      </div>
    </div>
  );
}

interface TicketTableRowProps {
  canEditProperties: (projectId: string | undefined) => boolean;
  issueId: string;
  isSelected: boolean;
  isStarred: boolean;
  onToggleSelect: () => void;
  onToggleStar: () => void;
  portalRef: MutableRefObject<HTMLDivElement | null>;
  quickActions: TRenderQuickActions;
}

const TicketTableRow = observer(function TicketTableRow(props: TicketTableRowProps) {
  const { canEditProperties, issueId, isSelected, isStarred, onToggleSelect, onToggleStar, portalRef, quickActions } =
    props;

  const rowRef = useRef<HTMLDivElement | null>(null);
  const { workspaceSlug } = useParams();
  const { getProjectIdentifierById } = useProject();
  const { getStateById } = useProjectState();
  const memberStore = useMember();
  const { handleRedirection } = useIssuePeekOverviewRedirection(false);
  const { isMobile } = usePlatformOS();
  const { issue, getIsIssuePeeked, peekIssue } = useIssueDetail(EIssueServiceType.ISSUES);

  const issueDetail = issue.getIssueById(issueId);
  if (!issueDetail) return null;

  const state = getStateById(issueDetail.state_id);
  const projectIdentifier = getProjectIdentifierById(issueDetail.project_id);
  const ticketKey =
    projectIdentifier && issueDetail.sequence_id ? `${projectIdentifier}-${issueDetail.sequence_id}` : "-";
  const disableUserActions = !canEditProperties(issueDetail.project_id ?? undefined);
  const isPeeked = getIsIssuePeeked(issueDetail.id) && peekIssue?.nestingLevel === 0;
  const firstAssigneeId = issueDetail.assignee_ids?.[0];
  const assignee = firstAssigneeId ? memberStore.getUserDetails(firstAssigneeId) : undefined;
  const updatedLabel = issueDetail.updated_at ? calculateTimeAgoShort(issueDetail.updated_at) : "-";
  const priorityTone = getPriorityTone(issueDetail.priority);
  const PriorityToneIcon = priorityTone.icon;

  const workItemLink = generateWorkItemLink({
    workspaceSlug: workspaceSlug?.toString(),
    projectId: issueDetail.project_id,
    issueId,
    projectIdentifier,
    sequenceId: issueDetail.sequence_id,
    isEpic: false,
  });

  const handlePeekOverview = () => handleRedirection(workspaceSlug?.toString(), issueDetail, isMobile, 0);

  const customActionButton = (
    <span className="grid size-8 place-items-center rounded-lg text-[#64748b] transition hover:bg-[#fff4cf] hover:text-[#111827]">
      <MoreHorizontal className="size-5" />
    </span>
  );

  return (
    <div
      ref={rowRef}
      aria-selected={isSelected || isPeeked ? "true" : undefined}
      data-active={isPeeked ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
      className={cn(
        "flyers-soft-all-issues-ticket-row text-15 grid h-17 items-center border-b border-[#dfe5ef] px-5 text-[#111827] transition last:border-b-0 hover:bg-[#fffaf0]",
        (isSelected || isPeeked) && "flyers-soft-all-issues-ticket-row-active !bg-[#fffaf0] !text-[#111827]"
      )}
      style={{ gridTemplateColumns: COL_TEMPLATE }}
    >
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="size-4 rounded border-[#cbd5e1] accent-[#ffc42e]"
        />
      </div>

      <button
        type="button"
        className={cn("grid size-8 place-items-center rounded-lg text-[#64748b] hover:text-[#f5a400]", {
          "text-[#f5a400]": isStarred,
        })}
        onClick={onToggleStar}
        aria-label={isStarred ? "Unstar ticket" : "Star ticket"}
      >
        <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
      </button>

      <Link href={workItemLink} className="font-medium text-[#334155] hover:text-[#111827] hover:underline">
        {ticketKey}
      </Link>

      <button
        type="button"
        className="text-15 min-w-0 truncate text-left font-semibold text-[#111827] hover:text-[#d68a00]"
        onClick={handlePeekOverview}
      >
        {issueDetail.name}
      </button>

      <div>
        {state ? (
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-13 font-medium",
              getStateTone(state)
            )}
          >
            <span className="size-2 rounded-full bg-current opacity-60" />
            {state.name}
          </span>
        ) : (
          <span className="text-[#64748b]">-</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <PriorityToneIcon className={cn("size-4", priorityTone.className)} strokeWidth={2.2} />
        <span className="text-[#334155] capitalize">{priorityTone.label}</span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {assignee ? (
          <>
            <Avatar
              name={assignee.display_name}
              src={getFileURL(assignee.avatar_url ?? "")}
              size={30}
              shape="circle"
              className="flex-shrink-0"
            />
            <span className="truncate text-[#334155]">{assignee.display_name}</span>
          </>
        ) : (
          <>
            <div className="size-8 rounded-full border border-dashed border-[#cbd5e1]" />
            <span className="text-[#64748b]">Unassigned</span>
          </>
        )}
      </div>

      <span className="text-[#475569]">{updatedLabel}</span>

      <div className="flex justify-center">
        {!disableUserActions &&
          quickActions({
            issue: issueDetail,
            parentRef: rowRef,
            customActionButton,
            portalElement: portalRef.current,
          })}
      </div>
    </div>
  );
});

function PaginationButton({
  icon: Icon,
  isDisabled,
  onClick,
}: {
  icon: typeof ChevronLeft;
  isDisabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-lg border border-[#dfe5ef] bg-white text-[#334155] transition hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="size-4" />
    </button>
  );
}
