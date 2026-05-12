/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useRef, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArchiveRestoreIcon, FileText, MoreHorizontal, Settings, UserPlus } from "lucide-react";
// plane imports
import { EUserPermissions } from "@plane/constants";
import { LinkIcon, LockIcon, NewTabIcon, TrashIcon } from "@plane/propel/icons";
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import type { IProject } from "@plane/types";
import type { TContextMenuItem } from "@plane/ui";
import { ContextMenu, CustomMenu } from "@plane/ui";
import { copyUrlToClipboard, cn, renderFormattedDate } from "@plane/utils";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";
// local imports
import { ArchiveRestoreProjectModal } from "./archive-restore-modal";
import { DeleteProjectModal } from "./delete-project-modal";
import { JoinProjectModal } from "./join-project-modal";

type Props = {
  project: IProject;
};

type TProjectStatus = {
  label: "Active" | "Completed" | "Archived";
  className: string;
  dotClassName: string;
};

type TProjectWithTableFields = IProject & {
  due_date?: string | Date | null;
  end_date?: string | Date | null;
  priority?: string | null;
  target_date?: string | Date | null;
};

function getProjectProgress(completedIssues = 0, totalIssues = 0) {
  if (totalIssues <= 0) return 0;

  return Math.min(100, Math.round((completedIssues / totalIssues) * 100));
}

function getProjectStatus(project: IProject, progress: number, totalIssues: number): TProjectStatus {
  if (project.archived_at) {
    return {
      label: "Archived",
      className: "flyers-soft-projects-pill-neutral",
      dotClassName: "flyers-soft-projects-dot-neutral",
    };
  }

  if (totalIssues > 0 && progress >= 100) {
    return {
      label: "Completed",
      className: "flyers-soft-projects-pill-green",
      dotClassName: "flyers-soft-projects-dot-green",
    };
  }

  return {
    label: "Active",
    className: "flyers-soft-projects-pill-blue",
    dotClassName: "flyers-soft-projects-dot-blue",
  };
}

function getProjectDueDate(project: TProjectWithTableFields) {
  return project.target_date ?? project.due_date ?? project.end_date ?? null;
}

function getPriorityClassName(priority: string) {
  const priorityValue = priority.toLowerCase();

  if (priorityValue === "urgent" || priorityValue === "high") return "flyers-soft-projects-pill-red";
  if (priorityValue === "medium") return "flyers-soft-projects-pill-purple";
  if (priorityValue === "low") return "flyers-soft-projects-pill-green";

  return "flyers-soft-projects-pill-neutral";
}

function getProjectLeadName(
  projectLead: IProject["project_lead"],
  getUserDetails: ReturnType<typeof useMember>["getUserDetails"]
) {
  if (!projectLead) return "Unassigned";

  if (typeof projectLead === "string") {
    const userDetails = getUserDetails(projectLead);
    return userDetails?.display_name || userDetails?.email || "Assigned";
  }

  return projectLead.display_name || projectLead.email || "Assigned";
}

export const ProjectCard = observer(function ProjectCard(props: Props) {
  const { project } = props;
  // states
  const [deleteProjectModalOpen, setDeleteProjectModal] = useState(false);
  const [joinProjectModalOpen, setJoinProjectModal] = useState(false);
  const [restoreProject, setRestoreProject] = useState(false);
  // refs
  const projectCardRef = useRef<HTMLAnchorElement | null>(null);
  // router
  const router = useAppRouter();
  const { workspaceSlug } = useParams();
  // store hooks
  const { getProjectAnalyticsCountById } = useProject();
  const { getUserDetails } = useMember();
  // auth
  const isMemberOfProject = !!project.member_role;
  const hasAdminRole = project.member_role === EUserPermissions.ADMIN;
  const hasMemberRole = project.member_role === EUserPermissions.MEMBER;
  // archive
  const isArchived = !!project.archived_at;
  // analytics
  const analytics = getProjectAnalyticsCountById(project.id);
  const totalIssues = analytics?.total_issues ?? 0;
  const completedIssues = analytics?.completed_issues ?? 0;
  const progress = getProjectProgress(completedIssues, totalIssues);
  const status = getProjectStatus(project, progress, totalIssues);
  const memberCount = analytics?.total_members ?? project.members?.length ?? 0;
  const tableProject = project as TProjectWithTableFields;
  const projectLeadName = getProjectLeadName(project.project_lead, getUserDetails);
  const dueDate = getProjectDueDate(tableProject);
  const dueDateLabel = dueDate ? renderFormattedDate(dueDate) : "No due date";
  const priorityLabel = tableProject.priority?.trim() || "None";
  const priorityClassName = getPriorityClassName(priorityLabel);
  const teamLabel = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;

  const projectLink = `${workspaceSlug}/projects/${project.id}/issues`;
  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isMemberOfProject || isArchived) {
      e.preventDefault();
      if (!isArchived) setJoinProjectModal(true);
    }
  };
  const handleCopyText = () =>
    copyUrlToClipboard(projectLink).then(() =>
      setToast({
        type: TOAST_TYPE.INFO,
        title: "Link Copied!",
        message: "Project link copied to clipboard.",
      })
    );
  const handleOpenInNewTab = () => window.open(`/${projectLink}`, "_blank");

  const MENU_ITEMS: TContextMenuItem[] = [
    {
      key: "settings",
      action: () => router.push(`/${workspaceSlug}/settings/projects/${project.id}`),
      title: "Settings",
      icon: Settings,
      shouldRender: !isArchived && (hasAdminRole || hasMemberRole),
    },
    {
      key: "join",
      action: () => setJoinProjectModal(true),
      title: "Join",
      icon: UserPlus,
      shouldRender: !isMemberOfProject && !isArchived,
    },
    {
      key: "open-new-tab",
      action: handleOpenInNewTab,
      title: "Open in new tab",
      icon: NewTabIcon,
      shouldRender: isMemberOfProject && !isArchived,
    },
    {
      key: "copy-link",
      action: handleCopyText,
      title: "Copy link",
      icon: LinkIcon,
      shouldRender: !isArchived,
    },
    {
      key: "restore",
      action: () => setRestoreProject(true),
      title: "Restore",
      icon: ArchiveRestoreIcon,
      shouldRender: isArchived && hasAdminRole,
    },
    {
      key: "delete",
      action: () => setDeleteProjectModal(true),
      title: "Delete",
      icon: TrashIcon,
      shouldRender: isArchived && hasAdminRole,
    },
  ];
  const visibleMenuItems = MENU_ITEMS.filter((item) => item.shouldRender !== false);

  return (
    <>
      <DeleteProjectModal
        project={project}
        isOpen={deleteProjectModalOpen}
        onClose={() => setDeleteProjectModal(false)}
      />
      {workspaceSlug && (
        <JoinProjectModal
          workspaceSlug={workspaceSlug.toString()}
          project={project}
          isOpen={joinProjectModalOpen}
          handleClose={() => setJoinProjectModal(false)}
        />
      )}
      {workspaceSlug && project && (
        <ArchiveRestoreProjectModal
          workspaceSlug={workspaceSlug.toString()}
          projectId={project.id}
          isOpen={restoreProject}
          onClose={() => setRestoreProject(false)}
          archive={false}
        />
      )}
      <div className="flyers-soft-projects-row-wrap" role="row">
        <ContextMenu parentRef={projectCardRef} items={MENU_ITEMS} />
        {visibleMenuItems.length > 0 && (
          <div className="flyers-soft-projects-row-actions" data-prevent-progress>
            <CustomMenu
              customButton={
                <span className="flyers-soft-projects-action-button">
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                </span>
              }
              ariaLabel="Project actions"
              placement="bottom-end"
              closeOnSelect
            >
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <CustomMenu.MenuItem key={item.key} className="flex items-center gap-2" onClick={() => item.action()}>
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {item.title}
                  </CustomMenu.MenuItem>
                );
              })}
            </CustomMenu>
          </div>
        )}
        <Link
          ref={projectCardRef}
          href={`/${projectLink}`}
          onClick={handleProjectClick}
          data-prevent-progress={!isMemberOfProject || isArchived}
          className="flyers-soft-projects-table-row"
        >
          <div className="flyers-soft-projects-name-cell" role="cell">
            <FileText className="h-4 w-4 shrink-0 text-tertiary" strokeWidth={1.8} aria-hidden="true" />
            <div className="min-w-0">
              <div className="flyers-soft-projects-project-name">
                <span className="truncate">{project.name}</span>
                {project.network === 0 && <LockIcon className="h-3 w-3 shrink-0 text-tertiary" />}
              </div>
              <div className="flyers-soft-projects-project-key">{project.identifier}</div>
            </div>
          </div>
          <div role="cell">
            <span className={cn("flyers-soft-projects-pill", status.className)}>
              <span className={cn("flyers-soft-projects-pill-dot", status.dotClassName)} />
              {status.label}
            </span>
          </div>
          <div className="flyers-soft-projects-muted-cell" role="cell">
            {projectLeadName}
          </div>
          <div className="flyers-soft-projects-muted-cell" role="cell">
            {teamLabel}
          </div>
          <div className="flyers-soft-projects-muted-cell" role="cell">
            {dueDateLabel}
          </div>
          <div role="cell">
            <span className={cn("flyers-soft-projects-pill", priorityClassName)}>{priorityLabel}</span>
          </div>
          <div role="cell" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
});
