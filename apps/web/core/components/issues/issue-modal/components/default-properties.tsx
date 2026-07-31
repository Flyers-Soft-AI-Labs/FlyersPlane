/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { useState } from "react";
import { observer } from "mobx-react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { ArrowUp, CalendarDays, User } from "lucide-react";
import { ETabIndices, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ParentPropertyIcon } from "@plane/propel/icons";
// types
import type { ISearchIssueResponse, TIssue } from "@plane/types";
// ui
import { CustomMenu, EModalWidth } from "@plane/ui";
import { cn, getDate, renderFormattedPayloadDate, getTabIndex } from "@plane/utils";
// components
import { CycleDropdown } from "@/components/dropdowns/cycle";
import { DateDropdown } from "@/components/dropdowns/date";
import { EstimateDropdown } from "@/components/dropdowns/estimate";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { ModuleDropdown } from "@/components/dropdowns/module/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
import { ParentIssuesListModal } from "@/components/issues/parent-issues-list-modal";
import { IssueLabelSelect } from "@/components/issues/select";
// helpers
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";

type TIssueDefaultPropertiesProps = {
  control: Control<TIssue>;
  id: string | undefined;
  projectId: string | null;
  workspaceSlug: string;
  selectedParentIssue: ISearchIssueResponse | null;
  startDate: string | null;
  targetDate: string | null;
  parentId: string | null;
  isDraft: boolean;
  handleFormChange: () => void;
  setSelectedParentIssue: (issue: ISearchIssueResponse) => void;
  layout?: "inline" | "grid";
};

type TIssueModalPropertyFieldProps = {
  children: ReactNode;
  className?: string;
  label: string;
  layout: "inline" | "grid";
};

const IssueModalPropertyField = (props: TIssueModalPropertyFieldProps) => {
  const { children, className, label, layout } = props;

  if (layout === "grid") {
    return (
      <div className={cn("flyers-soft-ticket-modal-field", className)}>
        <span className="flyers-soft-ticket-modal-field-label">{label}</span>
        <div className="flyers-soft-ticket-modal-field-control">{children}</div>
      </div>
    );
  }

  return <div className="h-7">{children}</div>;
};

export const IssueDefaultProperties = observer(function IssueDefaultProperties(props: TIssueDefaultPropertiesProps) {
  const {
    control,
    id,
    projectId,
    workspaceSlug,
    selectedParentIssue,
    startDate,
    targetDate,
    parentId,
    isDraft,
    handleFormChange,
    setSelectedParentIssue,
    layout = "inline",
  } = props;
  // states
  const [parentIssueListModalOpen, setParentIssueListModalOpen] = useState(false);
  // store hooks
  const { t } = useTranslation();
  const { areEstimateEnabledByProjectId } = useProjectEstimates();
  const { getProjectById } = useProject();
  const { isMobile } = usePlatformOS();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const projectDetails = getProjectById(projectId);

  const { getIndex } = getTabIndex(ETabIndices.ISSUE_FORM, isMobile);
  const isGridLayout = layout === "grid";
  const fieldButtonClassName = isGridLayout ? "flyers-soft-field-button" : undefined;
  const fieldTriggerClassName = isGridLayout ? "flyers-soft-field-trigger" : undefined;
  const fieldCaretClassName = isGridLayout ? "flyers-soft-field-caret" : undefined;

  const canCreateLabel =
    projectId && allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId);

  const minDate = getDate(startDate);
  minDate?.setDate(minDate.getDate());

  const maxDate = getDate(targetDate);
  maxDate?.setDate(maxDate.getDate());

  return (
    <div
      className={
        layout === "grid" ? "flyers-soft-ticket-modal-fields-grid" : "flex flex-wrap items-center gap-2"
      }
    >
      <Controller
        control={control}
        name="state_id"
        render={({ field: { value, onChange } }) => (
          <IssueModalPropertyField className="flyers-soft-ticket-field-state" label="Status" layout={layout}>
            <StateDropdown
              value={value}
              onChange={(stateId) => {
                onChange(stateId);
                handleFormChange();
              }}
              projectId={projectId ?? undefined}
              buttonVariant="border-with-text"
              buttonClassName={fieldButtonClassName}
              buttonContainerClassName={fieldTriggerClassName}
              tabIndex={getIndex("state_id")}
              isForWorkItemCreation={!id}
            />
          </IssueModalPropertyField>
        )}
      />
      <Controller
        control={control}
        name="priority"
        render={({ field: { value, onChange } }) => (
          <IssueModalPropertyField className="flyers-soft-ticket-field-priority" label="Priority" layout={layout}>
            <PriorityDropdown
              value={isGridLayout && value === "none" ? null : value}
              onChange={(priority) => {
                onChange(priority);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              buttonClassName={fieldButtonClassName}
              buttonContainerClassName={fieldTriggerClassName}
              dropdownArrow={isGridLayout}
              dropdownArrowClassName={fieldCaretClassName}
              emptyIcon={<ArrowUp className="flyers-soft-field-icon flyers-soft-field-icon-priority" />}
              placeholder="Select priority"
              tabIndex={getIndex("priority")}
            />
          </IssueModalPropertyField>
        )}
      />
      <Controller
        control={control}
        name="assignee_ids"
        render={({ field: { value, onChange } }) => (
          <IssueModalPropertyField className="flyers-soft-ticket-field-assignee" label="Assignee" layout={layout}>
            <MemberDropdown
              projectId={projectId ?? undefined}
              value={value}
              onChange={(assigneeIds) => {
                onChange(assigneeIds);
                handleFormChange();
              }}
              buttonVariant={isGridLayout ? "border-with-text" : value?.length > 0 ? "transparent-without-text" : "border-with-text"}
              buttonClassName={isGridLayout ? fieldButtonClassName : value?.length > 0 ? "hover:bg-transparent" : ""}
              buttonContainerClassName={fieldTriggerClassName}
              dropdownArrow={isGridLayout}
              dropdownArrowClassName={fieldCaretClassName}
              icon={User}
              placeholder={isGridLayout ? "Unassigned" : t("assignees")}
              showUserDetails={isGridLayout}
              multiple
              tabIndex={getIndex("assignee_ids")}
            />
          </IssueModalPropertyField>
        )}
      />
      <Controller
        control={control}
        name="label_ids"
        render={({ field: { value, onChange } }) => (
          <IssueModalPropertyField className="flyers-soft-ticket-field-labels" label="Labels" layout={layout}>
            <IssueLabelSelect
              value={value}
              onChange={(labelIds) => {
                onChange(labelIds);
                handleFormChange();
              }}
              projectId={projectId ?? undefined}
              buttonClassName={isGridLayout ? "flyers-soft-label-field-content" : undefined}
              buttonContainerClassName={isGridLayout ? "flyers-soft-field-trigger flyers-soft-label-field-trigger" : undefined}
              placeholder="Add labels"
              tabIndex={getIndex("label_ids")}
              createLabelEnabled={!!canCreateLabel}
            />
          </IssueModalPropertyField>
        )}
      />
      <Controller
        control={control}
        name="start_date"
        render={({ field: { value, onChange } }) => (
          <IssueModalPropertyField className="flyers-soft-ticket-field-start-date" label="Start date" layout={layout}>
            <DateDropdown
              value={value}
              onChange={(date) => {
                onChange(date ? renderFormattedPayloadDate(date) : null);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              buttonClassName={fieldButtonClassName}
              buttonContainerClassName={fieldTriggerClassName}
              icon={<CalendarDays className="flyers-soft-field-icon flyers-soft-field-icon-calendar" />}
              maxDate={maxDate ?? undefined}
              placeholder={t("start_date")}
              tabIndex={getIndex("start_date")}
            />
          </IssueModalPropertyField>
        )}
      />
      <Controller
        control={control}
        name="target_date"
        render={({ field: { value, onChange } }) => (
          <IssueModalPropertyField className="flyers-soft-ticket-field-due-date" label="Due date" layout={layout}>
            <DateDropdown
              value={value}
              onChange={(date) => {
                onChange(date ? renderFormattedPayloadDate(date) : null);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              buttonClassName={fieldButtonClassName}
              buttonContainerClassName={fieldTriggerClassName}
              icon={<CalendarDays className="flyers-soft-field-icon flyers-soft-field-icon-calendar" />}
              minDate={minDate ?? undefined}
              placeholder={isGridLayout ? "Select date" : t("due_date")}
              tabIndex={getIndex("target_date")}
            />
          </IssueModalPropertyField>
        )}
      />
      {projectDetails?.cycle_view && (
        <Controller
          control={control}
          name="cycle_id"
          render={({ field: { value, onChange } }) => (
            <IssueModalPropertyField className="flyers-soft-ticket-field-cycle" label="Cycle" layout={layout}>
              <CycleDropdown
                projectId={projectId ?? undefined}
                onChange={(cycleId) => {
                  onChange(cycleId);
                  handleFormChange();
                }}
                placeholder={t("cycle.label", { count: 1 })}
                value={value}
                buttonVariant="border-with-text"
                tabIndex={getIndex("cycle_id")}
              />
            </IssueModalPropertyField>
          )}
        />
      )}
      {projectDetails?.module_view && workspaceSlug && (
        <Controller
          control={control}
          name="module_ids"
          render={({ field: { value, onChange } }) => (
            <IssueModalPropertyField className="flyers-soft-ticket-field-module" label="Module" layout={layout}>
              <ModuleDropdown
                projectId={projectId ?? undefined}
                value={value ?? []}
                onChange={(moduleIds) => {
                  onChange(moduleIds);
                  handleFormChange();
                }}
                placeholder={t("modules")}
                buttonVariant="border-with-text"
                tabIndex={getIndex("module_ids")}
                multiple
                showCount
              />
            </IssueModalPropertyField>
          )}
        />
      )}
      {projectId && areEstimateEnabledByProjectId(projectId) && (
        <Controller
          control={control}
          name="estimate_point"
          render={({ field: { value, onChange } }) => (
            <IssueModalPropertyField className="flyers-soft-ticket-field-estimate" label="Estimate" layout={layout}>
              <EstimateDropdown
                value={value || undefined}
                onChange={(estimatePoint) => {
                  onChange(estimatePoint);
                  handleFormChange();
                }}
                projectId={projectId}
                buttonVariant="border-with-text"
                tabIndex={getIndex("estimate_point")}
                placeholder={t("estimate")}
              />
            </IssueModalPropertyField>
          )}
        />
      )}
      <IssueModalPropertyField className="flyers-soft-ticket-field-parent" label="Parent" layout={layout}>
        {parentId ? (
          <CustomMenu
            customButton={
              <button
                type="button"
                className="flex h-full cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-caption-sm-regular hover:bg-layer-1"
              >
                {selectedParentIssue?.project_id && (
                  <IssueIdentifier
                    projectId={selectedParentIssue.project_id}
                    issueTypeId={selectedParentIssue.type_id}
                    projectIdentifier={selectedParentIssue?.project__identifier}
                    issueSequenceId={selectedParentIssue.sequence_id}
                    size="xs"
                  />
                )}
              </button>
            }
            placement="bottom-start"
            className="h-full w-full"
            customButtonClassName="h-full"
            tabIndex={getIndex("parent_id")}
          >
            <>
              <CustomMenu.MenuItem className="!p-1" onClick={() => setParentIssueListModalOpen(true)}>
                {t("change_parent_issue")}
              </CustomMenu.MenuItem>
              <Controller
                control={control}
                name="parent_id"
                render={({ field: { onChange } }) => (
                  <CustomMenu.MenuItem
                    className="!p-1"
                    onClick={() => {
                      onChange(null);
                      handleFormChange();
                    }}
                  >
                    {t("remove_parent_issue")}
                  </CustomMenu.MenuItem>
                )}
              />
            </>
          </CustomMenu>
        ) : (
          <button
            type="button"
            className="flex h-full cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-caption-sm-regular hover:bg-layer-1"
            onClick={() => setParentIssueListModalOpen(true)}
          >
            <ParentPropertyIcon className="h-3 w-3 flex-shrink-0" />
            <span className="whitespace-nowrap">{t("add_parent")}</span>
          </button>
        )}
      </IssueModalPropertyField>
      <Controller
        control={control}
        name="parent_id"
        render={({ field: { onChange } }) => (
          <ParentIssuesListModal
            isOpen={parentIssueListModalOpen}
            handleClose={() => setParentIssueListModalOpen(false)}
            onChange={(issue) => {
              onChange(issue.id);
              handleFormChange();
              setSelectedParentIssue(issue);
            }}
            projectId={projectId ?? undefined}
            issueId={isDraft ? undefined : id}
            width={isGridLayout ? EModalWidth.LG : undefined}
          />
        )}
      />
    </div>
  );
});
