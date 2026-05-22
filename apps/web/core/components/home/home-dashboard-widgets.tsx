/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, FC, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  FolderKanban,
  FolderOpen,
  MoreVertical,
  Plus,
  Ticket,
  Users,
} from "lucide-react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ISSUE_PRIORITIES } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// plane imports
import { Button } from "@plane/propel/button";
import type {
  TActivityEntityData,
  THomeWidgetKeys,
  THomeWidgetProps,
  TIssue,
  TIssueEntityData,
  TIssuePriorities,
} from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { generateWorkItemLink } from "@plane/utils";
// components
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { ProjectDropdown } from "@/components/dropdowns/project/dropdown";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUser } from "@/hooks/store/user";
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

const workspaceService = new WorkspaceService();

const DASHBOARD_SKELETON_ROW_KEYS = ["row-a", "row-b", "row-c", "row-d", "row-e"];

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

const getDashboardGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
};

type TRecentTicketUpdate = (
  activity: TActivityEntityData,
  payload: Partial<TIssue>,
  entityPatch: Partial<TIssueEntityData>
) => Promise<void>;

function CompactIssueRow({
  activity,
  onIssueUpdate,
  workspaceSlug,
}: {
  activity: TActivityEntityData;
  onIssueUpdate: TRecentTicketUpdate;
  workspaceSlug: string;
}) {
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
  const priorityKey = (issue.priority || "none") as TIssuePriorities;
  const priorityOption = ISSUE_PRIORITIES.find((option) => option.key === priorityKey);
  const priorityLabel = priorityOption?.title ?? (issue.priority === "urgent" ? "Urgent" : issue.priority || "None");
  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: issue.project_id,
    issueId: issue.id,
    projectIdentifier: issue.project_identifier,
    sequenceId: issue.sequence_id,
    isEpic: issue.is_epic,
  });

  return (
    <div className="flyers-soft-dashboard-ticket-row">
      <Link href={workItemLink} className="flyers-soft-dashboard-ticket-cell flyers-soft-dashboard-ticket-link-cell">
        <FileText className="flyers-soft-dashboard-ticket-file-icon size-3.5" strokeWidth={1.8} />
        <span className="flyers-soft-dashboard-ticket-key">
          {issue.project_identifier}-{issue.sequence_id}
        </span>
        <span className="flyers-soft-dashboard-ticket-title truncate">{issue.name}</span>
      </Link>
      <div className="flyers-soft-dashboard-ticket-dropdown-cell">
        <StateDropdown
          button={
            <span className="flyers-soft-dashboard-inline-control">
              <span
                className="flyers-soft-dashboard-inline-status-dot"
                style={state?.color ? ({ "--flyers-status-color": state.color } as CSSProperties) : undefined}
              />
              <span className="flyers-soft-dashboard-inline-control-label">{state?.name ?? "Open"}</span>
              <ChevronDown className="flyers-soft-dashboard-inline-chevron size-3" strokeWidth={2} />
            </span>
          }
          buttonVariant="transparent-with-text"
          buttonContainerClassName="flyers-soft-dashboard-inline-trigger"
          className="flyers-soft-dashboard-inline-dropdown"
          dropdownStrategy="fixed"
          optionsClassName="flyers-soft-dashboard-inline-menu"
          placement="auto-start"
          projectId={issue.project_id}
          renderByDefault={false}
          showTooltip={false}
          value={issue.state}
          onChange={(stateId) => {
            if (stateId === issue.state) return;
            void onIssueUpdate(activity, { state_id: stateId }, { state: stateId });
          }}
        />
      </div>
      <div className="flyers-soft-dashboard-ticket-dropdown-cell">
        <PriorityDropdown
          button={
            <span className="flyers-soft-dashboard-inline-control flyers-soft-dashboard-priority-control">
              <span className="flyers-soft-dashboard-inline-control-label">{priorityLabel}</span>
              <ChevronDown className="flyers-soft-dashboard-inline-chevron size-3" strokeWidth={2} />
            </span>
          }
          buttonVariant="transparent-with-text"
          buttonContainerClassName="flyers-soft-dashboard-inline-trigger"
          className="flyers-soft-dashboard-inline-dropdown"
          dropdownStrategy="fixed"
          optionsClassName="flyers-soft-dashboard-inline-menu"
          placement="auto-start"
          renderByDefault={false}
          showTooltip={false}
          value={priorityKey}
          onChange={(nextPriority) => {
            if (nextPriority === issue.priority) return;
            void onIssueUpdate(activity, { priority: nextPriority }, { priority: nextPriority });
          }}
        />
      </div>
      <div className="flyers-soft-dashboard-ticket-dropdown-cell">
        <MemberDropdown
          button={
            <span className="flyers-soft-dashboard-inline-control flyers-soft-dashboard-assignee-control">
              <ButtonAvatars showTooltip userIds={assigneeIds} size="sm" />
              <span className="flyers-soft-dashboard-inline-control-label">
                {assigneeLabel}
                {extraAssigneeCount > 0 ? ` +${extraAssigneeCount}` : ""}
              </span>
              <ChevronDown className="flyers-soft-dashboard-inline-chevron size-3" strokeWidth={2} />
            </span>
          }
          buttonVariant="transparent-with-text"
          buttonContainerClassName="flyers-soft-dashboard-inline-trigger"
          className="flyers-soft-dashboard-inline-dropdown"
          dropdownStrategy="fixed"
          multiple
          optionsClassName="flyers-soft-dashboard-inline-menu"
          placement="auto-start"
          projectId={issue.project_id}
          renderByDefault={false}
          showTooltip={false}
          value={assigneeIds}
          onChange={(nextAssigneeIds) => {
            void onIssueUpdate(activity, { assignee_ids: nextAssigneeIds }, { assignees: nextAssigneeIds });
          }}
        />
      </div>
      <div className="flyers-soft-dashboard-ticket-dropdown-cell">
        <ProjectDropdown
          button={
            <span className="flyers-soft-dashboard-inline-control">
              <FolderOpen className="size-3.5 flex-shrink-0 text-secondary" strokeWidth={1.8} />
              <span className="flyers-soft-dashboard-inline-control-label">{projectName}</span>
              <ChevronDown className="flyers-soft-dashboard-inline-chevron size-3" strokeWidth={2} />
            </span>
          }
          buttonVariant="transparent-with-text"
          buttonContainerClassName="flyers-soft-dashboard-inline-trigger"
          className="flyers-soft-dashboard-inline-dropdown"
          currentProjectId={issue.project_id}
          dropdownStrategy="fixed"
          multiple={false}
          optionsClassName="flyers-soft-dashboard-inline-menu"
          placement="auto-start"
          renderByDefault={false}
          showTooltip={false}
          value={issue.project_id}
          onChange={(projectId) => {
            if (!projectId || projectId === issue.project_id) return;
            const nextProject = getProjectById(projectId);
            void onIssueUpdate(
              activity,
              { project_id: projectId },
              {
                project_id: projectId,
                project_identifier: nextProject?.identifier ?? issue.project_identifier,
              }
            );
          }}
        />
      </div>
      <span className="flyers-soft-dashboard-ticket-date">{formatDashboardDate(activity.visited_at)}</span>
      <Link href={workItemLink} className="flyers-soft-dashboard-ticket-more" aria-label={`Open ${issue.name}`}>
        <MoreVertical className="size-3.5" strokeWidth={1.9} />
      </Link>
    </div>
  );
}

export const DashboardWidgets = observer(function DashboardWidgets() {
  const { workspaceSlug } = useParams();
  const workspaceSlugString = workspaceSlug?.toString();
  const { toggleCreateIssueModal } = useCommandPalette();
  const { data: currentUser } = useUser();
  const [greeting, setGreeting] = useState(getDashboardGreeting);
  const globalIssueActions = useIssuesActions(EIssuesStoreType.GLOBAL);
  const epicIssueActions = useIssuesActions(EIssuesStoreType.EPIC);

  const {
    data: recentTickets,
    isLoading: isRecentTicketsLoading,
    mutate: mutateRecentTickets,
  } = useSWR(
    workspaceSlugString ? `FLYERS_HOME_RECENT_TICKETS_${workspaceSlugString}` : null,
    workspaceSlugString ? () => workspaceService.fetchWorkspaceRecents(workspaceSlugString, "issue") : null,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const handleRecentTicketUpdate = useCallback<TRecentTicketUpdate>(
    async (activity, payload, entityPatch) => {
      const issue = activity.entity_data as TIssueEntityData;
      const previousTickets = recentTickets;

      await mutateRecentTickets(
        (currentTickets) =>
          currentTickets?.map((ticketActivity) =>
            ticketActivity.id === activity.id
              ? {
                  ...ticketActivity,
                  entity_data: {
                    ...(ticketActivity.entity_data as TIssueEntityData),
                    ...entityPatch,
                  },
                }
              : ticketActivity
          ),
        { revalidate: false }
      );

      try {
        const updateIssue = issue.is_epic ? epicIssueActions.updateIssue : globalIssueActions.updateIssue;
        if (!updateIssue) throw new Error("Issue update action is unavailable");

        await updateIssue(issue.project_id, issue.id, payload);
        await mutateRecentTickets();
      } catch {
        await mutateRecentTickets(previousTickets, { revalidate: false });
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Could not update ticket. Please try again.",
        });
      }
    },
    [epicIssueActions.updateIssue, globalIssueActions.updateIssue, mutateRecentTickets, recentTickets]
  );

  useEffect(() => {
    const updateGreeting = () => setGreeting(getDashboardGreeting());

    updateGreeting();
    const intervalId = window.setInterval(updateGreeting, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!workspaceSlugString) return null;

  const visibleRecentTickets = (recentTickets ?? []).filter(
    (activity) => activity.entity_name === "issue" && activity.entity_data
  );

  const displayName = currentUser?.first_name || currentUser?.display_name || "Shalini";

  return (
    <div className="flyers-soft-dashboard-shell flyers-soft-notion-home">
      <section className="flyers-soft-dashboard-page-heading">
        <div className="min-w-0">
          <h1 className="flyers-soft-dashboard-greeting tracking-normal text-28 font-semibold text-primary">
            {greeting}, {displayName} <span aria-hidden="true">{"\u{1F44B}"}</span>
          </h1>
          <p className="flyers-soft-dashboard-subtitle text-15 mt-3 max-w-2xl text-tertiary">
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
                  onIssueUpdate={handleRecentTicketUpdate}
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
