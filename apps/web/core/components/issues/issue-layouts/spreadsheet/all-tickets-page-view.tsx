/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { MutableRefObject, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { EIssueFilterType, ISSUE_DISPLAY_FILTERS_BY_PAGE, ISSUE_PRIORITIES } from "@plane/constants";
import type { IIssueDisplayFilterOptions, IIssueDisplayProperties, IState, IUserLite, TIssue } from "@plane/types";
import { EIssueLayoutTypes, EIssueServiceType, EIssuesStoreType } from "@plane/types";
import { calculateTimeAgoShort, cn, generateWorkItemLink } from "@plane/utils";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useLabel } from "@/hooks/store/use-label";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUser } from "@/hooks/store/user";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local imports
import { DisplayFiltersSelection, FiltersDropdown } from "../filters";
import type { TRenderQuickActions } from "../list/list-view-types";
import {
  getPriorityTone,
  getStateOrderIndex,
  InlineAssigneeEditor,
  InlineDropdownMenu,
  InlinePriorityEditor,
  InlineStatusEditor,
  PRIORITY_ORDER,
} from "./ticket-inline-editors";
import type { InlineMenuField } from "./ticket-inline-editors";

const COL_TEMPLATE = "40px 40px 112px minmax(320px,1fr) 150px 140px 156px 112px 48px";
const PAGE_SIZE = 5;
const SKELETON_ROW_KEYS = ["loading-row-1", "loading-row-2", "loading-row-3"];
const UNASSIGNED_FILTER_VALUE = "__unassigned__";

type FilterTab = "all" | "mine" | "unassigned" | "starred";
type InlineMenuState = { issueId: string; field: InlineMenuField } | null;
type ToolbarMenuField = "label" | "status" | "priority" | "assignee";
type TicketPriority = NonNullable<TIssue["priority"]>;
type AssigneeFilter = string | typeof UNASSIGNED_FILTER_VALUE | null;

interface AllTicketsPageViewProps {
  issueIds: string[];
  quickActions: TRenderQuickActions;
  updateIssue: ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>) | undefined;
  canEditProperties: (projectId: string | undefined) => boolean;
  canLoadMoreIssues: boolean;
  loadMoreIssues: () => void;
}

function getPriorityLabel(priority: TIssue["priority"]) {
  if (!priority || priority === "none") return "None";
  return ISSUE_PRIORITIES.find((item) => item.key === priority)?.title ?? priority;
}

export const AllTicketsPageView = observer(function AllTicketsPageView(props: AllTicketsPageViewProps) {
  const { issueIds, quickActions, canEditProperties, canLoadMoreIssues, loadMoreIssues } = props;

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>(null);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [activeToolbarMenu, setActiveToolbarMenu] = useState<ToolbarMenuField | null>(null);
  const [activeInlineMenu, setActiveInlineMenu] = useState<InlineMenuState>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const { workspaceSlug } = useParams();
  const workspaceSlugString = workspaceSlug?.toString() ?? "";
  const {
    issueMap,
    issuesFilter: { issueFilters, updateFilters },
  } = useIssues(EIssuesStoreType.GLOBAL);
  const { getStateById } = useProjectState();
  const { getProjectById, getProjectIdentifierById } = useProject();
  const { getLabelById } = useLabel();
  const memberStore = useMember();
  const { data: currentUser } = useUser();
  const { toggleCreateIssueModal } = useCommandPalette();
  const currentUserId = currentUser?.id;

  useIntersectionObserver(containerRef, canLoadMoreIssues ? sentinelEl : null, loadMoreIssues, "100% 0% 100% 0%");

  const statusOptions = useMemo(() => {
    const statesById = new Map<string, IState>();

    for (const id of issueIds) {
      const issue = issueMap[id];
      const state = getStateById(issue?.state_id);
      if (state) statesById.set(state.id, state);
    }

    return [...statesById.values()].sort(
      (a, b) => getStateOrderIndex(a) - getStateOrderIndex(b) || a.order - b.order || a.sequence - b.sequence
    );
  }, [getStateById, issueIds, issueMap]);

  const assigneeOptions = useMemo(() => {
    const assigneeIds = new Set<string>();

    for (const id of issueIds) {
      const issue = issueMap[id];
      issue?.assignee_ids?.forEach((assigneeId) => assigneeIds.add(assigneeId));
    }

    return [...assigneeIds]
      .map((assigneeId) => memberStore.getUserDetails(assigneeId))
      .filter((member): member is IUserLite => !!member)
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [issueIds, issueMap, memberStore]);

  // Real, distinct filter criteria - not already covered by the Status/Priority/Assignee
  // dropdowns next to it or by the "All/Mine/Unassigned/Starred" tab row below.
  const labelOptions = useMemo(() => {
    const labelIds = new Set<string>();

    for (const id of issueIds) {
      const issue = issueMap[id];
      issue?.label_ids?.forEach((labelId) => labelIds.add(labelId));
    }

    return [...labelIds]
      .map((labelId) => getLabelById(labelId))
      .filter((label): label is NonNullable<typeof label> => !!label)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [getLabelById, issueIds, issueMap]);

  const selectedStatus = statusFilter ? statusOptions.find((state) => state.id === statusFilter) : undefined;
  const selectedAssignee =
    assigneeFilter && assigneeFilter !== UNASSIGNED_FILTER_VALUE
      ? memberStore.getUserDetails(assigneeFilter)
      : undefined;
  const selectedAssigneeLabel =
    assigneeFilter === UNASSIGNED_FILTER_VALUE ? "Unassigned" : selectedAssignee?.display_name;
  const selectedLabel = labelFilter ? getLabelById(labelFilter) : null;

  const filteredIds = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return issueIds.filter((id) => {
      const issue = issueMap[id];
      if (!issue) return false;
      const state = getStateById(issue.state_id);
      const projectIdentifier = getProjectIdentifierById(issue.project_id);
      const project = getProjectById(issue.project_id);
      const ticketKey = projectIdentifier && issue.sequence_id ? `${projectIdentifier}-${issue.sequence_id}` : "";
      const assigneeNames =
        issue.assignee_ids?.map((assigneeId) => memberStore.getUserDetails(assigneeId)?.display_name).join(" ") ?? "";
      const labelNames = issue.label_ids?.map((labelId) => getLabelById(labelId)?.name).join(" ") ?? "";
      const searchableText = [
        issue.name,
        ticketKey,
        projectIdentifier,
        project?.name,
        state?.name,
        getPriorityLabel(issue.priority),
        assigneeNames,
        labelNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchableText.includes(query)) return false;
      if (statusFilter && issue.state_id !== statusFilter) return false;
      if (priorityFilter && (issue.priority ?? "none") !== priorityFilter) return false;
      if (assigneeFilter === UNASSIGNED_FILTER_VALUE && issue.assignee_ids?.length) return false;
      if (
        assigneeFilter &&
        assigneeFilter !== UNASSIGNED_FILTER_VALUE &&
        !(issue.assignee_ids?.includes(assigneeFilter) ?? false)
      )
        return false;
      if (labelFilter && !(issue.label_ids?.includes(labelFilter) ?? false)) return false;
      if (activeFilter === "mine") return issue.assignee_ids?.includes(currentUserId ?? "") ?? false;
      if (activeFilter === "unassigned") return !issue.assignee_ids?.length;
      if (activeFilter === "starred") return starredIds.has(id);
      return true;
    });
  }, [
    activeFilter,
    assigneeFilter,
    currentUserId,
    getLabelById,
    getProjectById,
    getProjectIdentifierById,
    getStateById,
    issueIds,
    issueMap,
    labelFilter,
    memberStore,
    priorityFilter,
    searchText,
    starredIds,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredIds.length / PAGE_SIZE));
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleIssueIds = filteredIds.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const showingStart = filteredIds.length > 0 ? pageStartIndex + 1 : 0;
  const showingEnd = Math.min(pageStartIndex + visibleIssueIds.length, filteredIds.length);
  const allVisibleSelected = visibleIssueIds.length > 0 && visibleIssueIds.every((issueId) => selectedIds.has(issueId));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, assigneeFilter, labelFilter, priorityFilter, searchText, statusFilter]);

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
    setStatusFilter(null);
    setPriorityFilter(null);
    setAssigneeFilter(null);
    setLabelFilter(null);
    setActiveToolbarMenu(null);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((page) => page + 1);
    else if (canLoadMoreIssues) loadMoreIssues();
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

  return (
    <div className="flyers-soft-all-issues-view-body h-full overflow-hidden bg-canvas text-primary">
      <div ref={portalRef} className="spreadsheet-menu-portal" />

      <main ref={containerRef} className="h-full min-h-0 overflow-y-auto px-6 py-7">
        <section className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-[30px] font-semibold tracking-tight text-primary">Tickets</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCreateIssueModal(true)}
              className="flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-accent-strong bg-accent-primary px-3.5 text-13 font-medium text-on-color transition hover:bg-accent-primary/80"
            >
              <Plus className="size-4" strokeWidth={2} />
              Create Ticket
            </button>
            <DisplayMenu
              displayFilters={issueFilters?.displayFilters}
              displayProperties={issueFilters?.displayProperties ?? {}}
              onDisplayFiltersUpdate={handleDisplayFiltersUpdate}
              onDisplayPropertiesUpdate={handleDisplayPropertiesUpdate}
            />
            {workspaceSlugString && (
              <Link
                href={`/${workspaceSlugString}/analytics/overview/`}
                className="flex h-10 items-center gap-2 rounded-lg border border-strong bg-surface-1 px-4 text-13 font-medium text-secondary transition hover:bg-canvas"
              >
                <BarChart3 className="size-4" strokeWidth={2} />
                Analytics
              </Link>
            )}
          </div>
        </section>

        <section className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flyers-soft-all-issues-search flex h-10 w-full max-w-[520px] items-center gap-3 rounded-lg border border-strong bg-surface-1 px-3 focus-within:border-strong">
            <Search className="size-4 flex-shrink-0 text-secondary" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search tickets, projects, teams..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-13 text-primary outline-none placeholder:text-tertiary"
            />
            <span className="rounded-md bg-surface-3 px-2 py-0.5 text-11 font-medium text-tertiary">Ctrl K</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ToolbarFilterDropdown
              active={!!labelFilter}
              icon={Filter}
              isOpen={activeToolbarMenu === "label"}
              label={selectedLabel?.name ?? "Label"}
              onClose={() => setActiveToolbarMenu(null)}
              onOpen={() => setActiveToolbarMenu("label")}
            >
              <ToolbarMenuOption
                label="Any label"
                selected={!labelFilter}
                onClick={() => {
                  setLabelFilter(null);
                  setActiveToolbarMenu(null);
                }}
              />
              {labelOptions.length ? (
                labelOptions.map((label) => (
                  <ToolbarMenuOption
                    key={label.id}
                    label={label.name}
                    selected={labelFilter === label.id}
                    onClick={() => {
                      setLabelFilter(label.id);
                      setActiveToolbarMenu(null);
                    }}
                  />
                ))
              ) : (
                <span className="block px-3 py-2 text-13 text-tertiary">No labels found</span>
              )}
            </ToolbarFilterDropdown>

            <ToolbarFilterDropdown
              active={!!statusFilter}
              isOpen={activeToolbarMenu === "status"}
              label={selectedStatus?.name ?? "Status"}
              onClose={() => setActiveToolbarMenu(null)}
              onOpen={() => setActiveToolbarMenu("status")}
            >
              <ToolbarMenuOption
                label="Any status"
                selected={!statusFilter}
                onClick={() => {
                  setStatusFilter(null);
                  setActiveToolbarMenu(null);
                }}
              />
              {statusOptions.map((state) => (
                <ToolbarMenuOption
                  key={state.id}
                  label={state.name}
                  selected={statusFilter === state.id}
                  onClick={() => {
                    setStatusFilter(state.id);
                    setActiveToolbarMenu(null);
                  }}
                />
              ))}
            </ToolbarFilterDropdown>

            <ToolbarFilterDropdown
              active={!!priorityFilter}
              isOpen={activeToolbarMenu === "priority"}
              label={priorityFilter ? getPriorityLabel(priorityFilter) : "Priority"}
              onClose={() => setActiveToolbarMenu(null)}
              onOpen={() => setActiveToolbarMenu("priority")}
            >
              <ToolbarMenuOption
                label="Any priority"
                selected={!priorityFilter}
                onClick={() => {
                  setPriorityFilter(null);
                  setActiveToolbarMenu(null);
                }}
              />
              {PRIORITY_ORDER.map((priority) => (
                <ToolbarMenuOption
                  key={priority}
                  label={getPriorityLabel(priority)}
                  selected={priorityFilter === priority}
                  onClick={() => {
                    setPriorityFilter(priority);
                    setActiveToolbarMenu(null);
                  }}
                />
              ))}
            </ToolbarFilterDropdown>

            <ToolbarFilterDropdown
              active={!!assigneeFilter}
              isOpen={activeToolbarMenu === "assignee"}
              label={selectedAssigneeLabel ?? "Assignee"}
              onClose={() => setActiveToolbarMenu(null)}
              onOpen={() => {
                if (!memberStore.workspace.workspaceMemberIds && workspaceSlugString) {
                  void memberStore.workspace.fetchWorkspaceMembers(workspaceSlugString);
                }
                setActiveToolbarMenu("assignee");
              }}
            >
              <ToolbarMenuOption
                label="Any assignee"
                selected={!assigneeFilter}
                onClick={() => {
                  setAssigneeFilter(null);
                  setActiveToolbarMenu(null);
                }}
              />
              <ToolbarMenuOption
                label="Unassigned"
                selected={assigneeFilter === UNASSIGNED_FILTER_VALUE}
                onClick={() => {
                  setAssigneeFilter(UNASSIGNED_FILTER_VALUE);
                  setActiveToolbarMenu(null);
                }}
              />
              {assigneeOptions.map((assignee) => (
                <ToolbarMenuOption
                  key={assignee.id}
                  label={assignee.display_name}
                  selected={assigneeFilter === assignee.id}
                  onClick={() => {
                    setAssigneeFilter(assignee.id);
                    setActiveToolbarMenu(null);
                  }}
                />
              ))}
            </ToolbarFilterDropdown>

            <button
              type="button"
              onClick={clearFilters}
              className="h-10 px-2 text-13 font-medium text-secondary transition hover:text-primary"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="mt-6 flex items-center gap-2">
          <FilterPill label="All Tickets" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
          <FilterPill label="My Tickets" active={activeFilter === "mine"} onClick={() => setActiveFilter("mine")} />
          <FilterPill
            label="Unassigned"
            active={activeFilter === "unassigned"}
            onClick={() => setActiveFilter("unassigned")}
          />
          <FilterPill label="Starred" active={activeFilter === "starred"} onClick={() => setActiveFilter("starred")} />
        </section>

        <section className="flyers-soft-all-issues-table-card mt-5 overflow-visible rounded-[10px] border border-strong bg-surface-1">
          <div className="overflow-x-auto">
            <div className="min-w-[1080px]">
              <TicketTableHeader allSelected={allVisibleSelected} onToggleSelectAll={toggleSelectVisible} />

              {visibleIssueIds.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-13 text-tertiary">
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
                    updateIssue={props.updateIssue}
                    activeInlineMenu={activeInlineMenu}
                    onOpenInlineMenu={(field) => setActiveInlineMenu({ issueId: id, field })}
                    onCloseInlineMenu={() => setActiveInlineMenu(null)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flyers-soft-all-issues-table-footer flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-t border-strong px-4 text-13 text-secondary">
            <span>
              Showing {showingStart} to {showingEnd} of {filteredIds.length} tickets
            </span>
            <div className="flex items-center gap-2">
              <PaginationButton
                icon={ChevronLeft}
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              />
              {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((page) => (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "grid size-8 place-items-center rounded-lg border text-13 font-semibold transition",
                    currentPage === page
                      ? "border-strong bg-layer-1-active text-primary"
                      : "border-strong bg-surface-1 text-secondary hover:bg-canvas"
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
                className="ml-4 flex h-8 items-center gap-2 rounded-lg border border-strong bg-surface-1 px-3 text-13 font-medium text-secondary"
              >
                {PAGE_SIZE} / page
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>

          {canLoadMoreIssues && (
            <div ref={setSentinelEl} className="space-y-2 px-4 pb-4">
              {SKELETON_ROW_KEYS.map((key) => (
                <div key={key} className="h-[44px] animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          )}
        </section>
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
        <span className="flex h-10 items-center gap-2 rounded-lg border border-strong bg-surface-1 px-4 text-13 font-medium text-secondary transition hover:bg-canvas">
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

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flyers-soft-all-issues-filter-pill h-9 rounded-lg px-3.5 text-13 font-medium transition",
        active ? "bg-layer-1-active text-primary" : "bg-transparent text-secondary hover:bg-canvas"
      )}
      data-active={active ? "true" : undefined}
    >
      {label}
    </button>
  );
}

function ToolbarFilterDropdown({
  active,
  children,
  icon: Icon,
  isOpen,
  label,
  onClose,
  onOpen,
}: {
  active: boolean;
  children: ReactNode;
  icon?: typeof Filter;
  isOpen: boolean;
  label: string;
  onClose: () => void;
  onOpen: () => void;
}) {
  return (
    <InlineDropdownMenu
      disabled={false}
      isOpen={isOpen}
      menuWidth={210}
      onClose={onClose}
      onOpen={onOpen}
      trigger={
        <span
          className={cn(
            "flyers-soft-all-issues-filter-button flex h-10 min-w-24 items-center justify-center gap-2 rounded-lg border border-strong bg-surface-1 px-3 text-13 font-medium text-secondary transition hover:bg-canvas",
            active && "bg-layer-1-active text-primary"
          )}
          data-active={active ? "true" : undefined}
        >
          {Icon && <Icon className="size-4" strokeWidth={2} />}
          <span className="max-w-[112px] truncate">{label}</span>
          {!Icon && <ChevronDown className="size-4 text-tertiary" />}
        </span>
      }
    >
      {children}
    </InlineDropdownMenu>
  );
}

function ToolbarMenuOption({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      className="flyers-soft-inline-menu-option"
      data-selected={selected ? "true" : undefined}
      onClick={onClick}
    >
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {selected && <CheckCircle2 className="size-3.5 flex-shrink-0 text-tertiary" strokeWidth={2.4} />}
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
      className="flyers-soft-all-issues-table-header sticky top-0 z-[2] grid h-[52px] items-center border-b border-strong px-4 text-13 font-medium text-secondary"
      style={{ gridTemplateColumns: COL_TEMPLATE }}
    >
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          className="size-4 rounded border-strong accent-[#111827]"
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
        <SlidersHorizontal className="size-4 text-tertiary" />
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
  updateIssue: ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>) | undefined;
  activeInlineMenu: InlineMenuState;
  onOpenInlineMenu: (field: InlineMenuField) => void;
  onCloseInlineMenu: () => void;
}

const TicketTableRow = observer(function TicketTableRow(props: TicketTableRowProps) {
  const {
    canEditProperties,
    issueId,
    isSelected,
    isStarred,
    onToggleSelect,
    onToggleStar,
    portalRef,
    quickActions,
    updateIssue,
    activeInlineMenu,
    onOpenInlineMenu,
    onCloseInlineMenu,
  } = props;

  const rowRef = useRef<HTMLDivElement | null>(null);
  const { workspaceSlug } = useParams();
  const { getProjectIdentifierById } = useProject();
  const { fetchProjectStates, getProjectStateIds, getStateById } = useProjectState();
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
  const canInlineEdit = !!updateIssue && !disableUserActions && !!issueDetail.project_id;
  const isPeeked = getIsIssuePeeked(issueDetail.id) && peekIssue?.nestingLevel === 0;
  const firstAssigneeId = issueDetail.assignee_ids?.[0];
  const assignee = firstAssigneeId ? memberStore.getUserDetails(firstAssigneeId) : undefined;
  const updatedLabel = issueDetail.updated_at ? calculateTimeAgoShort(issueDetail.updated_at) : "-";
  const priorityTone = getPriorityTone(issueDetail.priority);
  const PriorityToneIcon = priorityTone.icon;
  const projectStateIds = getProjectStateIds(issueDetail.project_id ?? undefined);
  const projectStates = (projectStateIds ?? [])
    .map((stateId) => getStateById(stateId))
    .filter((state): state is IState => !!state)
    .sort((a, b) => getStateOrderIndex(a) - getStateOrderIndex(b) || a.order - b.order || a.sequence - b.sequence);

  const workItemLink = generateWorkItemLink({
    workspaceSlug: workspaceSlug?.toString(),
    projectId: issueDetail.project_id,
    issueId,
    projectIdentifier,
    sequenceId: issueDetail.sequence_id,
    isEpic: false,
  });

  const handlePeekOverview = () => handleRedirection(workspaceSlug?.toString(), issueDetail, isMobile, 0);

  const handleInlineUpdate = (data: Partial<TIssue>) => {
    if (!canInlineEdit || !issueDetail.project_id || !updateIssue) return;
    void updateIssue(issueDetail.project_id, issueDetail.id, data);
  };

  const handleStatusMenuOpen = () => {
    if (!projectStates.length && workspaceSlug && issueDetail.project_id) {
      void fetchProjectStates(workspaceSlug.toString(), issueDetail.project_id);
    }
    onOpenInlineMenu("status");
  };

  const handleAssigneeMenuOpen = () => {
    if (!memberStore.workspace.workspaceMemberIds && workspaceSlug) {
      void memberStore.workspace.fetchWorkspaceMembers(workspaceSlug.toString());
    }
    onOpenInlineMenu("assignee");
  };

  const customActionButton = (
    <span className="grid size-7 place-items-center rounded-lg text-tertiary transition hover:bg-surface-3 hover:text-primary">
      <MoreHorizontal className="size-4" />
    </span>
  );

  return (
    <div
      ref={rowRef}
      aria-selected={isSelected || isPeeked ? "true" : undefined}
      data-active={isPeeked ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
      className={cn(
        "flyers-soft-all-issues-ticket-row grid h-[52px] items-center border-b border-strong px-4 text-13 text-primary transition last:border-b-0 hover:bg-canvas",
        (isSelected || isPeeked) && "flyers-soft-all-issues-ticket-row-active !bg-canvas !text-primary"
      )}
      style={{ gridTemplateColumns: COL_TEMPLATE }}
    >
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="size-4 rounded border-strong accent-[#111827]"
        />
      </div>

      <button
        type="button"
        className={cn("grid size-8 place-items-center rounded-lg text-tertiary hover:text-secondary", {
          "text-secondary": isStarred,
        })}
        onClick={onToggleStar}
        aria-label={isStarred ? "Unstar ticket" : "Star ticket"}
      >
        <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
      </button>

      <Link href={workItemLink} className="font-semibold text-secondary hover:text-primary hover:underline">
        {ticketKey}
      </Link>

      <button
        type="button"
        className="flyers-soft-ticket-title-cell min-w-0 text-left text-13 leading-5 font-medium text-primary hover:text-secondary"
        onClick={handlePeekOverview}
      >
        {issueDetail.name}
      </button>

      <InlineStatusEditor
        isOpen={activeInlineMenu?.issueId === issueId && activeInlineMenu.field === "status"}
        disabled={!canInlineEdit}
        selectedStateId={issueDetail.state_id}
        states={projectStates}
        state={state}
        onOpen={handleStatusMenuOpen}
        onClose={onCloseInlineMenu}
        onChange={(stateId) => {
          handleInlineUpdate({ state_id: stateId });
          onCloseInlineMenu();
        }}
      />

      <InlinePriorityEditor
        isOpen={activeInlineMenu?.issueId === issueId && activeInlineMenu.field === "priority"}
        disabled={!canInlineEdit}
        selectedPriority={issueDetail.priority}
        priorityTone={priorityTone}
        PriorityToneIcon={PriorityToneIcon}
        onOpen={() => onOpenInlineMenu("priority")}
        onClose={onCloseInlineMenu}
        onChange={(priority) => {
          handleInlineUpdate({ priority });
          onCloseInlineMenu();
        }}
      />

      <InlineAssigneeEditor
        isOpen={activeInlineMenu?.issueId === issueId && activeInlineMenu.field === "assignee"}
        assignee={assignee}
        disabled={!canInlineEdit}
        getUserDetails={memberStore.getUserDetails}
        selectedAssigneeId={issueDetail.assignee_ids?.[0]}
        memberIds={memberStore.workspace.workspaceMemberIds ?? undefined}
        onOpen={handleAssigneeMenuOpen}
        onClose={onCloseInlineMenu}
        onChange={(assigneeIds) => {
          handleInlineUpdate({ assignee_ids: assigneeIds });
          onCloseInlineMenu();
        }}
      />

      <span className="text-tertiary">{updatedLabel}</span>

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
      className="grid size-8 place-items-center rounded-lg border border-strong bg-surface-1 text-secondary transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="size-4" />
    </button>
  );
}
