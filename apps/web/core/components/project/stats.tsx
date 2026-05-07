/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { BriefcaseBusiness, CheckCircle2, Clock3, LayoutGrid, type LucideIcon } from "lucide-react";
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
};

const PROJECT_STATS_SKELETON_KEYS = ["total-projects", "active-projects", "completed-projects", "on-hold-projects"];

function ProjectStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
      {PROJECT_STATS_SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="h-[92px] animate-pulse rounded-2xl border border-[#f1e4b8] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-[42px] w-[42px] rounded-xl bg-[#f4f0ff]" />
            <div className="flex flex-col gap-2">
              <div className="h-3 w-24 rounded bg-[#f3ead0]" />
              <div className="h-5 w-10 rounded bg-[#f3ead0]" />
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
    },
    {
      title: "Active Projects",
      value: activeProjects,
      icon: LayoutGrid,
      iconBoxClassName: "bg-[#e8fff4]",
      iconClassName: "text-[#10a66f]",
    },
    {
      title: "Completed",
      value: completedProjects,
      icon: CheckCircle2,
      iconBoxClassName: "bg-[#e9fbef]",
      iconClassName: "text-[#16a34a]",
    },
    {
      title: "On Hold",
      value: onHoldProjects,
      icon: Clock3,
      iconBoxClassName: "bg-[#fff0f4]",
      iconClassName: "text-[#e11d48]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
      {statCards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="group flex h-[92px] items-center gap-3.5 rounded-2xl border border-[#f1e4b8] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(255,193,7,0.22)]"
          >
            <div className={cn("grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl", card.iconBoxClassName)}>
              <Icon className={cn("h-5 w-5", card.iconClassName)} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-12 font-medium text-[#64748b]">{card.title}</p>
              <p className="text-xl mt-1 font-bold text-[#111827]">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
});
