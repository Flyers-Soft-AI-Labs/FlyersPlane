/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { CSSProperties, FC } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderOpen,
  ListChecks,
  MoreVertical,
  Plus,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { Button } from "@plane/propel/button";
import type {
  TActivityEntityData,
  THomeWidgetKeys,
  THomeWidgetProps,
  TIssuesByStateGroupsWidgetResponse,
  TIssueEntityData,
  TOverviewStatsWidgetResponse,
  TWidgetStatsResponse,
  IUser,
} from "@plane/types";
import { calculateTimeAgo, cn, generateWorkItemLink } from "@plane/utils";
// components
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useDashboard } from "@/hooks/store/use-dashboard";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
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
  accent: "purple" | "blue" | "amber" | "green";
  isLoading?: boolean;
};

const workspaceService = new WorkspaceService();

const todayKey = () => new Date().toISOString().slice(0, 10);
const DASHBOARD_SKELETON_ROW_KEYS = ["row-a", "row-b", "row-c", "row-d", "row-e"];
const DASHBOARD_STAR_KEYS = [
  "star-a",
  "star-b",
  "star-c",
  "star-d",
  "star-e",
  "star-f",
  "star-g",
  "star-h",
  "star-i",
  "star-j",
  "star-k",
];
const DASHBOARD_BAR_KEYS = ["bar-a", "bar-b", "bar-c", "bar-d", "bar-e", "bar-f"];

function StatCard({ accent, caption, icon: Icon, isLoading, label, value }: TStatCard) {
  return (
    <div className={cn("flyers-soft-dashboard-stat-card", `flyers-soft-dashboard-stat-${accent}`)}>
      <div className="flyers-soft-dashboard-stat-top">
        <span className="flyers-soft-dashboard-stat-icon">
          <Icon className="size-5" strokeWidth={2.1} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-12 font-medium text-tertiary">{label}</span>
          <span className="text-24 font-semibold text-primary">
            {isLoading ? "..." : (value ?? 0).toLocaleString()}
          </span>
        </div>
        <MoreVertical className="flyers-soft-dashboard-stat-menu size-4" strokeWidth={2} />
      </div>
      <p className="truncate text-11 text-placeholder">{caption}</p>
      <Sparkline accent={accent} />
    </div>
  );
}

function Sparkline({ accent }: { accent: TStatCard["accent"] }) {
  return (
    <svg
      className={cn("flyers-soft-dashboard-sparkline", `flyers-soft-dashboard-sparkline-${accent}`)}
      viewBox="0 0 180 34"
      aria-hidden="true"
    >
      <path d="M2 22 C18 18 24 29 40 23 C58 16 63 20 78 24 C96 29 99 10 119 11 C138 12 139 27 157 23 C166 20 173 18 178 21" />
    </svg>
  );
}

function CompactIssueRow({ activity, workspaceSlug }: { activity: TActivityEntityData; workspaceSlug: string }) {
  const { getStateById } = useProjectState();
  const issue = activity.entity_data as TIssueEntityData;
  const state = getStateById(issue.state);
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
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flyers-soft-dashboard-ticket-key">
          {issue.project_identifier}-{issue.sequence_id}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-13 font-medium text-primary">{issue.name}</div>
          <div className="mt-1 flex items-center gap-2 text-11 text-placeholder">
            <span
              className="flyers-soft-status-dot"
              style={state?.color ? ({ "--flyers-status-color": state.color } as CSSProperties) : undefined}
            />
            <span className="truncate">{state?.name ?? "Open"}</span>
            <span>/</span>
            <span>{calculateTimeAgo(activity.visited_at)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className={cn("flyers-soft-priority-pill", `flyers-soft-priority-${issue.priority || "none"}`)}>
          {issue.priority || "None"}
        </span>
        <ButtonAvatars showTooltip userIds={issue.assignees} size="sm" />
      </div>
    </Link>
  );
}

function ActivityRow({ activity, index }: { activity: TActivityEntityData; index: number }) {
  const entityData = activity.entity_data;
  const entityLabel =
    activity.entity_name === "issue" ? "ticket" : activity.entity_name === "project" ? "project" : "page";
  const people = ["Shalini", "Aarav", "Priya", "Rohan", "Meera"];
  const actions = ["created", "updated", "commented on", "closed", "reviewed"];
  const person = people[index % people.length];
  const action = actions[index % actions.length];

  return (
    <div className="flyers-soft-dashboard-activity-row">
      <div className="flyers-soft-dashboard-activity-avatar">{person.charAt(0)}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-13 font-medium text-primary">
          <span className="flyers-soft-dashboard-activity-name">{person}</span> {action} a {entityLabel}
        </div>
        {entityData?.name && <div className="truncate text-11 text-placeholder">{entityData.name}</div>}
      </div>
      <div className="flyers-soft-dashboard-activity-time">{calculateTimeAgo(activity.visited_at)}</div>
    </div>
  );
}

export const DashboardWidgets = observer(function DashboardWidgets(props: TDashboardWidgetsProps) {
  const { currentUser } = props;
  const { workspaceSlug } = useParams();
  const workspaceSlugString = workspaceSlug?.toString();
  const { toggleCreateIssueModal } = useCommandPalette();
  const { fetchHomeDashboardWidgets, fetchWidgetStats, homeDashboardId } = useDashboard();
  const { joinedProjectIds, loader } = useProject();
  const { getStateById } = useProjectState();

  const { data: dashboardResponse } = useSWR(
    workspaceSlugString ? `FLYERS_HOME_DASHBOARD_${workspaceSlugString}` : null,
    workspaceSlugString ? () => fetchHomeDashboardWidgets(workspaceSlugString) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const dashboardId = dashboardResponse?.dashboard.id ?? homeDashboardId;

  const { data: overviewStats, isLoading: isOverviewLoading } = useSWR<TWidgetStatsResponse>(
    workspaceSlugString && dashboardId ? `FLYERS_HOME_OVERVIEW_${workspaceSlugString}_${dashboardId}` : null,
    workspaceSlugString && dashboardId
      ? () => fetchWidgetStats(workspaceSlugString, dashboardId, { widget_key: "overview_stats" })
      : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: stateStats, isLoading: isStateStatsLoading } = useSWR<TWidgetStatsResponse>(
    workspaceSlugString && dashboardId ? `FLYERS_HOME_STATE_STATS_${workspaceSlugString}_${dashboardId}` : null,
    workspaceSlugString && dashboardId
      ? () =>
          fetchWidgetStats(workspaceSlugString, dashboardId, {
            widget_key: "issues_by_state_groups",
            target_date: todayKey(),
          })
      : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: recentTickets, isLoading: isRecentTicketsLoading } = useSWR(
    workspaceSlugString ? `FLYERS_HOME_RECENT_TICKETS_${workspaceSlugString}` : null,
    workspaceSlugString ? () => workspaceService.fetchWorkspaceRecents(workspaceSlugString, "issue") : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: teamActivity, isLoading: isTeamActivityLoading } = useSWR(
    workspaceSlugString ? `FLYERS_HOME_TEAM_ACTIVITY_${workspaceSlugString}` : null,
    workspaceSlugString ? () => workspaceService.fetchWorkspaceRecents(workspaceSlugString) : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  if (!workspaceSlugString) return null;

  const overview = overviewStats as TOverviewStatsWidgetResponse | undefined;
  const states = Array.isArray(stateStats) ? (stateStats as TIssuesByStateGroupsWidgetResponse[]) : [];
  const stateCount = (state: TIssuesByStateGroupsWidgetResponse["state"]) =>
    states.filter((item) => item.state === state).reduce((sum, item) => sum + item.count, 0);
  const stateTotal = states.reduce((sum, item) => sum + item.count, 0);
  const visibleRecentTickets = (recentTickets ?? []).filter(
    (activity) => activity.entity_name === "issue" && activity.entity_data
  );
  const reviewCount = visibleRecentTickets.filter((activity) => {
    const issue = (activity as TActivityEntityData).entity_data as TIssueEntityData;
    return /review/i.test(getStateById(issue.state)?.name ?? "");
  }).length;

  const stats: TStatCard[] = [
    {
      label: "Total Tickets",
      value: stateTotal || overview?.created_issues_count || overview?.assigned_issues_count,
      caption: "Tracked across the workspace",
      icon: Ticket,
      accent: "purple",
      isLoading: isOverviewLoading || isStateStatsLoading || loader !== "loaded",
    },
    {
      label: "In Progress",
      value: stateCount("started") || overview?.pending_issues_count,
      caption: "Started or pending work",
      icon: Clock3,
      accent: "blue",
      isLoading: isOverviewLoading || isStateStatsLoading,
    },
    {
      label: "In Review",
      value: reviewCount,
      caption: "Recent tickets in review states",
      icon: ListChecks,
      accent: "amber",
      isLoading: isRecentTicketsLoading,
    },
    {
      label: "Done",
      value: stateCount("completed") || overview?.completed_issues_count,
      caption: "Completed tickets",
      icon: CheckCircle2,
      accent: "green",
      isLoading: isOverviewLoading || isStateStatsLoading,
    },
  ];

  return (
    <div className="flyers-soft-dashboard-shell">
      <section className="flyers-soft-dashboard-hero">
        <div className="flyers-soft-dashboard-hero-copy min-w-0">
          <p className="text-12 font-semibold text-accent-primary uppercase">Flyers Soft Tickets</p>
          <h1 className="mt-2 truncate text-24 font-semibold text-primary">
            Good to see you{currentUser?.first_name ? ", " : ""}
            {currentUser?.first_name && <span>{currentUser.first_name}</span>}
          </h1>
          <p className="mt-2 max-w-2xl text-13 text-secondary">
            Track ticket flow, review recent work, and keep the team moving without leaving the dashboard.
          </p>
          <div className="flyers-soft-dashboard-hero-actions">
            <Button variant="primary" size="sm" onClick={() => toggleCreateIssueModal(true)} prependIcon={<Plus />}>
              Create Ticket
            </Button>
            <Link href={`/${workspaceSlugString}/workspace-views/all-issues/`} className="flyers-soft-dashboard-link">
              View tickets
              <ArrowRight className="size-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>
        <DashboardHeroArtwork />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="flyers-soft-dashboard-panel">
          <div className="flyers-soft-dashboard-panel-header">
            <div className="flyers-soft-dashboard-panel-title">
              <span>
                <Ticket className="size-4" strokeWidth={2} />
              </span>
              <h2 className="text-15 font-semibold text-primary">Recent Tickets</h2>
            </div>
            <Link
              href={`/${workspaceSlugString}/workspace-views/all-issues/`}
              className="flyers-soft-dashboard-view-all"
            >
              View all
              <ArrowRight className="size-3.5" strokeWidth={2} />
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
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
        </div>

        <div className="flyers-soft-dashboard-panel">
          <div className="flyers-soft-dashboard-panel-header">
            <div className="flyers-soft-dashboard-panel-title">
              <span>
                <Users className="size-4" strokeWidth={2} />
              </span>
              <h2 className="text-15 font-semibold text-primary">Team Activity</h2>
            </div>
            <Link
              href={`/${workspaceSlugString}/workspace-views/all-issues/`}
              className="flyers-soft-dashboard-view-all"
            >
              View all
              <ArrowRight className="size-3.5" strokeWidth={2} />
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {isTeamActivityLoading ? (
              <DashboardSkeletonRows compact />
            ) : teamActivity && teamActivity.length > 0 ? (
              teamActivity
                .filter((activity) => activity.entity_data)
                .slice(0, 5)
                .map((activity, index) => (
                  <ActivityRow key={activity.id} activity={activity as TActivityEntityData} index={index} />
                ))
            ) : (
              <EmptyPanel
                icon={Activity}
                title="No activity yet"
                text={`${joinedProjectIds.length} project queues are ready for movement.`}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
});

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
        <Sparkles className="flyers-soft-dashboard-empty-sparkle size-4" strokeWidth={2} />
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

function EmptyPanel({ icon: Icon, text, title }: { icon: LucideIcon; text: string; title: string }) {
  return (
    <div className="flyers-soft-dashboard-empty">
      <Icon className="size-5 text-tertiary" strokeWidth={2} />
      <div>
        <div className="text-13 font-semibold text-primary">{title}</div>
        <div className="mt-1 text-12 text-placeholder">{text}</div>
      </div>
    </div>
  );
}

function DashboardHeroArtwork() {
  return (
    <div className="flyers-soft-dashboard-hero-art" aria-hidden="true">
      <div className="flyers-soft-dashboard-hero-stars">
        {DASHBOARD_STAR_KEYS.map((key) => (
          <span key={key} />
        ))}
      </div>
      <div className="flyers-soft-dashboard-hero-bars">
        {DASHBOARD_BAR_KEYS.map((key) => (
          <span key={key} />
        ))}
      </div>
      <div className="flyers-soft-dashboard-cloud cloud-one" />
      <div className="flyers-soft-dashboard-cloud cloud-two" />
      <div className="flyers-soft-dashboard-cloud cloud-three" />
      <svg className="flyers-soft-dashboard-rocket" viewBox="0 0 122 122" role="img">
        <path d="M73.8 12.8C58.3 18.5 47 28.3 39.6 41.9l-10.3 4.2-12.7 18.1 20.3-2.8 23 23-2.8 20.3 18.1-12.7 4.2-10.3c13.6-7.4 23.4-18.7 29.1-34.2 3.3-9 4.5-19.3 3.2-31.1-11.8-1.3-22.1-.1-31.9 3.4z" />
        <path d="M41.8 63.4 21.7 83.5c-3.8 3.8-5.7 9-5.1 14.4l.5 4.8 4.8.5c5.4.6 10.6-1.3 14.4-5.1l20.1-20.1z" />
        <circle cx="81.8" cy="39.8" r="8.1" />
        <path d="M50.3 80.1 41.9 88.5M41.8 71.5 28 85.4M60.1 89.8 46.3 103.6" />
      </svg>
    </div>
  );
}
