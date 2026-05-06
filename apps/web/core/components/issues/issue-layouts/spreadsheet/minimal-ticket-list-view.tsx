/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { MutableRefObject } from "react";
import { useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useOutsideClickDetector } from "@plane/hooks";
import { ChevronRightIcon, PriorityIcon } from "@plane/propel/icons";
import type { TIssue } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { Avatar } from "@plane/ui";
import { cn, generateWorkItemLink, getFileURL } from "@plane/utils";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
import type { TRenderQuickActions } from "../list/list-view-types";

// ─── List container ───────────────────────────────────────────────────────────

interface MinimalTicketListViewProps {
  issueIds: string[];
  quickActions: TRenderQuickActions;
  updateIssue: ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>) | undefined;
  canEditProperties: (projectId: string | undefined) => boolean;
  canLoadMoreIssues: boolean;
  loadMoreIssues: () => void;
}

export const MinimalTicketListView = observer(function MinimalTicketListView(props: MinimalTicketListViewProps) {
  const { issueIds, quickActions, updateIssue, canEditProperties, canLoadMoreIssues, loadMoreIssues } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  useIntersectionObserver(containerRef, canLoadMoreIssues ? sentinelEl : null, loadMoreIssues, "100% 0% 100% 0%");

  return (
    <div ref={containerRef} className="flyers-soft-all-issues-view-body flex h-full w-full flex-col overflow-y-auto">
      <div ref={portalRef} className="spreadsheet-menu-portal" />

      {/* ticket rows */}
      <div className="flex flex-col">
        {issueIds.map((id) => (
          <MinimalTicketRow
            key={id}
            issueId={id}
            quickActions={quickActions}
            updateIssue={updateIssue}
            canEditProperties={canEditProperties}
            portalRef={portalRef}
          />
        ))}
      </div>

      {/* infinite scroll sentinel */}
      {canLoadMoreIssues && (
        <div ref={setSentinelEl} className="space-y-px px-4 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-surface-2" />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Individual row ───────────────────────────────────────────────────────────

interface MinimalTicketRowProps {
  issueId: string;
  quickActions: TRenderQuickActions;
  updateIssue: ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>) | undefined;
  canEditProperties: (projectId: string | undefined) => boolean;
  portalRef: MutableRefObject<HTMLDivElement | null>;
  nestingLevel?: number;
  spacingLeft?: number;
}

const MinimalTicketRow = observer(function MinimalTicketRow(props: MinimalTicketRowProps) {
  const { issueId, quickActions, canEditProperties, portalRef, nestingLevel = 0, spacingLeft = 0, updateIssue } = props;

  const [isExpanded, setExpanded] = useState(false);
  const [isMenuActive, setIsMenuActive] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { workspaceSlug } = useParams();
  const { getProjectIdentifierById } = useProject();
  const { getStateById } = useProjectState();
  const memberStore = useMember();
  const { handleRedirection } = useIssuePeekOverviewRedirection(false);
  const { isMobile } = usePlatformOS();
  const { issue, subIssues: subIssuesStore, getIsIssuePeeked, peekIssue } = useIssueDetail(EIssueServiceType.ISSUES);

  useOutsideClickDetector(menuRef, () => setIsMenuActive(false));

  const issueDetail = issue.getIssueById(issueId);
  if (!issueDetail) return null;

  const state = getStateById(issueDetail.state_id);
  const projectIdentifier = getProjectIdentifierById(issueDetail.project_id);
  const ticketKey =
    projectIdentifier && issueDetail.sequence_id ? `${projectIdentifier}-${issueDetail.sequence_id}` : undefined;
  const subIssues = subIssuesStore.subIssuesByIssueId(issueId);
  const subIssuesCount = issueDetail.sub_issues_count ?? 0;
  const disableUserActions = !canEditProperties(issueDetail.project_id ?? undefined);
  const isPeeked = getIsIssuePeeked(issueDetail.id) && nestingLevel === peekIssue?.nestingLevel;

  // First assignee only for the avatar
  const firstAssigneeId = issueDetail.assignee_ids?.[0];
  const assignee = firstAssigneeId ? memberStore.getUserDetails(firstAssigneeId) : undefined;

  const handleIssuePeekOverview = () =>
    handleRedirection(workspaceSlug?.toString(), issueDetail, isMobile, nestingLevel);

  const handleToggleExpand = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (nestingLevel >= 3) {
      handleIssuePeekOverview();
    } else {
      setExpanded((prev) => {
        if (!prev && workspaceSlug && issueDetail.project_id)
          subIssuesStore.fetchSubIssues(workspaceSlug.toString(), issueDetail.project_id, issueDetail.id);
        return !prev;
      });
    }
  };

  const customActionButton = (
    <div
      ref={menuRef}
      className={cn(
        "flex size-6 cursor-pointer items-center justify-center rounded text-tertiary hover:bg-surface-2 hover:text-secondary",
        { "bg-surface-2 text-secondary": isMenuActive }
      )}
      onClick={() => setIsMenuActive((v) => !v)}
    >
      <MoreHorizontal className="size-3.5" />
    </div>
  );

  return (
    <>
      {/* Row — plain div, no table, no ControlLink dark states */}
      <div
        ref={rowRef}
        role="button"
        tabIndex={0}
        data-active={isPeeked ? "true" : undefined}
        data-selected={isPeeked ? "true" : undefined}
        onClick={handleIssuePeekOverview}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleIssuePeekOverview();
          }
        }}
        className={cn(
          "flyers-soft-all-issues-ticket-row group relative flex h-12 w-full cursor-pointer select-none items-center gap-3 border-b border-subtle px-4 outline-none transition-colors duration-100",
          // very light warm hover — no black
          "hover:bg-surface-2",
          // peeked: a subtle left accent + slightly warmer bg
          isPeeked ? "flyers-soft-all-issues-ticket-row-active bg-surface-2" : "bg-transparent",
          nestingLevel > 0 && "pl-0"
        )}
        style={nestingLevel > 0 ? { paddingLeft: `${16 + spacingLeft}px` } : undefined}
      >
        {/* peeked indicator: 2px left border accent */}
        {isPeeked && (
          <span className="absolute left-0 top-0 h-full w-0.5 rounded-r bg-accent-strong" aria-hidden />
        )}

        {/* sub-issue expand chevron */}
        <div className="grid size-4 flex-shrink-0 place-items-center">
          {subIssuesCount > 0 && (
            <button
              type="button"
              className="grid size-4 cursor-pointer place-items-center rounded text-placeholder hover:text-tertiary"
              onClick={handleToggleExpand}
            >
              <ChevronRightIcon
                className={cn("size-3.5 transition-transform", { "rotate-90": isExpanded })}
                strokeWidth={2.5}
              />
            </button>
          )}
        </div>

        {/* ticket ID — monospace, muted */}
        {ticketKey && (
          <span className="w-14 flex-shrink-0 font-mono text-xs font-medium text-tertiary">{ticketKey}</span>
        )}

        {/* title — flex-1, dark readable text */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{issueDetail.name}</span>

        {/* right cluster: state · priority · assignee · menu */}
        <div className="flex flex-shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {/* state — subtle pill: dot + name */}
          {state && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-subtle bg-surface-2 px-2.5 py-0.5 text-xs text-secondary">
              <span className="size-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: state.color }} />
              {state.name}
            </span>
          )}

          {/* priority — icon only, theme-colored */}
          <PriorityIcon
            priority={issueDetail.priority ?? "none"}
            size={14}
            className="flex-shrink-0 opacity-70"
          />

          {/* assignee avatar */}
          {assignee ? (
            <Avatar
              name={assignee.display_name}
              src={getFileURL(assignee.avatar_url ?? "")}
              size="sm"
              className="flex-shrink-0"
            />
          ) : (
            <div className="size-5 flex-shrink-0 rounded-full border border-dashed border-tertiary" />
          )}

          {/* three-dot menu — visible on hover */}
          <div
            className={cn("opacity-0 transition-opacity group-hover:opacity-100", {
              "opacity-100": isMenuActive,
            })}
          >
            {quickActions({
              issue: issueDetail,
              parentRef: rowRef,
              customActionButton,
              portalElement: portalRef.current,
            })}
          </div>
        </div>
      </div>

      {/* sub-issues (expanded) */}
      {isExpanded &&
        subIssues?.map((subIssueId: string) => (
          <MinimalTicketRow
            key={subIssueId}
            issueId={subIssueId}
            quickActions={quickActions}
            updateIssue={updateIssue}
            canEditProperties={canEditProperties}
            portalRef={portalRef}
            nestingLevel={nestingLevel + 1}
            spacingLeft={spacingLeft + 12}
          />
        ))}
    </>
  );
});
