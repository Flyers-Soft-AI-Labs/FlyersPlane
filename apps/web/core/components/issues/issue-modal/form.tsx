/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Ticket, Users, X } from "lucide-react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
// editor
import { ETabIndices, DEFAULT_WORK_ITEM_FORM_VALUES } from "@plane/constants";
import type { EditorRefApi } from "@plane/editor";
// i18n
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssue, TWorkspaceDraftIssue } from "@plane/types";
// hooks
import { ToggleSwitch } from "@plane/ui";
import {
  convertWorkItemDataToSearchResponse,
  getUpdateFormDataForReset,
  cn,
  getTextContent,
  getChangedIssuefields,
  getTabIndex,
  renderFormattedPayloadDate,
} from "@plane/utils";
// components
import {
  IssueDefaultProperties,
  IssueDescriptionEditor,
  IssueParentTag,
  IssueProjectSelect,
  IssueTitleInput,
} from "@/components/issues/issue-modal/components";
import { VoiceTicketModal } from "@/components/issues/issue-modal/components/voice";
// helpers
// hooks
import { useIssueModal } from "@/hooks/context/use-issue-modal";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useLabel } from "@/hooks/store/use-label";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useWorkspaceDraftIssues } from "@/hooks/store/workspace-draft";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useProjectIssueProperties } from "@/hooks/use-project-issue-properties";
import type { TVoiceTicketFields } from "@/services/voice-ticket.service";
// plane web imports
import { DeDupeButtonRoot } from "@/plane-web/components/de-dupe/de-dupe-button";
import { DuplicateModalRoot } from "@/plane-web/components/de-dupe/duplicate-modal";
import { IssueTypeSelect, WorkItemTemplateSelect } from "@/plane-web/components/issues/issue-modal";
import { WorkItemModalAdditionalProperties } from "@/plane-web/components/issues/issue-modal/modal-additional-properties";
import { useDebouncedDuplicateIssues } from "@/plane-web/hooks/use-debounced-duplicate-issues";

export interface IssueFormProps {
  data?: Partial<TIssue>;
  issueTitleRef: React.MutableRefObject<HTMLInputElement | null>;
  isCreateMoreToggleEnabled: boolean;
  onAssetUpload: (assetId: string) => void;
  onCreateMoreToggleChange: (value: boolean) => void;
  onChange?: (formData: Partial<TIssue> | null) => void;
  onClose: () => void;
  onSubmit: (values: Partial<TIssue>, is_draft_issue?: boolean) => Promise<void>;
  projectId: string;
  isDraft: boolean;
  moveToIssue?: boolean;
  modalTitle?: string;
  primaryButtonText?: {
    default: string;
    loading: string;
  };
  isDuplicateModalOpen: boolean;
  handleDuplicateIssueModal: (isOpen: boolean) => void;
  handleDraftAndClose?: () => void;
  isProjectSelectionDisabled?: boolean;
  showActionButtons?: boolean;
  dataResetProperties?: any[];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainTextToDescriptionHtml = (value: string) => {
  const blocks = value
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return "<p></p>";

  return blocks.map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`).join("");
};

// normalizes a name for fuzzy matching against store records whose naming
// (casing, spacing, "To Do" vs "Todo") won't exactly match what the LLM returns
const normalizeForMatch = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "");

const arraysHaveSameItems = (a: string[] | null | undefined, b: string[] | null | undefined) => {
  if (!a || !b || a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

const fuzzyFind = <T,>(items: T[], getName: (item: T) => string | undefined, needle: string): T | undefined => {
  const normalizedNeedle = normalizeForMatch(needle);
  if (!normalizedNeedle) return undefined;
  return (
    items.find((item) => normalizeForMatch(getName(item) ?? "") === normalizedNeedle) ??
    items.find((item) => normalizeForMatch(getName(item) ?? "").includes(normalizedNeedle)) ??
    items.find((item) => normalizedNeedle.includes(normalizeForMatch(getName(item) ?? "")))
  );
};

// Assignee auto-selection must never guess: at each match tier (exact, then partial), if more
// than one member matches, the name is ambiguous and we stop instead of falling through to a
// looser tier or picking the first hit. Only a single unambiguous match is auto-applied.
const findUniqueAssigneeMatch = <T,>(
  items: T[],
  getName: (item: T) => string | undefined,
  needle: string
): T | undefined => {
  const normalizedNeedle = normalizeForMatch(needle);
  if (!normalizedNeedle) return undefined;

  const exactMatches = items.filter((item) => normalizeForMatch(getName(item) ?? "") === normalizedNeedle);
  if (exactMatches.length > 0) return exactMatches.length === 1 ? exactMatches[0] : undefined;

  const partialMatches = items.filter((item) => normalizeForMatch(getName(item) ?? "").includes(normalizedNeedle));
  if (partialMatches.length > 0) return partialMatches.length === 1 ? partialMatches[0] : undefined;

  const inclusionMatches = items.filter((item) => normalizedNeedle.includes(normalizeForMatch(getName(item) ?? "")));
  return inclusionMatches.length === 1 ? inclusionMatches[0] : undefined;
};

export const IssueFormRoot = observer(function IssueFormRoot(props: IssueFormProps) {
  const { t } = useTranslation();
  const {
    data,
    issueTitleRef,
    onAssetUpload,
    onChange,
    onClose,
    onSubmit,
    projectId: defaultProjectId,
    isCreateMoreToggleEnabled,
    onCreateMoreToggleChange,
    isDraft,
    moveToIssue = false,
    modalTitle = `${data?.id ? t("update") : isDraft ? t("create_a_draft") : t("create_new_issue")}`,
    primaryButtonText = {
      default: `${data?.id ? t("update") : isDraft ? t("save_to_drafts") : t("save")}`,
      loading: `${data?.id ? t("updating") : t("saving")}`,
    },
    isDuplicateModalOpen,
    handleDuplicateIssueModal,
    handleDraftAndClose,
    isProjectSelectionDisabled = false,
    showActionButtons = true,
    dataResetProperties = [],
  } = props;

  // states
  const [gptAssistantModal, setGptAssistantModal] = useState(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [voiceTitleSuggestion, setVoiceTitleSuggestion] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // refs
  // Tracks the last value voice autofill itself wrote to each field, so a later
  // recording/regenerate can tell "the AI filled this and the user hasn't touched
  // it since" (safe to overwrite) apart from "the user actually typed this" (must
  // preserve). Without this, the first voice pass "claims" a field merely by being
  // non-empty, and no later pass (even a deliberate regenerate) can ever fix it.
  const aiOwnedValuesRef = useRef<{
    name: string | null;
    description_html: string | null;
    priority: TIssue["priority"] | null;
    target_date: string | null;
    start_date: string | null;
    assignee_ids: string[] | null;
    label_ids: string[] | null;
    state_id: string | null;
  }>({
    name: null,
    description_html: null,
    priority: null,
    target_date: null,
    start_date: null,
    assignee_ids: null,
    label_ids: null,
    state_id: null,
  });
  const editorRef = useRef<EditorRefApi>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // router
  const { workspaceSlug, projectId: routeProjectId } = useParams();

  // store hooks
  const { getProjectById } = useProject();
  const {
    workItemTemplateId,
    isApplyingTemplate,
    selectedParentIssue,
    setWorkItemTemplateId,
    setSelectedParentIssue,
    getIssueTypeIdOnProjectChange,
    getActiveAdditionalPropertiesLength,
    handlePropertyValuesValidation,
    handleCreateUpdatePropertyValues,
    handleTemplateChange,
    voiceTicket,
  } = useIssueModal();
  const { isMobile } = usePlatformOS();
  const { moveIssue } = useWorkspaceDraftIssues();

  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const { fetchCycles } = useProjectIssueProperties();
  const { getStateById, getProjectStates } = useProjectState();
  const { getProjectLabels } = useLabel();
  const {
    project: { getProjectMemberIds },
    getUserDetails,
  } = useMember();

  const isVoiceProcessing = voiceTicket.state === "processing";

  // form info
  const methods = useForm<TIssue>({
    defaultValues: { ...DEFAULT_WORK_ITEM_FORM_VALUES, project_id: defaultProjectId, ...data },
    reValidateMode: "onChange",
  });
  const {
    formState,
    formState: { isDirty, isSubmitting, dirtyFields },
    handleSubmit,
    reset,
    watch,
    control,
    getValues,
    setValue,
  } = methods;

  const projectId = watch("project_id");
  const activeAdditionalPropertiesLength = getActiveAdditionalPropertiesLength({
    projectId: projectId,
    workspaceSlug: workspaceSlug?.toString(),
    watch: watch,
  });

  // derived values
  const projectDetails = projectId ? getProjectById(projectId) : undefined;
  const isDisabled = isSubmitting || isApplyingTemplate;

  const { getIndex } = getTabIndex(ETabIndices.ISSUE_FORM, isMobile);

  //reset few fields on projectId change
  useEffect(() => {
    if (isDirty) {
      if (workItemTemplateId) {
        // reset work item template id
        setWorkItemTemplateId(null);
        reset({ ...DEFAULT_WORK_ITEM_FORM_VALUES, project_id: projectId });
        editorRef.current?.clearEditor();
      } else {
        reset(getUpdateFormDataForReset(projectId, getValues()));
      }
    }
    if (projectId && routeProjectId !== projectId) fetchCycles(workspaceSlug?.toString(), projectId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Reset form when data prop changes
  useEffect(() => {
    if (data) {
      reset({ ...DEFAULT_WORK_ITEM_FORM_VALUES, project_id: projectId, ...data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dataResetProperties]);

  // Update the issue type id when the project id changes
  useEffect(() => {
    const issueTypeId = watch("type_id");

    // if issue type id is present or project not available, return
    if (issueTypeId || !projectId) return;

    // get issue type id on project change
    const issueTypeIdOnProjectChange = getIssueTypeIdOnProjectChange(projectId);
    if (issueTypeIdOnProjectChange) setValue("type_id", issueTypeIdOnProjectChange, { shouldValidate: true });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, projectId]);

  useEffect(() => {
    if (workItemTemplateId && editorRef.current) {
      handleTemplateChange({
        workspaceSlug: workspaceSlug?.toString(),
        reset,
        editorRef,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workItemTemplateId]);

  const handleFormSubmit = async (formData: Partial<TIssue>, is_draft_issue = false) => {
    // Check if the editor is ready to discard
    if (!editorRef.current?.isEditorReadyToDiscard()) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: t("editor_is_not_ready_to_discard_changes"),
      });
      return;
    }

    // check for required properties validation
    if (
      !handlePropertyValuesValidation({
        projectId: projectId,
        workspaceSlug: workspaceSlug?.toString(),
        watch: watch,
      })
    )
      return;

    // TEMPORARY debug logging - remove once date persistence from this modal is confirmed fixed.
    // Confirms whether the DateDropdown -> Controller.field.onChange chain is actually reaching
    // react-hook-form's tracked state for this specific modal instance, and whether dirtyFields
    // is (or isn't) flagging start_date/target_date by the time we get here.
    if (data?.id) {
      console.log("[draft-edit-modal] submit debug", {
        issueId: data.id,
        "data.start_date (original)": data.start_date,
        "data.target_date (original)": data.target_date,
        "formData.start_date (handleSubmit payload)": formData.start_date,
        "formData.target_date (handleSubmit payload)": formData.target_date,
        "getValues start_date (live)": getValues<"start_date">("start_date"),
        "getValues target_date (live)": getValues<"target_date">("target_date"),
        "dirtyFields.start_date": dirtyFields.start_date,
        "dirtyFields.target_date": dirtyFields.target_date,
        isDirty,
      });
    }

    const submitData = !data?.id
      ? formData
      : {
          ...getChangedIssuefields(formData, dirtyFields as { [key: string]: boolean | undefined }),
          project_id: getValues<"project_id">("project_id"),
          id: data.id,
          description_html: formData.description_html ?? "<p></p>",
          type_id: getValues<"type_id">("type_id"),
          // start_date/target_date go through DateDropdown -> Controller.field.onChange like every
          // other field, but on this edit path react-hook-form's dirtyFields doesn't reliably end up
          // flagging them, so getChangedIssuefields() silently drops date edits. Read them straight
          // off the live form state instead - the same unconditional getValues() pattern already
          // used (and confirmed working) for project_id/type_id above - rather than trusting
          // dirtyFields bookkeeping for these two fields.
          start_date: getValues<"start_date">("start_date"),
          target_date: getValues<"target_date">("target_date"),
        };

    // this condition helps to move the issues from draft to project issues
    if (formData.hasOwnProperty("is_draft")) submitData.is_draft = formData.is_draft;

    await onSubmit(submitData, is_draft_issue)
      .then(() => {
        setGptAssistantModal(false);
        if (isCreateMoreToggleEnabled && workItemTemplateId) {
          handleTemplateChange({
            workspaceSlug: workspaceSlug?.toString(),
            reset,
            editorRef,
          });
        } else {
          reset({
            ...DEFAULT_WORK_ITEM_FORM_VALUES,
            ...(isCreateMoreToggleEnabled ? { ...data } : {}),
            project_id: getValues<"project_id">("project_id"),
            type_id: getValues<"type_id">("type_id"),
            description_html: data?.description_html ?? "<p></p>",
          });
          editorRef?.current?.clearEditor();
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleMoveToProjects = async () => {
    if (!data?.id || !data?.project_id || !data) return;
    setIsMoving(true);
    try {
      await handleCreateUpdatePropertyValues({
        issueId: data.id,
        issueTypeId: data.type_id,
        projectId: data.project_id,
        workspaceSlug: workspaceSlug?.toString(),
        isDraft: true,
      });

      await moveIssue(workspaceSlug.toString(), data.id, {
        ...data,
        ...getValues(),
      } as TWorkspaceDraftIssue);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Failed to move work item to project. Please try again.",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const condition =
    (watch("name") && watch("name") !== "") || (watch("description_html") && watch("description_html") !== "<p></p>");

  const handleFormChange = () => {
    if (!onChange) return;

    if (isDirty && condition) onChange(watch());
    else onChange(null);
  };

  // debounced duplicate issues swr
  const { duplicateIssues } = useDebouncedDuplicateIssues(
    workspaceSlug?.toString(),
    projectDetails?.workspace.toString(),
    projectId ?? undefined,
    {
      name: watch("name"),
      description_html: getTextContent(watch("description_html")),
      issueId: data?.id,
    }
  );

  // executing this useEffect when the parent_id coming from the component prop
  useEffect(() => {
    const parentId = watch("parent_id") || undefined;
    if (!parentId) return;
    if (parentId === selectedParentIssue?.id || selectedParentIssue) return;

    const issue = getIssueById(parentId);
    if (!issue) return;

    const projectDetails = getProjectById(issue.project_id);
    if (!projectDetails) return;

    const stateDetails = getStateById(issue.state_id);

    setSelectedParentIssue(
      convertWorkItemDataToSearchResponse(workspaceSlug?.toString(), issue, projectDetails, stateDetails)
    );
  }, [watch, getIssueById, getProjectById, selectedParentIssue, getStateById]);

  // executing this useEffect when isDirty changes
  useEffect(() => {
    if (!onChange) return;

    if (isDirty && condition) onChange(watch());
    else onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    const formElement = formRef?.current;
    const modalElement = modalContainerRef?.current;

    if (!formElement || !modalElement) return;

    const resizeObserver = new ResizeObserver(() => {
      modalElement.style.maxHeight = `${formElement?.offsetHeight}px`;
    });

    resizeObserver.observe(formElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [formRef, modalContainerRef]);

  // TODO: Remove this after the de-dupe feature is implemented

  const shouldRenderDuplicateModal = isDuplicateModalOpen && duplicateIssues?.length > 0;
  const shouldUseCreateTicketLayout = !data?.id && !isDraft && !moveToIssue;

  const handleSafeClose = () => {
    if (editorRef.current?.isEditorReadyToDiscard()) {
      onClose();
    } else {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Editor is still processing changes. Please wait before proceeding.",
      });
    }
  };

  const handleTemplateModalClose = () => {
    if (handleDraftAndClose) {
      handleDraftAndClose();
    } else {
      onClose();
    }
  };

  const applyVoiceTicketResult = (result: TVoiceTicketFields) => {
    const aiOwned = aiOwnedValuesRef.current;
    let titleSuggestion: string | null = null;

    const suggestedTitle = result.title?.trim();
    const currentTitle = getValues("name")?.trim() ?? "";
    const titleIsAiOwned = !currentTitle || currentTitle === aiOwned.name;
    if (suggestedTitle) {
      if (titleIsAiOwned) {
        setValue("name", suggestedTitle, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        aiOwned.name = suggestedTitle;
      } else if (currentTitle !== suggestedTitle) {
        titleSuggestion = suggestedTitle;
      }
    }

    const suggestedDescription = result.description?.trim();
    const currentDescription = getValues("description_html");
    // Compare extracted plain text, not raw HTML: the editor re-serializes whatever
    // we feed it (adds its own classes/data-id attributes), so a previously-applied
    // value never matches itself again if compared as raw HTML, making the field
    // look "user-owned" forever after the very first voice pass.
    const currentDescriptionText = getTextContent(currentDescription);
    const descriptionIsAiOwned = !currentDescriptionText || currentDescriptionText === aiOwned.description_html;
    if (suggestedDescription && descriptionIsAiOwned) {
      const descriptionHtml = plainTextToDescriptionHtml(suggestedDescription);
      setValue("description_html", descriptionHtml, { shouldDirty: true, shouldTouch: true });
      editorRef.current?.setEditorValue(descriptionHtml, true);
      aiOwned.description_html = suggestedDescription;
    }

    const currentPriority = getValues("priority");
    const priorityIsAiOwned = !currentPriority || currentPriority === "none" || currentPriority === aiOwned.priority;
    if (result.priority && result.priority !== "none" && priorityIsAiOwned) {
      setValue("priority", result.priority, { shouldDirty: true, shouldTouch: true });
      aiOwned.priority = result.priority;
    }

    const currentTargetDate = getValues("target_date");
    const targetDateIsAiOwned = !currentTargetDate || currentTargetDate === aiOwned.target_date;
    if (result.due_date && targetDateIsAiOwned) {
      setValue("target_date", result.due_date, { shouldDirty: true, shouldTouch: true });
      aiOwned.target_date = result.due_date;
    }

    // Start Date is never driven by voice input - it always defaults to the date the draft was
    // generated (today), and only if the user hasn't already set/touched it themselves.
    const currentStartDate = getValues("start_date");
    const startDateIsAiOwned = !currentStartDate || currentStartDate === aiOwned.start_date;
    if (startDateIsAiOwned) {
      const todayDate = renderFormattedPayloadDate(new Date()) ?? null;
      if (todayDate && todayDate !== currentStartDate) {
        setValue("start_date", todayDate, { shouldDirty: true, shouldTouch: true });
      }
      aiOwned.start_date = todayDate;
    }

    // Assignee auto-selection must be unambiguous: only apply when exactly one workspace member
    // matches the spoken name. Multiple matches, no matches, or low-confidence names are left
    // blank for the user to pick manually - never guess.
    const currentAssigneeIds = getValues("assignee_ids") ?? [];
    const assigneeIdsAreAiOwned =
      currentAssigneeIds.length === 0 || arraysHaveSameItems(currentAssigneeIds, aiOwned.assignee_ids);
    if (result.assignee_name && projectId && assigneeIdsAreAiOwned) {
      const memberIds = getProjectMemberIds(projectId, true) ?? [];
      const matchedId = findUniqueAssigneeMatch(memberIds, (id) => getUserDetails(id)?.display_name, result.assignee_name);
      if (matchedId) {
        setValue("assignee_ids", [matchedId], { shouldDirty: true, shouldTouch: true });
        aiOwned.assignee_ids = [matchedId];
      }
    }

    const currentLabelIds = getValues("label_ids") ?? [];
    const labelIdsAreAiOwned = currentLabelIds.length === 0 || arraysHaveSameItems(currentLabelIds, aiOwned.label_ids);
    if ((result.labels ?? []).length > 0 && projectId && labelIdsAreAiOwned) {
      const projectLabels = getProjectLabels(projectId) ?? [];
      const matchedLabelIds = result.labels
        .map((labelName) => fuzzyFind(projectLabels, (label) => label.name, labelName)?.id)
        .filter((id): id is string => Boolean(id));
      if (matchedLabelIds.length > 0) {
        setValue("label_ids", matchedLabelIds, { shouldDirty: true, shouldTouch: true });
        aiOwned.label_ids = matchedLabelIds;
      }
    }

    const currentStateId = getValues("state_id");
    const stateIsAiOwned = !currentStateId || currentStateId === aiOwned.state_id;
    if (result.status_name && projectId && stateIsAiOwned) {
      const projectStates = getProjectStates(projectId) ?? [];
      const matchedState = fuzzyFind(projectStates, (state) => state.name, result.status_name);
      if (matchedState) {
        setValue("state_id", matchedState.id, { shouldDirty: true, shouldTouch: true });
        aiOwned.state_id = matchedState.id;
      }
    }

    handleFormChange();

    return { titleSuggestion };
  };

  useEffect(() => {
    if (
      voiceTicket.state !== "success" ||
      !voiceTicket.result ||
      voiceTicket.resultVersion === voiceTicket.appliedResultVersion
    )
      return;

    const { titleSuggestion } = applyVoiceTicketResult(voiceTicket.result);
    setVoiceTitleSuggestion(titleSuggestion);
    voiceTicket.markResultApplied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceTicket.state, voiceTicket.resultVersion, voiceTicket.appliedResultVersion]);

  const handleVoiceStart = () => {
    if (voiceTicket.state === "recording" || voiceTicket.state === "processing") return;
    setVoiceTitleSuggestion(null);
    voiceTicket.reset();
    setIsVoiceModalOpen(true);
    void voiceTicket.startRecording();
  };

  const handleVoiceButtonClick = () => {
    if (voiceTicket.state === "recording") {
      voiceTicket.stopRecording();
      return;
    }

    handleVoiceStart();
  };

  const handleVoiceModalClose = () => {
    if (voiceTicket.state === "recording") {
      voiceTicket.cancelRecording();
    }
    setIsVoiceModalOpen(false);
  };

  const handleVoiceRetry = () => {
    if (voiceTicket.state === "processing") return;
    setVoiceTitleSuggestion(null);
    voiceTicket.reset();
    void voiceTicket.startRecording();
  };

  const handleVoiceRegenerate = () => {
    if (voiceTicket.state === "recording" || voiceTicket.state === "processing") return;
    setVoiceTitleSuggestion(null);
    void voiceTicket.generateFromTranscript(voiceTicket.transcript);
  };

  const duplicateModal = shouldRenderDuplicateModal ? (
    <div
      ref={modalContainerRef}
      className="shadow-xl bg-pi-50 relative flex flex-col gap-2.5 rounded-lg px-3 py-4"
      style={{ maxHeight: formRef?.current?.offsetHeight ? `${formRef.current.offsetHeight}px` : "436px" }}
    >
      <DuplicateModalRoot
        workspaceSlug={workspaceSlug.toString()}
        issues={duplicateIssues}
        handleDuplicateIssueModal={handleDuplicateIssueModal}
      />
    </div>
  ) : null;

  if (shouldUseCreateTicketLayout) {
    return (
      <FormProvider {...methods}>
        <div className="flex gap-3 bg-transparent">
          <div className="w-full rounded-lg">
            <form
              ref={formRef}
              onSubmit={handleSubmit((data) => handleFormSubmit(data))}
              className="flyers-soft-ticket-modal flyers-soft-create-ticket-modal flex w-full flex-col"
            >
              <div className="flyers-soft-create-ticket-modal-header">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flyers-soft-create-ticket-icon" aria-hidden="true">
                    <Ticket className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2>Create New Ticket</h2>
                    <p>Add the details of the issue or request.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flyers-soft-create-ticket-close"
                  aria-label="Close"
                  onClick={handleSafeClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flyers-soft-create-ticket-modal-body vertical-scrollbar scrollbar-sm">
                {watch("parent_id") && selectedParentIssue && (
                  <div>
                    <IssueParentTag
                      control={control}
                      selectedParentIssue={selectedParentIssue}
                      handleFormChange={handleFormChange}
                      setSelectedParentIssue={setSelectedParentIssue}
                    />
                  </div>
                )}

                <div className="flyers-soft-create-ticket-title-row">
                  <div className="flyers-soft-ticket-modal-field flyers-soft-ticket-title-field">
                    <span className="flyers-soft-ticket-modal-field-label">
                      Title <span aria-hidden="true">*</span>
                    </span>
                    <div className="flyers-soft-ticket-modal-field-control">
                      <IssueTitleInput
                        control={control}
                        issueTitleRef={issueTitleRef}
                        formState={formState}
                        handleFormChange={handleFormChange}
                        onVoiceClick={handleVoiceButtonClick}
                        voiceState={voiceTicket.state}
                        isVoiceDisabled={isVoiceProcessing}
                      />
                    </div>
                  </div>
                  {projectId && !data?.sourceIssueId && (
                    <div className="flyers-soft-ticket-modal-field flyers-soft-ticket-template-field">
                      <span className="flyers-soft-ticket-modal-field-label">
                        Template <span>(Optional)</span>
                      </span>
                      <div className="flyers-soft-ticket-modal-field-control">
                        <WorkItemTemplateSelect
                          projectId={projectId}
                          typeId={watch("type_id")}
                          handleModalClose={handleTemplateModalClose}
                          handleFormChange={handleFormChange}
                          renderChevron
                        />
                      </div>
                    </div>
                  )}
                </div>

                {voiceTitleSuggestion && (
                  <div className="flyers-soft-voice-title-suggestion flex items-center gap-2 rounded-md bg-layer-1 px-3 py-2 text-13">
                    <Sparkles className="size-3.5 shrink-0 text-success-primary" />
                    <span className="text-secondary">
                      AI suggested title: <span className="font-medium text-primary">{voiceTitleSuggestion}</span>
                    </span>
                  </div>
                )}

                <VoiceTicketModal
                  isOpen={isVoiceModalOpen}
                  state={voiceTicket.state}
                  elapsedSeconds={voiceTicket.elapsedSeconds}
                  transcript={voiceTicket.transcript}
                  result={voiceTicket.result}
                  error={voiceTicket.error}
                  onClose={handleVoiceModalClose}
                  onStop={voiceTicket.stopRecording}
                  onRetry={handleVoiceRetry}
                  onRegenerate={handleVoiceRegenerate}
                  onTranscriptChange={voiceTicket.setTranscript}
                />

                {duplicateIssues.length > 0 && (
                  <div className="flyers-soft-create-ticket-duplicates">
                    <DeDupeButtonRoot
                      workspaceSlug={workspaceSlug?.toString()}
                      isDuplicateModalOpen={isDuplicateModalOpen}
                      label={
                        duplicateIssues.length === 1
                          ? `${duplicateIssues.length} ${t("duplicate_issue_found")}`
                          : `${duplicateIssues.length} ${t("duplicate_issues_found")}`
                      }
                      handleOnClick={() => handleDuplicateIssueModal(!isDuplicateModalOpen)}
                    />
                  </div>
                )}

                <div className="flyers-soft-create-ticket-description-block">
                  <span className="flyers-soft-ticket-modal-field-label">Description</span>
                  <IssueDescriptionEditor
                    control={control}
                    isDraft={isDraft}
                    issueName={watch("name")}
                    issueId={data?.id}
                    descriptionHtmlData={data?.description_html}
                    editorRef={editorRef}
                    submitBtnRef={submitBtnRef}
                    gptAssistantModal={gptAssistantModal}
                    workspaceSlug={workspaceSlug?.toString()}
                    projectId={projectId}
                    handleFormChange={handleFormChange}
                    handleDescriptionHTMLDataChange={(description_html) =>
                      setValue<"description_html">("description_html", description_html)
                    }
                    setGptAssistantModal={setGptAssistantModal}
                    handleGptAssistantClose={() => reset(getValues())}
                    onAssetUpload={onAssetUpload}
                    onClose={onClose}
                  />
                </div>

                <div className="flyers-soft-create-ticket-fields-grid">
                  <div className="flyers-soft-ticket-modal-field flyers-soft-ticket-field-project">
                    <span className="flyers-soft-ticket-modal-field-label">Project</span>
                    <div className="flyers-soft-ticket-modal-field-control">
                      <IssueProjectSelect
                        control={control}
                        buttonClassName="flyers-soft-field-button"
                        buttonContainerClassName="flyers-soft-field-trigger"
                        disabled={!!data?.sourceIssueId || isProjectSelectionDisabled}
                        dropdownArrow
                        dropdownArrowClassName="flyers-soft-field-caret"
                        emptyIcon={<Users className="flyers-soft-field-icon flyers-soft-field-icon-project" />}
                        handleFormChange={handleFormChange}
                        placeholder="Select project"
                      />
                    </div>
                  </div>
                  {projectId && (
                    <div className="flyers-soft-ticket-modal-field flyers-soft-ticket-field-type">
                      <span className="flyers-soft-ticket-modal-field-label">Type</span>
                      <div className="flyers-soft-ticket-modal-field-control">
                        <IssueTypeSelect
                          control={control}
                          projectId={projectId}
                          editorRef={editorRef}
                          disabled={!!data?.sourceIssueId}
                          handleFormChange={handleFormChange}
                          renderChevron
                        />
                      </div>
                    </div>
                  )}
                  <IssueDefaultProperties
                    control={control}
                    id={data?.id}
                    projectId={projectId}
                    workspaceSlug={workspaceSlug?.toString()}
                    selectedParentIssue={selectedParentIssue}
                    startDate={watch("start_date")}
                    targetDate={watch("target_date")}
                    parentId={watch("parent_id")}
                    isDraft={isDraft}
                    handleFormChange={handleFormChange}
                    setSelectedParentIssue={setSelectedParentIssue}
                    layout="grid"
                  />
                </div>

                <WorkItemModalAdditionalProperties
                  isDraft={isDraft}
                  workItemId={data?.id ?? data?.sourceIssueId}
                  projectId={projectId}
                  workspaceSlug={workspaceSlug?.toString()}
                />
              </div>

              {showActionButtons && (
                <div className="flyers-soft-create-ticket-modal-footer" tabIndex={getIndex("create_more")}>
                  <div>
                    <label className="flyers-soft-create-ticket-checkbox">
                      <input
                        type="checkbox"
                        checked={isCreateMoreToggleEnabled}
                        onChange={(e) => onCreateMoreToggleChange(e.target.checked)}
                      />
                      <span>Create another ticket</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div tabIndex={getIndex("discard_button")}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flyers-soft-create-ticket-cancel"
                        onClick={handleSafeClose}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div tabIndex={getIndex("draft_button")}>
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        ref={submitBtnRef}
                        loading={isSubmitting}
                        disabled={isDisabled}
                        className="flyers-soft-create-ticket-submit"
                      >
                        {isSubmitting ? primaryButtonText.loading : "Create Ticket"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
          {duplicateModal}
        </div>
      </FormProvider>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="flex gap-2 bg-transparent">
        <div className="w-full rounded-lg">
          <form
            ref={formRef}
            onSubmit={handleSubmit((data) => handleFormSubmit(data))}
            className="flyers-soft-ticket-modal flex w-full flex-col"
          >
            {/*
              ── Header: icon + title + close, matching the Create Ticket branch's
              flyers-soft-create-ticket-modal-header. The type select (and the
              create-only template select) that used to live in a bare, floating
              flyers-soft-ticket-modal-context bar now sit inside this header row,
              properly aligned next to the close button. Project itself moved out
              of this header entirely and into the properties grid below as a real
              labeled field, next to Priority/Assignee/etc.
            ── */}
            <div className="flyers-soft-create-ticket-modal-header">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flyers-soft-create-ticket-icon" aria-hidden="true">
                  <Ticket className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2>{moveToIssue ? "Move to project" : modalTitle}</h2>
                  <p>
                    {moveToIssue
                      ? "Review the details before moving this draft into the project."
                      : data?.id
                        ? "Update the details of this work item."
                        : "Add the details of the issue or request."}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <div className="flyers-soft-ticket-modal-context !min-h-0 flex items-center gap-x-1 !bg-transparent">
                  {projectId && (
                    <IssueTypeSelect
                      control={control}
                      projectId={projectId}
                      editorRef={editorRef}
                      disabled={!!data?.sourceIssueId}
                      handleFormChange={handleFormChange}
                      renderChevron
                    />
                  )}
                  {projectId && !data?.id && !data?.sourceIssueId && (
                    <WorkItemTemplateSelect
                      projectId={projectId}
                      typeId={watch("type_id")}
                      handleModalClose={() => {
                        if (handleDraftAndClose) {
                          handleDraftAndClose();
                        } else {
                          onClose();
                        }
                      }}
                      handleFormChange={handleFormChange}
                      renderChevron
                    />
                  )}
                </div>
                {duplicateIssues.length > 0 && (
                  <DeDupeButtonRoot
                    workspaceSlug={workspaceSlug?.toString()}
                    isDuplicateModalOpen={isDuplicateModalOpen}
                    label={
                      duplicateIssues.length === 1
                        ? `${duplicateIssues.length} ${t("duplicate_issue_found")}`
                        : `${duplicateIssues.length} ${t("duplicate_issues_found")}`
                    }
                    handleOnClick={() => handleDuplicateIssueModal(!isDuplicateModalOpen)}
                  />
                )}
                <button
                  type="button"
                  className="flyers-soft-create-ticket-close"
                  aria-label="Close"
                  onClick={handleSafeClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Parent tag (conditional) ── */}
            {watch("parent_id") && selectedParentIssue && (
              <div className="px-5 pt-2">
                <IssueParentTag
                  control={control}
                  selectedParentIssue={selectedParentIssue}
                  handleFormChange={handleFormChange}
                  setSelectedParentIssue={setSelectedParentIssue}
                />
              </div>
            )}

            {/*
              flyers-soft-create-ticket-modal here is scoping only: it makes the field-control
              pill/dropdown styling below match Create Ticket. The modal-shell box styles that
              class also carries (border/shadow/max-height) are neutralized by the
              ".flyers-soft-ticket-modal .flyers-soft-create-ticket-modal" override in
              flyers-soft-theme.css, so the existing context bar / footer chrome is untouched.
            */}
            <div className="flyers-soft-create-ticket-modal">
              {/* ── Title input ── */}
              <div className="flyers-soft-ticket-modal-title px-5 pt-4 pb-1">
                <div className="flyers-soft-ticket-modal-field flyers-soft-ticket-title-field">
                  <span className="flyers-soft-ticket-modal-field-label">
                    Title <span aria-hidden="true">*</span>
                  </span>
                  <div className="flyers-soft-ticket-modal-field-control">
                    <IssueTitleInput
                      control={control}
                      issueTitleRef={issueTitleRef}
                      formState={formState}
                      handleFormChange={handleFormChange}
                    />
                  </div>
                </div>
              </div>

              {/* ── Description + additional properties ── */}
              <div
                className={cn(
                  "flyers-soft-ticket-modal-desc px-5 pb-3",
                  activeAdditionalPropertiesLength > 4 &&
                    "vertical-scrollbar scrollbar-sm max-h-[30vh] overflow-hidden overflow-y-auto"
                )}
              >
                <div className="flyers-soft-create-ticket-description-block">
                  <span className="flyers-soft-ticket-modal-field-label">Description</span>
                  <IssueDescriptionEditor
                    control={control}
                    isDraft={isDraft}
                    issueName={watch("name")}
                    issueId={data?.id}
                    descriptionHtmlData={data?.description_html}
                    editorRef={editorRef}
                    submitBtnRef={submitBtnRef}
                    gptAssistantModal={gptAssistantModal}
                    workspaceSlug={workspaceSlug?.toString()}
                    projectId={projectId}
                    handleFormChange={handleFormChange}
                    handleDescriptionHTMLDataChange={(description_html) =>
                      setValue<"description_html">("description_html", description_html)
                    }
                    setGptAssistantModal={setGptAssistantModal}
                    handleGptAssistantClose={() => reset(getValues())}
                    onAssetUpload={onAssetUpload}
                    onClose={onClose}
                  />
                </div>
                <WorkItemModalAdditionalProperties
                  isDraft={isDraft}
                  workItemId={data?.id ?? data?.sourceIssueId}
                  projectId={projectId}
                  workspaceSlug={workspaceSlug?.toString()}
                />
              </div>

              {/* ── Properties grid: Project | Status | Priority | Assignee | Labels | Due date | Start date etc. ── */}
              <div className="flyers-soft-create-ticket-fields-grid border-t border-subtle px-5 py-4">
                <div className="flyers-soft-ticket-modal-field flyers-soft-ticket-field-project">
                  <span className="flyers-soft-ticket-modal-field-label">Project</span>
                  <div className="flyers-soft-ticket-modal-field-control">
                    <IssueProjectSelect
                      control={control}
                      buttonClassName="flyers-soft-field-button"
                      buttonContainerClassName="flyers-soft-field-trigger"
                      disabled={!!data?.id || !!data?.sourceIssueId || isProjectSelectionDisabled}
                      dropdownArrow
                      dropdownArrowClassName="flyers-soft-field-caret"
                      emptyIcon={<Users className="flyers-soft-field-icon flyers-soft-field-icon-project" />}
                      handleFormChange={handleFormChange}
                      placeholder="Select project"
                    />
                  </div>
                </div>
                <IssueDefaultProperties
                  control={control}
                  id={data?.id}
                  projectId={projectId}
                  workspaceSlug={workspaceSlug?.toString()}
                  selectedParentIssue={selectedParentIssue}
                  startDate={watch("start_date")}
                  targetDate={watch("target_date")}
                  parentId={watch("parent_id")}
                  isDraft={isDraft}
                  handleFormChange={handleFormChange}
                  setSelectedParentIssue={setSelectedParentIssue}
                  layout="grid"
                />
              </div>
            </div>

            {/* ── Footer: create-more toggle + Cancel + Save ── */}
            {showActionButtons && (
              <div
                className="flyers-soft-ticket-modal-footer flex items-center justify-between border-t border-subtle px-5 py-3"
                tabIndex={getIndex("create_more")}
              >
                <div>
                  {!data?.id && (
                    <div
                      className="inline-flex cursor-pointer items-center gap-1.5"
                      onClick={() => onCreateMoreToggleChange(!isCreateMoreToggleEnabled)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onCreateMoreToggleChange(!isCreateMoreToggleEnabled);
                      }}
                      role="button"
                    >
                      <ToggleSwitch value={isCreateMoreToggleEnabled} onChange={() => {}} size="sm" />
                      <span className="text-caption-sm-regular">{t("create_more")}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div tabIndex={getIndex("discard_button")}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (editorRef.current?.isEditorReadyToDiscard()) {
                          onClose();
                        } else {
                          setToast({
                            type: TOAST_TYPE.ERROR,
                            title: "Error!",
                            message: "Editor is still processing changes. Please wait before proceeding.",
                          });
                        }
                      }}
                    >
                      {t("discard")}
                    </Button>
                  </div>
                  <div tabIndex={isDraft ? getIndex("submit_button") : getIndex("draft_button")}>
                    <Button
                      variant={moveToIssue ? "secondary" : "primary"}
                      size="sm"
                      type="submit"
                      ref={submitBtnRef}
                      loading={isSubmitting}
                      disabled={isDisabled}
                    >
                      {isSubmitting ? primaryButtonText.loading : primaryButtonText.default}
                    </Button>
                  </div>
                  {moveToIssue && (
                    <Button
                      variant="primary"
                      type="button"
                      loading={isMoving}
                      onClick={handleMoveToProjects}
                      disabled={isMoving}
                      size="sm"
                    >
                      {t("add_to_project")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
        {shouldRenderDuplicateModal && (
          <div
            ref={modalContainerRef}
            className="shadow-xl bg-pi-50 relative flex flex-col gap-2.5 rounded-lg px-3 py-4"
            style={{ maxHeight: formRef?.current?.offsetHeight ? `${formRef.current.offsetHeight}px` : "436px" }}
          >
            <DuplicateModalRoot
              workspaceSlug={workspaceSlug.toString()}
              issues={duplicateIssues}
              handleDuplicateIssueModal={handleDuplicateIssueModal}
            />
          </div>
        )}
      </div>
    </FormProvider>
  );
});
