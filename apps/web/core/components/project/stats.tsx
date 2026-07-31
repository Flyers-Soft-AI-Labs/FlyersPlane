/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { BriefcaseBusiness, CheckCircle2, FolderKanban, PauseCircle, type LucideIcon } from "lucide-react";
import { observer } from "mobx-react";
import { cn } from "@plane/utils";
// hooks
import { useProject } from "@/hooks/store/use-project";

type TProjectStatsProps = {
  isLoading: boolean;
  projectIds: string[];
};

type TStatCard = {
  title: string;
  value: number;
  icon: LucideIcon;
  iconClassName: string;
  iconBoxClassName: string;
  helperText: string;
};

const PROJECT_STATS_SKELETON_KEYS = ["total-projects", "active-projects", "completed-projects", "on-hold-projects"];

function ProjectStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
      {PROJECT_STATS_SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="h-[108px] animate-pulse rounded-xl border border-[#edf0f5] bg-surface-1 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
        >
          <div className="flex h-full items-center gap-4">
            <div className="size-12 rounded-xl bg-[#eef2ff]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-3 w-28 rounded bg-[#eef2f7]" />
              <div className="h-6 w-12 rounded bg-[#e8edf5]" />
              <div className="h-3 w-32 rounded bg-[#f2f5f9]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const ProjectStats = observer(function ProjectStats(props: TProjectStatsProps) {
  const { isLoading, projectIds } = props;
  const { getProjectAnalyticsCountById, getProjectById } = useProject();

  if (isLoading) return <ProjectStatsSkeleton />;

  const projects = projectIds.map((projectId) => getProjectById(projectId)).filter(Boolean);
  const completedProjects = projects.filter((project) => {
    const analytics = getProjectAnalyticsCountById(project?.id);
    const totalIssues = analytics?.total_issues ?? 0;
    const completedIssues = analytics?.completed_issues ?? 0;

    return !project?.archived_at && totalIssues > 0 && completedIssues >= totalIssues;
  }).length;
  const onHoldProjects = projects.filter((project) => !!project?.archived_at).length;
  const activeProjects = projects.filter((project) => {
    if (project?.archived_at) return false;

    const analytics = getProjectAnalyticsCountById(project?.id);
    const totalIssues = analytics?.total_issues ?? 0;
    const completedIssues = analytics?.completed_issues ?? 0;

    return totalIssues === 0 || completedIssues < totalIssues;
  }).length;

  const statCards: TStatCard[] = [
    {
      title: "Total Projects",
      value: projects.length,
      icon: BriefcaseBusiness,
      iconBoxClassName: "bg-[#eef2ff]",
      iconClassName: "text-[#3b82f6]",
      helperText: "All projects in workspace",
    },
    {
      title: "Active Projects",
      value: activeProjects,
      icon: FolderKanban,
      iconBoxClassName: "bg-[#e9fbf3]",
      iconClassName: "text-[#10a66f]",
      helperText: "Open or in progress",
    },
    {
      title: "Completed",
      value: completedProjects,
      icon: CheckCircle2,
      iconBoxClassName: "bg-[#e9fbef]",
      iconClassName: "text-tertiary",
      helperText: "All tracked tickets done",
    },
    {
      title: "On Hold",
      value: onHoldProjects,
      icon: PauseCircle,
      iconBoxClassName: "bg-[#fff0f3]",
      iconClassName: "text-[#e5485d]",
      helperText: "Archived projects",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
      {statCards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="group flex min-h-[108px] items-center gap-4 rounded-xl border border-[#edf0f5] bg-surface-1 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]"
          >
            <div
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-[1.03]",
                card.iconBoxClassName
              )}
            >
              <Icon className={cn("size-5", card.iconClassName)} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-13 font-medium text-[#64748b]">{card.title}</p>
              <p className="text-2xl mt-1 leading-none font-semibold text-primary">{card.value}</p>
              <p className="mt-2 truncate text-11 font-medium text-[#8a94a6]">{card.helperText}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
});
