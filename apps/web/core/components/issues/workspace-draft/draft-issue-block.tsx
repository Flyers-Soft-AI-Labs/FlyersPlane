/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useRef, useState } from "react";
import { omit } from "lodash-es";
import { observer } from "mobx-react";
import { MoreHorizontal, MoveRight, SquareStackIcon } from "lucide-react";
import { CopyIcon, EditIcon, TrashIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// plane utils
import { Tooltip } from "@plane/propel/tooltip";
import type { TWorkspaceDraftIssue } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import type { TContextMenuItem } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useWorkspaceDraftIssues } from "@/hooks/store/workspace-draft";
// plane-web imports
import { IssueTypeIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
// local imports
import { IdentifierText } from "../issue-detail/identifier-text";
import { CreateUpdateIssueModal } from "../issue-modal/modal";
import { WorkspaceDraftIssueDeleteIssueModal } from "./delete-modal";
import { DraftIssueProperties } from "./draft-issue-properties";
import { WorkspaceDraftIssueQuickActions } from "./quick-action";

// Same column set/widths as the Tickets table (all-tickets-page-view.tsx's
// COL_TEMPLATE), minus the checkbox/star/ticket-key/updated-at columns drafts
// don't have, plus a Due date column and a dedicated "Move to Tickets" column.
// root.tsx's header row uses this same template so header and row cells stay aligned.
export const DRAFT_TICKET_COL_TEMPLATE = "minmax(280px,1fr) 150px 140px 156px 130px 150px 48px";

type Props = {
  workspaceSlug: string;
  issueId: string;
};

export const DraftIssueBlock = observer(function DraftIssueBlock(props: Props) {
  // props
  const { workspaceSlug, issueId } = props;
  // states
  const [moveToIssue, setMoveToIssue] = useState(false);
  const [createUpdateIssueModal, setCreateUpdateIssueModal] = useState(false);
  const [issueToEdit, setIssueToEdit] = useState<TWorkspaceDraftIssue | undefined>(undefined);
  const [deleteIssueModal, setDeleteIssueModal] = useState(false);
  const [isMovingToTickets, setIsMovingToTickets] = useState(false);
  // hooks
  const { getIssueById, updateIssue, deleteIssue, moveIssue } = useWorkspaceDraftIssues();
  const { getProjectIdentifierById } = useProject();
  // ref
  const issueRef = useRef<HTMLDivElement | null>(null);
  // derived values
  const issue = getIssueById(issueId);
  const projectIdentifier = (issue && issue.project_id && getProjectIdentifierById(issue.project_id)) || undefined;
  if (!issue || !projectIdentifier) return null;

  const duplicateIssuePayload = omit(
    {
      ...issue,
      name: `${issue.name} (copy)`,
      is_draft: true,
    },
    ["id"]
  );

  const MENU_ITEMS: TContextMenuItem[] = [
    {
      key: "edit",
      title: "edit",
      icon: EditIcon,
      action: () => {
        setIssueToEdit(issue);
        setCreateUpdateIssueModal(true);
      },
    },
    {
      key: "make-a-copy",
      title: "make_a_copy",
      icon: CopyIcon,
      action: () => {
        setCreateUpdateIssueModal(true);
      },
    },
    {
      key: "move-to-issues",
      title: "move_to_project",
      icon: SquareStackIcon,
      action: () => {
        setMoveToIssue(true);
        setIssueToEdit(issue);
        setCreateUpdateIssueModal(true);
      },
    },
    {
      key: "delete",
      title: "delete",
      icon: TrashIcon,
      action: () => {
        setDeleteIssueModal(true);
      },
    },
  ];

  // Same underlying store action as the "Move to project" menu item above (and the
  // "Add to project" button inside the edit modal's moveToIssue flow) - this just gives
  // it a one-click, always-visible entry point on the row instead of requiring the
  // "⋯" menu -> modal -> "Add to project" detour.
  const handleMoveToTickets = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isMovingToTickets) return;
    setIsMovingToTickets(true);
    try {
      await moveIssue(workspaceSlug, issue.id, issue);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Failed to move work item to project. Please try again.",
      });
    } finally {
      setIsMovingToTickets(false);
    }
  };

  const actionsTrigger = (
    <span className="grid size-7 place-items-center rounded-lg text-tertiary transition hover:bg-surface-3 hover:text-primary">
      <MoreHorizontal className="size-4" />
    </span>
  );

  return (
    <>
      <WorkspaceDraftIssueDeleteIssueModal
        data={issue}
        isOpen={deleteIssueModal}
        handleClose={() => setDeleteIssueModal(false)}
        onSubmit={async () => deleteIssue(workspaceSlug, issueId)}
      />
      <CreateUpdateIssueModal
        isOpen={createUpdateIssueModal}
        onClose={() => {
          setCreateUpdateIssueModal(false);
          setIssueToEdit(undefined);
          setMoveToIssue(false);
        }}
        data={issueToEdit ?? duplicateIssuePayload}
        onSubmit={async (data) => {
          if (issueToEdit) await updateIssue(workspaceSlug, issueId, data);
        }}
        storeType={EIssuesStoreType.WORKSPACE_DRAFT}
        fetchIssueDetails={false}
        moveToIssue={moveToIssue}
        isDraft
      />
      <div
        ref={issueRef}
        id={`issue-${issue.id}`}
        className="flyers-soft-all-issues-ticket-row grid h-[52px] cursor-pointer items-center border-b border-strong px-4 text-13 text-primary transition last:border-b-0 hover:bg-canvas"
        style={{ gridTemplateColumns: DRAFT_TICKET_COL_TEMPLATE }}
        onDoubleClick={() => {
          setIssueToEdit(issue);
          setCreateUpdateIssueModal(true);
        }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {issue.type_id && <IssueTypeIdentifier issueTypeId={issue.type_id} />}
          <IdentifierText identifier={projectIdentifier} enableClickToCopyIdentifier size="xs" variant="tertiary" />
          <Tooltip tooltipContent={issue.name} position="top-start" renderByDefault={false}>
            <p className="flyers-soft-ticket-title-cell min-w-0 truncate text-13 font-medium text-primary">
              {issue.name}
            </p>
          </Tooltip>
        </div>

        <DraftIssueProperties
          issue={issue}
          updateIssue={async (projectId, issueId, data) => {
            await updateIssue(workspaceSlug, issueId, data);
          }}
        />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleMoveToTickets}
            disabled={isMovingToTickets}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border border-strong bg-surface-1 px-2.5 text-12 font-medium text-secondary transition hover:bg-canvas hover:text-primary",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <MoveRight className="size-3.5 flex-shrink-0" />
            {isMovingToTickets ? "Moving…" : "Move to Ticket"}
          </button>
        </div>

        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <WorkspaceDraftIssueQuickActions
            parentRef={issueRef}
            MENU_ITEMS={MENU_ITEMS}
            customActionButton={actionsTrigger}
          />
        </div>
      </div>
    </>
  );
});
