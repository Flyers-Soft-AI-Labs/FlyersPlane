/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect } from "react";
import { observer } from "mobx-react";
import { useParams, usePathname } from "next/navigation";
import useSWR from "swr";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TProjectAppliedDisplayFilterKeys, TProjectFilters } from "@plane/types";
import { calculateTotalFilters } from "@plane/utils";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useProjectFilter } from "@/hooks/store/use-project-filter";
import { useWorkspace } from "@/hooks/store/use-workspace";
// local imports
import { ProjectAppliedFiltersList } from "./applied-filters";
import { ProjectCardList } from "./card-list";
import { ProjectStats } from "./stats";

export const ProjectRoot = observer(function ProjectRoot() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  const { t } = useTranslation();
  // store
  const { totalProjectIds, filteredProjectIds, fetchProjectAnalyticsCount } = useProject();
  const {
    currentWorkspaceFilters,
    currentWorkspaceAppliedDisplayFilters,
    clearAllFilters,
    clearAllAppliedDisplayFilters,
    updateFilters,
    updateDisplayFilters,
  } = useProjectFilter();
  // derived values
  const pageTitle = currentWorkspace?.name
    ? `${currentWorkspace?.name} - ${t("workspace_projects.label", { count: 2 })}`
    : undefined;

  const isArchived = pathname.includes("/archives");
  const analyticsProjectIds = totalProjectIds?.join(",");

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
      <div className="flex min-h-full w-full flex-col bg-[#fffdf7]">
        <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
          {!isArchived && <ProjectStats isLoading={!totalProjectIds} projectIds={totalProjectIds ?? []} />}
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
          <ProjectCardList />
        </div>
      </div>
    </>
  );
});
