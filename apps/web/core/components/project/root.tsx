/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import useSWR from "swr";
import { Archive, ChevronDown, Folder, PanelsTopLeft, Plus, SquareCheckBig, Zap } from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel, PROJECT_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import type { TProjectAppliedDisplayFilterKeys, TProjectFilters } from "@plane/types";
import { calculateTotalFilters } from "@plane/utils";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProject } from "@/hooks/store/use-project";
import { useProjectFilter } from "@/hooks/store/use-project-filter";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import { ProjectAppliedFiltersList } from "./applied-filters";
import { ProjectCardList } from "./card-list";
import HeaderFilters from "./filters";
import { ProjectSearch } from "./search-projects";

type TProjectTab = "all" | "active";

export const ProjectRoot = observer(function ProjectRoot() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { toggleCreateProjectModal } = useCommandPalette();
  // store
  const { totalProjectIds, filteredProjectIds, fetchProjectAnalyticsCount, getProjectAnalyticsCountById, getProjectById } =
    useProject();
  const {
    currentWorkspaceFilters,
    currentWorkspaceAppliedDisplayFilters,
    clearAllFilters,
    clearAllAppliedDisplayFilters,
    updateFilters,
    updateDisplayFilters,
  } = useProjectFilter();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const pageTitle = currentWorkspace?.name
    ? `${currentWorkspace?.name} - ${t("workspace_projects.label", { count: 2 })}`
    : undefined;

  const isArchived = pathname.includes("/archives");
  const [selectedProjectTab, setSelectedProjectTab] = useState<TProjectTab>("all");
  const workspacePath = workspaceSlug ? `/${workspaceSlug.toString()}` : "";
  const analyticsProjectIds = totalProjectIds?.join(",");
  const isAuthorizedUser = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );
  const projectTabs = [
    {
      href: `${workspacePath}/projects`,
      Icon: PanelsTopLeft,
      isActive: !isArchived && selectedProjectTab === "all",
      key: "all" as const,
      label: "All Projects",
    },
    {
      href: `${workspacePath}/projects`,
      Icon: SquareCheckBig,
      isActive: !isArchived && selectedProjectTab === "active",
      key: "active" as const,
      label: "Active",
    },
    {
      href: `${workspacePath}/projects/archives`,
      Icon: Archive,
      isActive: isArchived,
      key: "archived" as const,
      label: "Archived",
    },
  ];

  const isActiveProject = useCallback(
    (projectId: string) => {
      const project = getProjectById(projectId) as
        | (ReturnType<typeof getProjectById> & { status?: string | null })
        | undefined;
      if (!project || project.archived_at) return false;

      const projectStatus = project.status?.trim().toLowerCase();
      if (projectStatus) return !["archived", "completed", "done"].includes(projectStatus);

      const analytics = getProjectAnalyticsCountById(projectId);
      const totalIssues = analytics?.total_issues ?? 0;
      if (totalIssues <= 0) return true;

      return (analytics?.completed_issues ?? 0) < totalIssues;
    },
    [getProjectAnalyticsCountById, getProjectById]
  );

  const visibleFilteredProjectIds =
    !isArchived && selectedProjectTab === "active" ? filteredProjectIds?.filter(isActiveProject) : filteredProjectIds;

  const allowedDisplayFilters =
    currentWorkspaceAppliedDisplayFilters?.filter((filter) => filter !== "archived_projects") ?? [];

  const handleRemoveFilter = useCallback(
    (key: keyof TProjectFilters, value: string | null) => {
      if (!workspaceSlug) return;
      let newValues = currentWorkspaceFilters?.[key] ?? [];

      if (!value) newValues = [];
      else newValues = newValues.filter((val) => val !== value);

      updateFilters(workspaceSlug.toString(), { [key]: newValues });
    },
    [currentWorkspaceFilters, updateFilters, workspaceSlug]
  );

  const handleRemoveDisplayFilter = useCallback(
    (key: TProjectAppliedDisplayFilterKeys) => {
      if (!workspaceSlug) return;
      updateDisplayFilters(workspaceSlug.toString(), { [key]: false });
    },
    [updateDisplayFilters, workspaceSlug]
  );

  const handleClearAllFilters = useCallback(() => {
    if (!workspaceSlug) return;
    clearAllFilters(workspaceSlug.toString());
    clearAllAppliedDisplayFilters(workspaceSlug.toString());
    if (isArchived) updateDisplayFilters(workspaceSlug.toString(), { archived_projects: true });
  }, [clearAllFilters, clearAllAppliedDisplayFilters, isArchived, updateDisplayFilters, workspaceSlug]);

  useEffect(() => {
    if (!workspaceSlug) return;
    if (isArchived) setSelectedProjectTab("all");
    updateDisplayFilters(workspaceSlug.toString(), { archived_projects: isArchived });
  }, [isArchived, pathname, updateDisplayFilters, workspaceSlug]);

  useSWR(
    workspaceSlug && currentWorkspace && analyticsProjectIds
      ? `WORKSPACE_PROJECT_ANALYTICS_${workspaceSlug}_${analyticsProjectIds}`
      : null,
    workspaceSlug && analyticsProjectIds
      ? () =>
          fetchProjectAnalyticsCount(workspaceSlug.toString(), {
            project_ids: analyticsProjectIds,
            fields: "total_issues,completed_issues,total_members",
          })
      : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="flyers-soft-projects-body flex min-h-full w-full flex-col bg-[var(--fs-bg-canvas)]">
        <div className="flyers-soft-projects-page flex w-full flex-col">
          <section className="flyers-soft-projects-hero">
            <div className="flyers-soft-projects-folder-icon" aria-hidden="true">
              <Folder className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <h1>{isArchived ? "Archived Projects" : "Projects"}</h1>
              <p>All projects in your workspace. Track progress and manage your work.</p>
            </div>
          </section>

          <section className="flyers-soft-projects-toolbar" aria-label="Projects toolbar">
            <div className="flyers-soft-projects-tabs" role="tablist" aria-label="Project views">
              {projectTabs.map((tab) => (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={tab.isActive ? "is-active" : ""}
                  onClick={(e) => {
                    if (tab.key === "archived") return;
                    setSelectedProjectTab(tab.key);
                    if (tab.key === "active" && !isArchived) e.preventDefault();
                  }}
                  role="tab"
                  aria-selected={tab.isActive}
                >
                  <tab.Icon className="h-4 w-4" strokeWidth={1.8} />
                  {tab.label}
                </Link>
              ))}
              {isAuthorizedUser && !isArchived && (
                <button
                  type="button"
                  className="flyers-soft-projects-tab-add"
                  onClick={() => toggleCreateProjectModal(true)}
                  aria-label="Create project"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.8} />
                </button>
              )}
            </div>

            <div className="flyers-soft-projects-toolbar-actions">
              <HeaderFilters classname="flyers-soft-projects-toolbar-filters" />
              <button
                type="button"
                title="Quick actions"
                aria-label="Quick actions"
                className="flyers-soft-projects-toolbar-icon-button"
                onClick={() => toggleCreateProjectModal(true)}
              >
                <Zap className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <ProjectSearch />
              {isAuthorizedUser && !isArchived && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => toggleCreateProjectModal(true)}
                  data-ph-element={PROJECT_TRACKER_ELEMENTS.CREATE_HEADER_BUTTON}
                  className="flyers-soft-projects-new-button"
                >
                  <span>New</span>
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                </Button>
              )}
            </div>
          </section>

          {(calculateTotalFilters(currentWorkspaceFilters ?? {}) !== 0 || allowedDisplayFilters.length > 0) && (
            <ProjectAppliedFiltersList
              appliedFilters={currentWorkspaceFilters ?? {}}
              appliedDisplayFilters={allowedDisplayFilters}
              handleClearAllFilters={handleClearAllFilters}
              handleRemoveFilter={handleRemoveFilter}
              handleRemoveDisplayFilter={handleRemoveDisplayFilter}
              filteredProjects={filteredProjectIds?.length ?? 0}
              totalProjects={totalProjectIds?.length ?? 0}
              alwaysAllowEditing
            />
          )}
          <ProjectCardList totalProjectIds={totalProjectIds} filteredProjectIds={visibleFilteredProjectIds} />
        </div>
      </div>
    </>
  );
});
