/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Fragment } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
// plane imports
import { EUserPermissionsLevel, EDraftIssuePaginationType } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import { EUserWorkspaceRoles } from "@plane/types";
// components
import { cn } from "@plane/utils";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { useWorkspaceDraftIssues } from "@/hooks/store/workspace-draft";
import { useWorkspaceIssueProperties } from "@/hooks/use-workspace-issue-properties";
// components
import { DRAFT_TICKET_COL_TEMPLATE, DraftIssueBlock } from "./draft-issue-block";
import { WorkspaceDraftEmptyState } from "./empty-state";
import { WorkspaceDraftIssuesLoader } from "./loader";

type TWorkspaceDraftIssuesRoot = {
  workspaceSlug: string;
};

// Column headers matching the Tickets table's column set/styling (all-tickets-page-view.tsx's
// TicketTableHeader) - Ticket / Status / Priority / Assignee / Due date, plus an unlabeled
// "Move to Tickets" column and an unlabeled actions column, using the same
// DRAFT_TICKET_COL_TEMPLATE grid as each DraftIssueBlock row so header and row cells line up.
function DraftTicketTableHeader() {
  return (
    <div
      className="flyers-soft-all-issues-table-header sticky top-0 z-[2] grid h-[52px] items-center border-b border-strong px-4 text-13 font-medium text-secondary"
      style={{ gridTemplateColumns: DRAFT_TICKET_COL_TEMPLATE }}
    >
      <div>Ticket</div>
      <div>Status</div>
      <div>Priority</div>
      <div>Assignee</div>
      <div>Due date</div>
      <div />
      <div />
    </div>
  );
}

export const WorkspaceDraftIssuesRoot = observer(function WorkspaceDraftIssuesRoot(props: TWorkspaceDraftIssuesRoot) {
  const { workspaceSlug } = props;
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { loader, paginationInfo, fetchIssues, issueIds } = useWorkspaceDraftIssues();
  const { workspaceProjectIds } = useProject();
  const { toggleCreateProjectModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const hasMemberLevelPermission = allowPermissions(
    [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  //swr hook for fetching issue properties
  useWorkspaceIssueProperties(workspaceSlug);

  // fetching issues
  const { isLoading } = useSWR(
    workspaceSlug ? `WORKSPACE_DRAFT_ISSUES_${workspaceSlug}` : null,
    workspaceSlug ? async () => await fetchIssues(workspaceSlug, "init-loader") : null,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  // handle nest issues
  const handleNextIssues = async () => {
    if (!paginationInfo?.next_page_results) return;
    await fetchIssues(workspaceSlug, "pagination", EDraftIssuePaginationType.NEXT);
  };

  if (isLoading) {
    return <WorkspaceDraftIssuesLoader items={14} />;
  }

  if (workspaceProjectIds?.length === 0)
    return (
      <EmptyStateDetailed
        title={t("workspace_projects.empty_state.no_projects.title")}
        description={t("workspace_projects.empty_state.no_projects.description")}
        assetKey="project"
        assetClassName="size-40"
        actions={[
          {
            label: t("workspace_projects.empty_state.no_projects.primary_button.text"),
            onClick: () => {
              toggleCreateProjectModal(true);
            },
            disabled: !hasMemberLevelPermission,
            variant: "primary",
          },
        ]}
      />
    );

  if (issueIds.length <= 0) return <WorkspaceDraftEmptyState />;

  return (
    <div className="flyers-soft-all-issues-view-body relative px-6 py-6">
      <div className="mb-5 min-w-0">
        <h1 className="tracking-normal truncate text-[30px] leading-9 font-semibold text-primary">Drafts</h1>
        <p className="mt-1 text-14 leading-5 text-secondary">Ideas and unfinished tickets saved for later</p>
      </div>

      <div className="flyers-soft-all-issues-table-card relative overflow-visible rounded-[10px] border border-strong bg-surface-1">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <DraftTicketTableHeader />

            <div className="relative">
              {issueIds.map((issueId: string) => (
                <DraftIssueBlock key={issueId} workspaceSlug={workspaceSlug} issueId={issueId} />
              ))}
            </div>
          </div>
        </div>

        {paginationInfo?.next_page_results && (
          <Fragment>
            {loader === "pagination" && issueIds.length >= 0 ? (
              <WorkspaceDraftIssuesLoader items={1} />
            ) : (
              <div
                className={cn("h-11 border-b border-subtle bg-surface-1 p-3 pl-6 text-13 font-medium transition-all", {
                  "cursor-pointer text-accent-primary underline-offset-2 hover:text-accent-secondary hover:underline":
                    paginationInfo?.next_page_results,
                })}
                onClick={handleNextIssues}
              >
                Load More &darr;
              </div>
            )}
          </Fragment>
        )}
      </div>
    </div>
  );
});
