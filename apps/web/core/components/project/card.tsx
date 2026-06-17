/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Placement, PositioningStrategy } from "@popperjs/core";
import React, { useRef, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
import { ArchiveRestoreIcon, ChevronDown, FileText, MoreHorizontal, Settings, UserPlus } from "lucide-react";
import { Combobox } from "@headlessui/react";
// plane imports
import { EUserPermissions, ISSUE_PRIORITIES } from "@plane/constants";
import { CheckIcon, LinkIcon, LockIcon, NewTabIcon, PriorityIcon, SearchIcon, TrashIcon } from "@plane/propel/icons";
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import type { IProject, TIssuePriorities } from "@plane/types";
import type { TContextMenuItem } from "@plane/ui";
import { ComboDropDown, ContextMenu, CustomMenu } from "@plane/ui";
import { copyUrlToClipboard, cn, renderFormattedPayloadDate } from "@plane/utils";
// components
import { DateDropdown } from "@/components/dropdowns/date";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";
import { useDropdown } from "@/hooks/use-dropdown";
// local imports
import { ArchiveRestoreProjectModal } from "./archive-restore-modal";
import { DeleteProjectModal } from "./delete-project-modal";
import { JoinProjectModal } from "./join-project-modal";

type Props = {
  project: IProject;
};

type TProjectStatus = {
  label: string;
  className: string;
  dotClassName: string;
};

type TProjectWithTableFields = IProject & {
  due_date?: string | Date | null;
  end_date?: string | Date | null;
  priority?: string | null;
  status?: string | null;
  target_date?: string | Date | null;
};

type TProjectUpdatePayload = Partial<IProject> & Partial<TProjectWithTableFields>;

const PROJECT_STATUS_OPTIONS = ["To Do", "Planning", "In Progress", "Completed", "Active", "Archived"];
const PROJECT_PRIORITY_KEYS = new Set<TIssuePriorities>(["none", "low", "medium", "high", "urgent"]);

function getProjectProgress(completedIssues = 0, totalIssues = 0) {
  if (totalIssues <= 0) return 0;

  return Math.min(100, Math.round((completedIssues / totalIssues) * 100));
}

function getStatusTone(statusLabel: string): Pick<TProjectStatus, "className" | "dotClassName"> {
  const statusValue = statusLabel.toLowerCase();

  if (statusValue.includes("progress") || statusValue === "active") {
    return {
      className: "flyers-soft-projects-pill-blue",
      dotClassName: "flyers-soft-projects-dot-blue",
    };
  }

  if (statusValue.includes("plan")) {
    return {
      className: "flyers-soft-projects-pill-purple",
      dotClassName: "flyers-soft-projects-dot-purple",
    };
  }

  if (statusValue.includes("complete") || statusValue.includes("done")) {
    return {
      className: "flyers-soft-projects-pill-green",
      dotClassName: "flyers-soft-projects-dot-green",
    };
  }

  return {
    className: "flyers-soft-projects-pill-neutral",
    dotClassName: "flyers-soft-projects-dot-neutral",
  };
}

function getProjectStatus(project: TProjectWithTableFields, progress: number, totalIssues: number): TProjectStatus {
  if (project.status?.trim()) {
    const statusLabel = project.status.trim();
    return {
      label: statusLabel,
      ...getStatusTone(statusLabel),
    };
  }

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
    ...getStatusTone("Active"),
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

function getProjectLeadId(projectLead: IProject["project_lead"]) {
  if (!projectLead) return null;
  return typeof projectLead === "string" ? projectLead : projectLead.id;
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

function normalizeProjectPriority(priority: string | null | undefined): TIssuePriorities {
  const priorityValue = priority?.toLowerCase() as TIssuePriorities | undefined;
  return priorityValue && PROJECT_PRIORITY_KEYS.has(priorityValue) ? priorityValue : "none";
}

function getPriorityLabel(priority: string | null | undefined) {
  const normalizedPriority = normalizeProjectPriority(priority);
  return ISSUE_PRIORITIES.find((item) => item.key === normalizedPriority)?.title ?? "None";
}

function isInlineControlTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      "a, button, input, textarea, select, [role='button'], [role='menuitem'], [data-project-inline-control]"
    )
  );
}

type TProjectInlineDropdownOption<TValue extends string> = {
  content: React.ReactNode;
  query: string;
  value: TValue;
};

type TProjectInlineDropdownProps<TValue extends string> = {
  ariaLabel: string;
  button: React.ReactNode;
  buttonClassName?: string;
  className?: string;
  dropdownStrategy?: PositioningStrategy;
  onChange: (value: TValue) => void;
  options: TProjectInlineDropdownOption<TValue>[];
  optionsClassName?: string;
  placement?: Placement;
  searchPlaceholder?: string;
  value: TValue;
};

function ProjectInlineDropdown<TValue extends string>(props: TProjectInlineDropdownProps<TValue>) {
  const {
    ariaLabel,
    button,
    buttonClassName,
    className = "",
    dropdownStrategy = "absolute",
    onChange,
    options,
    optionsClassName = "",
    placement,
    searchPlaceholder = "Search",
    value,
  } = props;
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    strategy: dropdownStrategy,
    placement: placement ?? "bottom-start",
    modifiers: [
      {
        name: "flip",
        options: {
          padding: 12,
        },
      },
      {
        name: "preventOverflow",
        options: {
          altAxis: true,
          padding: 12,
          rootBoundary: "viewport",
        },
      },
    ],
  });

  const filteredOptions =
    query === "" ? options : options.filter((option) => option.query.toLowerCase().includes(query.toLowerCase()));

  const { handleClose, handleKeyDown, handleOnClick, searchInputKeyDown } = useDropdown({
    dropdownRef,
    inputRef,
    isOpen,
    query,
    setIsOpen,
    setQuery,
  });

  const dropdownOnChange = (nextValue: TValue) => {
    onChange(nextValue);
    handleClose();
  };

  return (
    <ComboDropDown
      as="div"
      ref={dropdownRef}
      className={cn("h-full", className)}
      value={value}
      onChange={dropdownOnChange}
      onKeyDown={handleKeyDown}
      button={
        <button
          ref={setReferenceElement}
          type="button"
          className={cn("clickable block h-full w-full outline-none", buttonClassName)}
          onClick={handleOnClick}
          aria-label={ariaLabel}
        >
          {button}
        </button>
      }
    >
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <Combobox.Options data-prevent-outside-click static>
            <div
              className={cn(
                "z-30 my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none",
                optionsClassName
              )}
              ref={setPopperElement}
              style={styles.popper}
              {...attributes.popper}
            >
              <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
                <SearchIcon className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
                <Combobox.Input
                  as="input"
                  ref={inputRef}
                  className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  displayValue={(selected: TValue) => selected}
                  onKeyDown={searchInputKeyDown}
                />
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-scroll">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <Combobox.Option
                      key={option.value}
                      value={option.value}
                      className={({ active, selected }) =>
                        cn(
                          "flex w-full cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 select-none",
                          active && "bg-layer-transparent-hover",
                          selected ? "text-primary" : "text-secondary"
                        )
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className="flex-grow truncate">{option.content}</span>
                          {selected && <CheckIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                ) : (
                  <p className="px-1.5 py-1 text-placeholder italic">No matching results</p>
                )}
              </div>
            </div>
          </Combobox.Options>,
          document.body
        )}
    </ComboDropDown>
  );
}

export const ProjectCard = observer(function ProjectCard(props: Props) {
  const { project } = props;
  // states
  const [deleteProjectModalOpen, setDeleteProjectModal] = useState(false);
  const [joinProjectModalOpen, setJoinProjectModal] = useState(false);
  const [restoreProjectModalOpen, setRestoreProjectModalOpen] = useState(false);
  // refs
  const projectCardRef = useRef<HTMLDivElement | null>(null);
  // router
  const router = useAppRouter();
  const { workspaceSlug } = useParams();
  // store hooks
  const {
    getProjectAnalyticsCountById,
    updateProject,
    archiveProject,
    restoreProject: restoreProjectInStore,
  } = useProject();
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
  const tableProject = project as TProjectWithTableFields;
  const status = getProjectStatus(tableProject, progress, totalIssues);
  const memberCount = analytics?.total_members ?? project.members?.length ?? 0;
  const projectLeadName = getProjectLeadName(project.project_lead, getUserDetails);
  const projectLeadId = getProjectLeadId(project.project_lead);
  const dueDate = getProjectDueDate(tableProject);
  const projectPriority = normalizeProjectPriority(tableProject.priority);
  const priorityLabel = getPriorityLabel(tableProject.priority);
  const priorityClassName = getPriorityClassName(priorityLabel);
  const teamMemberIds = project.members ?? [];
  const teamLabel = `${teamMemberIds.length || memberCount} ${
    (teamMemberIds.length || memberCount) === 1 ? "member" : "members"
  }`;

  const projectLink = `${workspaceSlug}/projects/${project.id}/issues`;
  const workspaceSlugString = workspaceSlug?.toString();

  const handleUpdateError = () =>
    setToast({
      type: TOAST_TYPE.ERROR,
      title: "Update failed",
      message: "Could not update the project. Please try again.",
    });

  const updateProjectDetails = async (data: TProjectUpdatePayload) => {
    if (!workspaceSlugString) return;
    await updateProject(workspaceSlugString, project.id, data as Partial<IProject>);
  };

  const handleStatusUpdate = (nextStatus: string) => {
    if (!workspaceSlugString || nextStatus === status.label) return;

    void (async () => {
      if (nextStatus === "Archived") {
        await archiveProject(workspaceSlugString, project.id);
        return;
      }

      if (isArchived) await restoreProjectInStore(workspaceSlugString, project.id);
      await updateProjectDetails({ status: nextStatus });
    })().catch(handleUpdateError);
  };

  const handleProjectRowNavigation = () => {
    if (!isMemberOfProject || isArchived) {
      if (!isArchived) setJoinProjectModal(true);
      return;
    }

    router.push(`/${projectLink}`);
  };

  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isMemberOfProject || isArchived) {
      e.preventDefault();
      if (!isArchived) setJoinProjectModal(true);
    }
  };

  const handleProjectRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInlineControlTarget(e.target)) return;
    handleProjectRowNavigation();
  };

  const handleProjectRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleProjectRowNavigation();
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
      action: () => setRestoreProjectModalOpen(true),
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
  const statusOptions = PROJECT_STATUS_OPTIONS.map((statusOption) => ({
    value: statusOption,
    query: statusOption,
    content: (
      <span className="flex items-center gap-2">
        <span className={cn("flyers-soft-projects-pill-dot", getStatusTone(statusOption).dotClassName)} />
        {statusOption}
      </span>
    ),
  }));
  const priorityOptions = ISSUE_PRIORITIES.filter((priority) =>
    PROJECT_PRIORITY_KEYS.has(priority.key as TIssuePriorities)
  ).map((priority) => ({
    value: priority.key as TIssuePriorities,
    query: `${priority.key} ${priority.title}`,
    content: (
      <div className="flex items-center gap-2">
        <PriorityIcon priority={priority.key} size={14} withContainer />
        <span className="flex-grow truncate">{priority.title}</span>
      </div>
    ),
  }));

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
          isOpen={restoreProjectModalOpen}
          onClose={() => setRestoreProjectModalOpen(false)}
          archive={false}
        />
      )}
      <div className="flyers-soft-projects-row-wrap">
        <ContextMenu parentRef={projectCardRef} items={MENU_ITEMS} />
        <div
          ref={projectCardRef}
          className="flyers-soft-projects-table-row"
          data-prevent-progress={!isMemberOfProject || isArchived}
          onClick={handleProjectRowClick}
          onKeyDown={handleProjectRowKeyDown}
          role="row"
          tabIndex={0}
        >
          <div className="flyers-soft-projects-name-cell" role="cell">
            <FileText className="h-4 w-4 shrink-0 text-tertiary" strokeWidth={1.8} aria-hidden="true" />
            <div className="min-w-0">
              <Link
                href={`/${projectLink}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleProjectClick(e);
                }}
                data-prevent-progress={!isMemberOfProject || isArchived}
                className="flyers-soft-projects-project-name"
              >
                <span className="truncate">{project.name}</span>
                {project.network === 0 && <LockIcon className="h-3 w-3 shrink-0 text-tertiary" />}
              </Link>
              <div className="flyers-soft-projects-project-key">{project.identifier}</div>
            </div>
          </div>
          <div role="cell" data-project-inline-control>
            <ProjectInlineDropdown
              value={status.label}
              onChange={handleStatusUpdate}
              ariaLabel="Project status"
              buttonClassName="flyers-soft-projects-inline-menu-button"
              options={statusOptions}
              optionsClassName="flyers-soft-projects-inline-options"
              placement="bottom-start"
              button={
                <span className={cn("flyers-soft-projects-pill flyers-soft-projects-inline-pill", status.className)}>
                  <span className={cn("flyers-soft-projects-pill-dot", status.dotClassName)} />
                  {status.label}
                  <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={2} />
                </span>
              }
            />
          </div>
          <div className="flyers-soft-projects-muted-cell" role="cell" data-project-inline-control>
            <MemberDropdown
              value={projectLeadId}
              onChange={(lead) => {
                void updateProjectDetails({ project_lead: lead === projectLeadId ? null : lead }).catch(
                  handleUpdateError
                );
              }}
              placeholder="Owner"
              multiple={false}
              buttonVariant="transparent-with-text"
              optionsClassName="flyers-soft-projects-inline-options"
              placement="bottom-start"
              button={<span className="flyers-soft-projects-inline-text">{projectLeadName}</span>}
            />
          </div>
          <div className="flyers-soft-projects-muted-cell" role="cell" data-project-inline-control>
            <MemberDropdown
              value={teamMemberIds}
              onChange={(members) => {
                void updateProjectDetails({ members }).catch(handleUpdateError);
              }}
              placeholder="Team"
              multiple
              buttonVariant="transparent-with-text"
              optionsClassName="flyers-soft-projects-inline-options"
              placement="bottom-start"
              button={<span className="flyers-soft-projects-inline-text">{teamLabel}</span>}
            />
          </div>
          <div className="flyers-soft-projects-muted-cell" role="cell" data-project-inline-control>
            <DateDropdown
              value={dueDate}
              onChange={(date) => {
                void updateProjectDetails({
                  target_date: date ? (renderFormattedPayloadDate(date) ?? null) : null,
                }).catch(handleUpdateError);
              }}
              placeholder="No due date"
              buttonVariant="transparent-with-text"
              buttonClassName="flyers-soft-projects-inline-date-button"
              buttonContainerClassName="flyers-soft-projects-inline-date"
              hideIcon
              optionsClassName="flyers-soft-projects-inline-options"
              placement="bottom-start"
            />
          </div>
          <div role="cell" data-project-inline-control>
            <ProjectInlineDropdown
              value={projectPriority}
              onChange={(priority) => {
                void updateProjectDetails({ priority }).catch(handleUpdateError);
              }}
              ariaLabel="Project priority"
              options={priorityOptions}
              optionsClassName="flyers-soft-projects-inline-options"
              placement="bottom-start"
              button={
                <span className={cn("flyers-soft-projects-pill flyers-soft-projects-inline-pill", priorityClassName)}>
                  {priorityLabel}
                  <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={2} />
                </span>
              }
            />
          </div>
          <div className="flyers-soft-projects-plus-cell" role="cell" aria-hidden="true" />
          <div className="flyers-soft-projects-more-cell" role="cell" data-project-inline-control>
            {visibleMenuItems.length > 0 && (
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
                    <CustomMenu.MenuItem
                      key={item.key}
                      className="flex items-center gap-2"
                      onClick={() => item.action()}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {item.title}
                    </CustomMenu.MenuItem>
                  );
                })}
              </CustomMenu>
            )}
          </div>
        </div>
      </div>
    </>
  );
});
