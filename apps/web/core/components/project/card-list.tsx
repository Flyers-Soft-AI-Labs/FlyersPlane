/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { CalendarDays, Circle, List, MoreHorizontal, Plus, User, Users } from "lucide-react";
// plane imports
import { EUserPermissionsLevel, EUserPermissions } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
// components
import { calculateTotalFilters } from "@plane/utils";
import { ProjectsLoader } from "@/components/ui/loader/projects-loader";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProject } from "@/hooks/store/use-project";
import { useProjectFilter } from "@/hooks/store/use-project-filter";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import { ProjectCard } from "./card";

type TProjectCardListProps = {
  totalProjectIds?: string[];
  filteredProjectIds?: string[];
};

export const ProjectCardList = observer(function ProjectCardList(props: TProjectCardListProps) {
  const { totalProjectIds: totalProjectIdsProps, filteredProjectIds: filteredProjectIdsProps } = props;
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { toggleCreateProjectModal } = useCommandPalette();
  const {
    loader,
    fetchStatus,
    workspaceProjectIds: storeWorkspaceProjectIds,
    filteredProjectIds: storeFilteredProjectIds,
    getProjectById,
  } = useProject();
  const { currentWorkspaceDisplayFilters, currentWorkspaceFilters } = useProjectFilter();
  const { allowPermissions } = useUserPermissions();

  // derived values
  const workspaceProjectIds = totalProjectIdsProps ?? storeWorkspaceProjectIds;
  const filteredProjectIds = filteredProjectIdsProps ?? storeFilteredProjectIds;

  // permissions
  const canPerformEmptyStateActions = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  if (!filteredProjectIds || !workspaceProjectIds || loader === "init-loader" || fetchStatus !== "complete")
    return <ProjectsLoader />;

  if (workspaceProjectIds?.length === 0 && !currentWorkspaceDisplayFilters?.archived_projects)
    return (
      <EmptyStateDetailed
        title={t("workspace_projects.empty_state.general.title")}
        description={t("workspace_projects.empty_state.general.description")}
        assetKey="project"
        assetClassName="size-40"
        actions={[
          {
            label: t("workspace_projects.empty_state.general.primary_button.text"),
            onClick: () => {
              toggleCreateProjectModal(true);
            },
            disabled: !canPerformEmptyStateActions,
            variant: "primary",
          },
        ]}
      />
    );

  if (filteredProjectIds.length === 0)
    return (
      <EmptyStateDetailed
        title={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? t("workspace_empty_state.projects_archived.title")
            : t("common_empty_state.search.title")
        }
        description={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? t("workspace_empty_state.projects_archived.description")
            : t("common_empty_state.search.description")
        }
        assetKey={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? "archived-work-item"
            : "search"
        }
        assetClassName="size-40"
      />
    );

  return (
    <section className="flyers-soft-projects-table-section">
      <div className="flyers-soft-projects-table-scroll">
        <div className="flyers-soft-projects-table" role="table" aria-label="Projects">
          <div className="flyers-soft-projects-table-header" role="row">
            <div className="flyers-soft-projects-header-cell" role="columnheader">
              <span className="flyers-soft-projects-header-text-icon">Aa</span>
              <span>Name</span>
            </div>
            <div className="flyers-soft-projects-header-cell" role="columnheader">
              <Circle className="h-4 w-4" strokeWidth={1.8} />
              <span>Status</span>
            </div>
            <div className="flyers-soft-projects-header-cell" role="columnheader">
              <User className="h-4 w-4" strokeWidth={1.8} />
              <span>Owner</span>
            </div>
            <div className="flyers-soft-projects-header-cell" role="columnheader">
              <Users className="h-4 w-4" strokeWidth={1.8} />
              <span>Team</span>
            </div>
            <div className="flyers-soft-projects-header-cell" role="columnheader">
              <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
              <span>Due date</span>
            </div>
            <div className="flyers-soft-projects-header-cell" role="columnheader">
              <List className="h-4 w-4" strokeWidth={1.8} />
              <span>Priority</span>
            </div>
            <div className="flyers-soft-projects-header-icon-cell" role="columnheader" aria-label="Add property">
              <Plus className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="flyers-soft-projects-header-icon-cell" role="columnheader" aria-label="More options">
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          {filteredProjectIds.map((projectId) => {
            const projectDetails = getProjectById(projectId);
            if (!projectDetails) return;
            return <ProjectCard key={projectDetails.id} project={projectDetails} />;
          })}
          <div className="flyers-soft-projects-table-footer">
            <span>COUNT</span>
            <strong>{filteredProjectIds.length}</strong>
          </div>
        </div>
      </div>
    </section>
  );
});
