/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { CSSProperties, FC, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  FolderKanban,
  FolderOpen,
  ListChecks,
  MoreVertical,
  Plus,
  RefreshCw,
  Ticket,
  Users,
} from "lucide-react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type {
  TActivityEntityData,
  THomeWidgetKeys,
  THomeWidgetProps,
  TIssueEntityData,
  TIssuesResponse,
  TStateGroups,
  IUser,
} from "@plane/types";
import { cn, copyTextToClipboard, generateWorkItemLink } from "@plane/utils";
import { CustomMenu } from "@plane/ui";
// components
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useAppRouter } from "@/hooks/use-app-router";
// services
import { WorkspaceService } from "@/services/workspace.service";

export const HOME_WIDGETS_LIST: {
  [key in THomeWidgetKeys]: {
    component: FC<THomeWidgetProps> | null;
    fullWidth: boolean;
    title: string;
  };
} = {
  quick_links: {
    component: null,
    fullWidth: false,
    title: "home.quick_links.title_plural",
  },
  recents: {
    component: null,
    fullWidth: false,
    title: "home.recents.title",
  },
  my_stickies: {
    component: null,
    fullWidth: false,
    title: "stickies.title",
  },
  new_at_plane: {
    component: null,
    fullWidth: false,
    title: "home.new_at_plane.title",
  },
  quick_tutorial: {
    component: null,
    fullWidth: false,
    title: "home.quick_tutorial.title",
  },
};

type TDashboardWidgetsProps = {
  currentUser?: IUser;
};

type TStatCard = {
  label: string;
  value: number | undefined;
  caption: string;
  icon: LucideIcon;
  accent: "slate" | "blue" | "neutral" | "green";
  actionLabel?: string;
  isLoading?: boolean;
  onRefresh: () => Promise<unknown> | unknown;
  onOpen: () => void;
  unitLabel?: string;
};

const workspaceService = new WorkspaceService();

const DASHBOARD_SKELETON_ROW_KEYS = ["row-a", "row-b", "row-c", "row-d", "row-e"];
const DASHBOARD_COUNT_PARAMS = {
  cursor: "1:0:0",
  per_page: "1",
};

const getIssueResponseCount = (response: TIssuesResponse | undefined) =>
  response?.total_results ?? response?.total_count ?? response?.count ?? 0;

const fetchWorkspaceIssueCount = async (
  workspaceSlug: string,
  params: Partial<{ state_group: TStateGroups; state_id__in: string }> = {}
) => {
  const response = await workspaceService.getViewIssues(workspaceSlug, {
    ...DASHBOARD_COUNT_PARAMS,
    ...params,
  });

  return getIssueResponseCount(response);
};

const isReviewStateName = (stateName: string | undefined) => /\breview\b/i.test(stateName ?? "");

const getTicketsViewHref = (workspaceSlug: string, params: Record<string, string | undefined> = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const queryString = searchParams.toString();

  return `/${workspaceSlug}/workspace-views/all-issues/${queryString ? `?${queryString}` : ""}`;
};

const formatDashboardDate = (date: string | undefined) => {
  if (!date) return "Unknown";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

function StatCard({
  actionLabel = "Open",
  accent,
  caption,
  icon: Icon,
  isLoading,
  label,
  onOpen,
  onRefresh,
  unitLabel = "tickets",
  value,
}: TStatCard) {
  const formattedValue = isLoading ? "..." : (value ?? 0).toLocaleString();
  const statSummary = `${label}: ${isLoading ? "Loading" : formattedValue} ${unitLabel}`;

  const handleCopySummary = () => {
    void copyTextToClipboard(statSummary)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Summary copied",
          message: statSummary,
        })
      )
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Could not copy summary",
          message: "Please try again.",
        })
      );
  };

  const handleRefresh = () => {
    void Promise.resolve()
      .then(onRefresh)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Stats refreshed",
          message: `${label} is up to date.`,
        })
      )
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Could not refresh stats",
          message: "Please try again.",
        })
      );
  };

  return (
    <div className={cn("flyers-soft-dashboard-stat-card", `flyers-soft-dashboard-stat-${accent}`)}>
      <div className="flyers-soft-dashboard-stat-top">
        <span className="flyers-soft-dashboard-stat-icon">
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-12 font-medium text-tertiary">{label}</span>
          <span className="text-20 font-semibold text-primary">{formattedValue}</span>
        </div>
        <CustomMenu
          customButton={<MoreVertical className="flyers-soft-dashboard-stat-menu size-4" strokeWidth={2} />}
          customButtonClassName="grid size-5 place-items-center rounded-sm hover:bg-layer-transparent-hover"
          placement="bottom-end"
          closeOnSelect
          ariaLabel={`${label} actions`}
          optionsClassName="min-w-36"
        >
          <CustomMenu.MenuItem onClick={onOpen} className="flex items-center gap-2">
            <ArrowRight className="size-3.5" strokeWidth={2} />
            <span>{actionLabel}</span>
          </CustomMenu.MenuItem>
          <CustomMenu.MenuItem onClick={handleCopySummary} className="flex items-center gap-2">
            <Copy className="size-3.5" strokeWidth={2} />
            <span>Copy summary</span>
          </CustomMenu.MenuItem>
          <CustomMenu.MenuItem onClick={handleRefresh} className="flex items-center gap-2">
            <RefreshCw className="size-3.5" strokeWidth={2} />
            <span>Refresh stats</span>
          </CustomMenu.MenuItem>
        </CustomMenu>
      </div>
      <p className="truncate text-11 text-placeholder">{caption}</p>
    </div>
  );
}

function CompactIssueRow({ activity, workspaceSlug }: { activity: TActivityEntityData; workspaceSlug: string }) {
  const { getStateById } = useProjectState();
  const { getUserDetails } = useMember();
  const { getProjectById } = useProject();
  const issue = activity.entity_data as TIssueEntityData;
  const state = getStateById(issue.state);
  const project = getProjectById(issue.project_id);
  const projectName = project?.name ?? issue.project_identifier ?? "Project";
  const assigneeIds = issue.assignees ?? [];
  const primaryAssignee = assigneeIds[0] ? getUserDetails(assigneeIds[0]) : undefined;
  const assigneeLabel = primaryAssignee?.display_name ?? (assigneeIds.length > 0 ? "Assigned" : "Unassigned");
  const extraAssigneeCount = Math.max(assigneeIds.length - 1, 0);
  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: issue.project_id,
    issueId: issue.id,
    projectIdentifier: issue.project_identifier,
    sequenceId: issue.sequence_id,
    isEpic: issue.is_epic,
  });

  return (
    <Link href={workItemLink} className="flyers-soft-dashboard-ticket-row">
      <div className="flyers-soft-dashboard-ticket-cell">
        <FileText className="flyers-soft-dashboard-ticket-file-icon size-3.5" strokeWidth={1.8} />
        <span className="flyers-soft-dashboard-ticket-key">
          {issue.project_identifier}-{issue.sequence_id}
        </span>
        <span className="flyers-soft-dashboard-ticket-title truncate">{issue.name}</span>
      </div>
      <div className="flyers-soft-dashboard-ticket-status">
        <span
          className="flyers-soft-status-dot"
          style={state?.color ? ({ "--flyers-status-color": state.color } as CSSProperties) : undefined}
        />
        <span className="truncate">{state?.name ?? "Open"}</span>
      </div>
      <span className={cn("flyers-soft-priority-pill", `flyers-soft-priority-${issue.priority || "none"}`)}>
        {issue.priority === "urgent" ? "↑ Urgent" : issue.priority || "None"}
      </span>
      <div className="flyers-soft-dashboard-ticket-assignee">
        <ButtonAvatars showTooltip userIds={assigneeIds} size="sm" />
        <span className="truncate">
          {assigneeLabel}
          {extraAssigneeCount > 0 ? ` +${extraAssigneeCount}` : ""}
        </span>
      </div>
      <div className="flyers-soft-dashboard-ticket-project">
        <FolderOpen className="size-3.5 flex-shrink-0" strokeWidth={1.8} />
        <span className="truncate">{projectName}</span>
      </div>
      <span className="flyers-soft-dashboard-ticket-date">{formatDashboardDate(activity.visited_at)}</span>
      <span className="flyers-soft-dashboard-ticket-more" aria-hidden="true">
        <MoreVertical className="size-3.5" strokeWidth={1.9} />
      </span>
    </Link>
  );
}

export const DashboardWidgets = observer(function DashboardWidgets(props: TDashboardWidgetsProps) {
  const { currentUser } = props;
  const { workspaceSlug } = useParams();
  const workspaceSlugString = workspaceSlug?.toString();
  const router = useAppRouter();
  const { toggleCreateIssueModal } = useCommandPalette();
  const { fetchProjects, joinedProjectIds } = useProject();
  const { fetchedMap, fetchWorkspaceStates, workspaceStates } = useProjectState();
  const hasLoadedWorkspaceStates = !!(workspaceSlugString && fetchedMap[workspaceSlugString]);

  useSWR(
    workspaceSlugString ? `FLYERS_HOME_PROJECTS_${workspaceSlugString}` : null,
    workspaceSlugString ? () => fetchProjects(workspaceSlugString) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  useSWR(
    workspaceSlugString && !hasLoadedWorkspaceStates ? `FLYERS_HOME_WORKSPACE_STATES_${workspaceSlugString}` : null,
    workspaceSlugString ? () => fetchWorkspaceStates(workspaceSlugString) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const {
    data: totalTicketsCount,
    isLoading: isTotalTicketsLoading,
    mutate: mutateTotalTicketsCount,
  } = useSWR<number>(
    workspaceSlugString ? `FLYERS_HOME_TICKET_COUNT_TOTAL_${workspaceSlugString}` : null,
    workspaceSlugString ? () => fetchWorkspaceIssueCount(workspaceSlugString) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const {
    data: inProgressTicketsCount,
    isLoading: isInProgressTicketsLoading,
    mutate: mutateInProgressTicketsCount,
  } = useSWR<number>(
    workspaceSlugString ? `FLYERS_HOME_TICKET_COUNT_STARTED_${workspaceSlugString}` : null,
    workspaceSlugString ? () => fetchWorkspaceIssueCount(workspaceSlugString, { state_group: "started" }) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const {
    data: doneTicketsCount,
    isLoading: isDoneTicketsLoading,
    mutate: mutateDoneTicketsCount,
  } = useSWR<number>(
    workspaceSlugString ? `FLYERS_HOME_TICKET_COUNT_COMPLETED_${workspaceSlugString}` : null,
    workspaceSlugString ? () => fetchWorkspaceIssueCount(workspaceSlugString, { state_group: "completed" }) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: recentTickets, isLoading: isRecentTicketsLoading } = useSWR(
    workspaceSlugString ? `FLYERS_HOME_RECENT_TICKETS_${workspaceSlugString}` : null,
    workspaceSlugString ? () => workspaceService.fetchWorkspaceRecents(workspaceSlugString, "issue") : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const reviewStateIds = (workspaceStates ?? [])
    .filter((state) => isReviewStateName(state.name))
    .map((state) => state.id);
  const reviewStateIdsKey = reviewStateIds.join(",");
  const {
    data: reviewTicketsCount,
    isLoading: isReviewTicketsLoading,
    mutate: mutateReviewTicketsCount,
  } = useSWR<number>(
    hasLoadedWorkspaceStates && reviewStateIdsKey
      ? `FLYERS_HOME_TICKET_COUNT_REVIEW_${workspaceSlugString}_${reviewStateIdsKey}`
      : null,
    workspaceSlugString && reviewStateIdsKey
      ? () => fetchWorkspaceIssueCount(workspaceSlugString, { state_id__in: reviewStateIdsKey })
      : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  if (!workspaceSlugString) return null;

  const resolvedReviewTicketsCount = hasLoadedWorkspaceStates && !reviewStateIdsKey ? 0 : reviewTicketsCount;
  const visibleRecentTickets = (recentTickets ?? []).filter(
    (activity) => activity.entity_name === "issue" && activity.entity_data
  );
  const isReviewCountLoading =
    !hasLoadedWorkspaceStates ||
    (!!reviewStateIdsKey && (isReviewTicketsLoading || resolvedReviewTicketsCount === undefined));
  const refreshDashboardStats = async () => {
    await fetchWorkspaceStates(workspaceSlugString);
    await Promise.all([
      mutateTotalTicketsCount(),
      mutateInProgressTicketsCount(),
      mutateReviewTicketsCount(),
      mutateDoneTicketsCount(),
    ]);
  };
  const refreshProjectStats = () => fetchProjects(workspaceSlugString);

  const stats: TStatCard[] = [
    {
      label: "Total Tickets",
      value: totalTicketsCount,
      caption: "Tracked across the workspace",
      icon: Ticket,
      accent: "slate",
      isLoading: isTotalTicketsLoading || totalTicketsCount === undefined,
      onOpen: () => router.push(getTicketsViewHref(workspaceSlugString)),
      onRefresh: refreshDashboardStats,
      actionLabel: "View tickets",
    },
    {
      label: "In Progress",
      value: inProgressTicketsCount,
      caption: "Started or pending work",
      icon: Clock3,
      accent: "blue",
      isLoading: isInProgressTicketsLoading || inProgressTicketsCount === undefined,
      onOpen: () => router.push(getTicketsViewHref(workspaceSlugString, { state_group: "started" })),
      onRefresh: refreshDashboardStats,
      actionLabel: "View tickets",
    },
    {
      label: "In Review",
      value: resolvedReviewTicketsCount,
      caption: "Recent tickets in review states",
      icon: ListChecks,
      accent: "neutral",
      isLoading: isReviewCountLoading,
      onOpen: () => router.push(getTicketsViewHref(workspaceSlugString, { state_id__in: reviewStateIdsKey })),
      onRefresh: refreshDashboardStats,
      actionLabel: "View tickets",
    },
    {
      label: "Done",
      value: doneTicketsCount,
      caption: "Completed tickets",
      icon: CheckCircle2,
      accent: "green",
      isLoading: isDoneTicketsLoading || doneTicketsCount === undefined,
      onOpen: () => router.push(getTicketsViewHref(workspaceSlugString, { state_group: "completed" })),
      onRefresh: refreshDashboardStats,
      actionLabel: "View tickets",
    },
    {
      label: "Projects",
      value: joinedProjectIds.length,
      caption: "Active projects you can access",
      icon: FolderKanban,
      accent: "slate",
      onOpen: () => router.push(`/${workspaceSlugString}/projects`),
      onRefresh: refreshProjectStats,
      actionLabel: "Open projects",
      unitLabel: "projects",
    },
  ];
  const displayName = currentUser?.first_name || currentUser?.display_name || "there";
  const greeting = "Good afternoon";

  return (
    <div className="flyers-soft-dashboard-shell flyers-soft-notion-home">
      <section className="flyers-soft-dashboard-page-heading">
        <div className="min-w-0">
          <h1 className="flyers-soft-dashboard-greeting tracking-normal text-28 font-semibold text-primary">
            {greeting}, {displayName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="flyers-soft-dashboard-subtitle mt-3 max-w-2xl text-15 text-tertiary">
            Here&apos;s what&apos;s happening in your workspace today.
          </p>
        </div>
        <DashboardHomeIllustration />
      </section>

      <section className="flyers-soft-dashboard-section">
        <SectionHeader title="Quick actions" />
        <div className="flyers-soft-dashboard-actions-grid">
          <button
            type="button"
            className="flyers-soft-dashboard-action-row"
            onClick={() => toggleCreateIssueModal(true)}
          >
            <Plus className="size-4" strokeWidth={2} />
            <span>Create Ticket</span>
          </button>
          <Link
            href={`/${workspaceSlugString}/workspace-views/all-issues/`}
            className="flyers-soft-dashboard-action-row"
          >
            <Ticket className="size-4" strokeWidth={2} />
            <span>View tickets</span>
          </Link>
          <Link href={`/${workspaceSlugString}/projects`} className="flyers-soft-dashboard-action-row">
            <FolderKanban className="size-4" strokeWidth={2} />
            <span>Projects</span>
          </Link>
          <Link href={`/${workspaceSlugString}/settings/members`} className="flyers-soft-dashboard-action-row">
            <Users className="size-4" strokeWidth={2} />
            <span>Invite members</span>
          </Link>
        </div>
      </section>

      <section className="flyers-soft-dashboard-section">
        <SectionHeader
          title="Overview"
          action={
            <CustomMenu
              customButton={<MoreVertical className="size-4" strokeWidth={2} />}
              customButtonClassName="flyers-soft-dashboard-section-menu"
              placement="bottom-end"
              closeOnSelect
              ariaLabel="Overview actions"
              optionsClassName="min-w-36"
            >
              <CustomMenu.MenuItem onClick={refreshDashboardStats} className="flex items-center gap-2">
                <RefreshCw className="size-3.5" strokeWidth={2} />
                <span>Refresh stats</span>
              </CustomMenu.MenuItem>
              <CustomMenu.MenuItem
                onClick={() => router.push(getTicketsViewHref(workspaceSlugString))}
                className="flex items-center gap-2"
              >
                <ArrowRight className="size-3.5" strokeWidth={2} />
                <span>View tickets</span>
              </CustomMenu.MenuItem>
            </CustomMenu>
          }
        />
        <div className="flyers-soft-dashboard-stats-grid">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="flyers-soft-dashboard-section flyers-soft-dashboard-panel flyers-soft-dashboard-recent-panel">
        <div className="flyers-soft-dashboard-panel-header">
          <SectionHeader title="Recent tickets" />
          <Link href={`/${workspaceSlugString}/workspace-views/all-issues/`} className="flyers-soft-dashboard-view-all">
            View all
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </Link>
        </div>
        <div className="flyers-soft-dashboard-ticket-table mt-3">
          <div className="flyers-soft-dashboard-ticket-header" aria-hidden="true">
            <span>Ticket</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Assignee</span>
            <span>Project</span>
            <span>Updated</span>
            <span />
          </div>
          {isRecentTicketsLoading ? (
            <DashboardSkeletonRows />
          ) : visibleRecentTickets.length > 0 ? (
            visibleRecentTickets
              .slice(0, 6)
              .map((activity) => (
                <CompactIssueRow
                  key={activity.id}
                  activity={activity as TActivityEntityData}
                  workspaceSlug={workspaceSlugString}
                />
              ))
          ) : (
            <EmptyTicketsPanel onCreate={() => toggleCreateIssueModal(true)} />
          )}
        </div>
      </section>
    </div>
  );
});

function SectionHeader({ action, icon: Icon, title }: { action?: ReactNode; icon?: LucideIcon; title: string }) {
  return (
    <div className="flyers-soft-dashboard-section-title">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="size-4" strokeWidth={2} />}
        <h2 className="text-14 font-semibold text-primary">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function DashboardHomeIllustration() {
  return (
    <div className="flyers-soft-dashboard-illustration" aria-hidden="true">
      <div className="flyers-soft-dashboard-illustration-window" />
      <div className="flyers-soft-dashboard-illustration-person">
        <span />
        <span />
        <span />
      </div>
      <div className="flyers-soft-dashboard-illustration-laptop" />
      <div className="flyers-soft-dashboard-illustration-plant">
        <span />
        <span />
      </div>
    </div>
  );
}

function DashboardSkeletonRows({ compact = false }: { compact?: boolean }) {
  return (
    <>
      {DASHBOARD_SKELETON_ROW_KEYS.slice(0, compact ? 4 : 5).map((key) => (
        <div key={key} className="flyers-soft-dashboard-skeleton-row">
          <div className="h-7 w-16 rounded bg-layer-2" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-layer-2" />
            <div className="h-2.5 w-1/3 rounded bg-layer-2" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyTicketsPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flyers-soft-dashboard-empty flyers-soft-dashboard-empty-tickets">
      <div className="flyers-soft-dashboard-empty-folder" aria-hidden="true">
        <FolderOpen className="size-14" strokeWidth={1.5} />
      </div>
      <div>
        <div className="text-14 font-semibold text-primary">No tickets yet</div>
        <div className="mt-1 text-12 text-placeholder">Create your first ticket to get started.</div>
      </div>
      <Button variant="primary" size="sm" onClick={onCreate} prependIcon={<Plus />}>
        Create Ticket
      </Button>
    </div>
  );
}
