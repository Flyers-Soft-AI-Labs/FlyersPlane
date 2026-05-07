/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useRef, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArchiveRestoreIcon, CalendarDays, MoreHorizontal, Settings, UserPlus, Users } from "lucide-react";
// plane imports
import { EUserPermissions } from "@plane/constants";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { LinkIcon, LockIcon, NewTabIcon, TrashIcon } from "@plane/propel/icons";
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import type { IProject } from "@plane/types";
import type { TContextMenuItem } from "@plane/ui";
import { ContextMenu, CustomMenu } from "@plane/ui";
import { copyUrlToClipboard, cn, renderFormattedDate } from "@plane/utils";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";
// local imports
import { CoverImage } from "@/components/common/cover-image";
import { ArchiveRestoreProjectModal } from "./archive-restore-modal";
import { DeleteProjectModal } from "./delete-project-modal";
import { JoinProjectModal } from "./join-project-modal";

type Props = {
  project: IProject;
};

type TProjectStatus = {
  label: "Active" | "Completed" | "On Hold";
  className: string;
};

const PROGRESS_FILL_COLOR = "#f5b800";

function getProjectProgress(completedIssues = 0, totalIssues = 0) {
  if (totalIssues <= 0) return 0;

  return Math.min(100, Math.round((completedIssues / totalIssues) * 100));
}

function getProjectStatus(project: IProject, progress: number, totalIssues: number): TProjectStatus {
  if (project.archived_at) {
    return {
      label: "On Hold",
      className: "border-[#fecdd3] bg-[#fff0f4] text-[#e11d48]",
    };
  }

  if (totalIssues > 0 && progress >= 100) {
    return {
      label: "Completed",
      className: "border-[#bbf7d0] bg-[#dcfce7] text-[#15803d]",
    };
  }

  return {
    label: "Active",
    className: "border-[#ddd6fe] bg-[#ede9fe] text-[#6d28d9]",
  };
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
      <div className="relative">
        <ContextMenu parentRef={projectCardRef} items={MENU_ITEMS} />
        {visibleMenuItems.length > 0 && (
          <div className="absolute top-3 right-3 z-[2]" data-prevent-progress>
            <CustomMenu
              customButton={
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[#64748b] shadow-[0_6px_16px_rgba(15,23,42,0.10)] transition-colors hover:bg-white hover:text-[#111827]">
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
          className="group/project-card flex h-[270px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#f1e4b8] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.055)] transition-all duration-200 ease-out outline-none hover:-translate-y-1 hover:border-[#efd277] hover:shadow-[0_18px_36px_rgba(255,193,7,0.22)] focus-visible:border-[#efd277]"
        >
          <div className="relative h-[104px] w-full shrink-0 overflow-hidden">
            <CoverImage
              src={project.cover_image_url}
              alt={project.name}
              showDefaultWhenEmpty
              className="absolute inset-0 h-full w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

            <div className="absolute right-12 bottom-3 left-4 z-[1] flex items-end gap-2.5">
              <div className="shadow-sm grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/95">
                <Logo logo={project.logo_props} size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="text-15 truncate font-semibold text-on-color">{project.name}</h3>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", status.className)}>
                    {status.label.toUpperCase()}
                  </span>
                </div>
                <div className="tracking-normal mt-1 flex items-center gap-1.5 text-11 font-semibold text-on-color/90 uppercase">
                  <span>{project.identifier}</span>
                  {project.network === 0 && <LockIcon className="h-3 w-3" />}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-3.5">
            <p className="line-clamp-2 min-h-9 text-12 leading-[18px] text-[#5f6775]">
              {project.description && project.description.trim() !== ""
                ? project.description
                : `Created on ${renderFormattedDate(project.created_at)}`}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3 text-11 text-[#64748b]">
              <span className="flex min-w-0 items-center gap-1.5 font-medium">
                <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span className="truncate">
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-right">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                {renderFormattedDate(project.created_at)}
              </span>
            </div>

            <div className="mt-auto flex items-center gap-3 pt-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#edf1f6]">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${progress}%`, backgroundColor: PROGRESS_FILL_COLOR }}
                />
              </div>
              <span
                className="w-9 shrink-0 text-right text-12 font-semibold"
                style={{ color: progress > 0 ? PROGRESS_FILL_COLOR : "#64748b" }}
              >
                {progress}%
              </span>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
});
