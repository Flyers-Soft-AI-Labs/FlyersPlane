/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// types
import type { TWorkspaceDraftIssue } from "@plane/types";
import { cn, renderFormattedPayloadDate, shouldHighlightIssueDueDate } from "@plane/utils";
// components
import { DateDropdown } from "@/components/dropdowns/date";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useProjectState } from "@/hooks/store/use-project-state";
// local imports
import {
  getPriorityTone,
  InlineAssigneeEditor,
  InlinePriorityEditor,
  InlineStatusEditor,
} from "../issue-layouts/spreadsheet/ticket-inline-editors";
import type { InlineMenuField } from "../issue-layouts/spreadsheet/ticket-inline-editors";

export interface IIssueProperties {
  issue: TWorkspaceDraftIssue;
  updateIssue:
    | ((projectId: string | null, issueId: string, data: Partial<TWorkspaceDraftIssue>) => Promise<void>)
    | undefined;
}

// Renders the Status / Priority / Assignee / Due date cells for a single draft row.
// No wrapping div here on purpose - DraftIssueBlock lays these cells out on a CSS
// grid, and CSS Grid placement follows the actual DOM parent (the row), not React
// component boundaries, so these can stay siblings of the row's other grid cells.
export const DraftIssueProperties = observer(function DraftIssueProperties(props: IIssueProperties) {
  const { issue, updateIssue } = props;
  // state
  const [activeMenu, setActiveMenu] = useState<InlineMenuField | null>(null);
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { fetchProjectStates, getProjectStateIds, getStateById } = useProjectState();
  const {
    project: { getProjectMemberIds, fetchProjectMembers },
    getUserDetails,
  } = useMember();

  const canEdit = !!updateIssue && !!issue.project_id;
  const stateDetails = getStateById(issue.state_id);
  const priorityTone = getPriorityTone(issue.priority);
  const PriorityToneIcon = priorityTone.icon;

  const projectStateIds = getProjectStateIds(issue.project_id);
  const projectStates = (projectStateIds ?? [])
    .map((stateId) => getStateById(stateId))
    .filter((state): state is NonNullable<typeof state> => !!state);

  const firstAssigneeId = issue.assignee_ids?.[0];
  const assignee = firstAssigneeId ? getUserDetails(firstAssigneeId) : undefined;
  const memberIds = issue.project_id ? (getProjectMemberIds(issue.project_id, true) ?? undefined) : undefined;

  const closeMenu = () => setActiveMenu(null);

  const handleUpdate = (data: Partial<TWorkspaceDraftIssue>) => {
    if (!canEdit || !issue.project_id || !updateIssue) return;
    void updateIssue(issue.project_id, issue.id, data);
  };

  const handleStatusMenuOpen = () => {
    if (!projectStates.length && workspaceSlug && issue.project_id) {
      void fetchProjectStates(workspaceSlug.toString(), issue.project_id);
    }
    setActiveMenu("status");
  };

  const handleAssigneeMenuOpen = () => {
    if (!memberIds?.length && workspaceSlug && issue.project_id) {
      void fetchProjectMembers(workspaceSlug.toString(), issue.project_id);
    }
    setActiveMenu("assignee");
  };

  if (!issue.project_id) return null;

  return (
    <>
      <InlineStatusEditor
        isOpen={activeMenu === "status"}
        disabled={!canEdit}
        selectedStateId={issue.state_id}
        states={projectStates}
        state={stateDetails}
        onOpen={handleStatusMenuOpen}
        onClose={closeMenu}
        onChange={(stateId) => {
          handleUpdate({ state_id: stateId });
          closeMenu();
        }}
      />

      <InlinePriorityEditor
        isOpen={activeMenu === "priority"}
        disabled={!canEdit}
        selectedPriority={issue.priority}
        priorityTone={priorityTone}
        PriorityToneIcon={PriorityToneIcon}
        onOpen={() => setActiveMenu("priority")}
        onClose={closeMenu}
        onChange={(priority) => {
          handleUpdate({ priority });
          closeMenu();
        }}
      />

      <InlineAssigneeEditor
        isOpen={activeMenu === "assignee"}
        assignee={assignee}
        disabled={!canEdit}
        getUserDetails={getUserDetails}
        selectedAssigneeId={firstAssigneeId}
        memberIds={memberIds}
        onOpen={handleAssigneeMenuOpen}
        onClose={closeMenu}
        onChange={(assigneeIds) => {
          handleUpdate({ assignee_ids: assigneeIds });
          closeMenu();
        }}
      />

      <div className="flex min-w-0 items-center" onClick={(e) => e.stopPropagation()}>
        <DateDropdown
          value={issue.target_date ?? null}
          onChange={(date) =>
            handleUpdate({ target_date: date ? (renderFormattedPayloadDate(date) ?? undefined) : undefined })
          }
          placeholder="Due date"
          disabled={!canEdit}
          buttonVariant={issue.target_date ? "transparent-with-text" : "transparent-without-text"}
          buttonClassName={cn(
            "text-13",
            shouldHighlightIssueDueDate(issue.target_date || null, stateDetails?.group) && "text-danger-primary"
          )}
          optionsClassName="z-10"
        />
      </div>
    </>
  );
});
